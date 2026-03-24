const axios = require('axios');

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

class WhatsAppBot {
  constructor(prisma) {
    this.prisma = prisma;
    this.conversations = {};
    this.workspaceId = BigInt(1);
  }

  async processMessage(fromNumber, mediaType, mediaUrl, messageText, mediaCaption) {
    console.log(`📨 Message from ${fromNumber} - Type: ${mediaType}`);

    if (!this.conversations[fromNumber]) {
      this.conversations[fromNumber] = {
        phoneNumber: fromNumber,
        messages: [],
        invoices: [],
        lastAction: null,
        language: 'fr'
      };
    }

    const conversation = this.conversations[fromNumber];
    let response = '';

    try {
      if (mediaType === 'image') {
        response = await this.handleInvoicePhoto(fromNumber, mediaUrl, mediaCaption);
      } else if (mediaType === 'audio') {
        response = await this.handleAudioMessage(fromNumber, mediaUrl);
      } else if (mediaType === 'text') {
        response = await this.handleTextCommand(fromNumber, messageText);
      }

      conversation.messages.push({
        timestamp: new Date().toISOString(),
        type: mediaType,
        content: messageText || mediaCaption || '[Media]',
        response: response
      });

      // Log communication to database
      await this.logCommunication(fromNumber, mediaType, messageText || mediaCaption, response);

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      return this.translate(fromNumber, 'error_processing');
    }
  }

  async handleInvoicePhoto(fromNumber, mediaUrl, caption) {
    try {
      console.log(`🔍 Analyzing invoice photo from ${fromNumber}`);

      const imageData = await this.downloadMedia(mediaUrl);
      const base64Image = imageData.toString('base64');
      const parseResult = await this.parseInvoiceWithClaude(base64Image);

      if (!parseResult.success) {
        return this.translate(fromNumber, 'could_not_parse');
      }

      const { vendor, amount, dueDate, description } = parseResult;

      // Find or create customer
      let customer = await this.prisma.customer.findFirst({
        where: {
          primary_phone: fromNumber,
          workspace_id: this.workspaceId
        }
      });

      if (!customer) {
        customer = await this.prisma.customer.create({
          data: {
            workspace_id: this.workspaceId,
            name: vendor || 'Unknown',
            primary_phone: fromNumber,
            whatsapp_number: fromNumber,
            whatsapp_verified: true,
            business_type: 'contractor',
            is_active: true
          }
        });
      }

      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const parsedAmount = parseFloat(amount) || 0;
      const taxAmount = parsedAmount * 0.20;

      const created = await this.prisma.invoice.create({
        data: {
          workspace_id: this.workspaceId,
          invoice_number: invoiceNumber,
          customer_id: customer.id,
          issue_date: new Date(),
          due_date: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: parsedAmount,
          tax_rate: 20.0,
          tax_amount: taxAmount,
          total: parsedAmount + taxAmount,
          status: 'pending',
          payment_status: 'unpaid',
          currency: 'MAD',
          is_draft: false,
          customer_notes: description || caption || null
        }
      });

      this.conversations[fromNumber].invoices.push(created.id.toString());

      return `✅ *Facture créée*

📋 Client: *${vendor || 'Non spécifié'}*
💰 Montant: *${parsedAmount.toLocaleString('fr-FR')} MAD*
📊 Total TTC: *${(parsedAmount + taxAmount).toLocaleString('fr-FR')} MAD*
📅 Échéance: *${this.formatDate(created.due_date)}*
🆔 Réf: \`${invoiceNumber}\`

👉 Tapez "paiement ${invoiceNumber}" pour demander le paiement`;
    } catch (error) {
      console.error('Error handling invoice photo:', error);
      return this.translate(fromNumber, 'error_parsing_invoice');
    }
  }

  async handleAudioMessage(fromNumber, mediaUrl) {
    try {
      console.log(`🎙️ Transcribing audio from ${fromNumber}`);
      const audioData = await this.downloadMedia(mediaUrl);
      const transcript = await this.transcribeWithDeepgram(audioData);

      if (!transcript) {
        return this.translate(fromNumber, 'could_not_transcribe');
      }

      return await this.handleTextCommand(fromNumber, transcript);
    } catch (error) {
      console.error('Error handling audio:', error);
      return this.translate(fromNumber, 'error_processing_audio');
    }
  }

  async handleTextCommand(fromNumber, text) {
    try {
      const conversation = this.conversations[fromNumber];
      if (!conversation) return this.getHelp(fromNumber);

      const detectedLanguage = this.detectLanguage(text);
      conversation.language = detectedLanguage;

      console.log(`💬 Text from ${fromNumber}: "${text}"`);

      const intent = await this.detectIntent(text, detectedLanguage);

      switch (intent.action) {
        case 'STATUS':
          return await this.getInvoiceStatus(fromNumber);
        case 'REQUEST_PAYMENT':
          return await this.requestPayment(fromNumber, intent.invoiceId);
        case 'LIST_INVOICES':
          return await this.listInvoices(fromNumber);
        case 'REMIND':
          return await this.sendReminders(fromNumber);
        case 'HELP':
          return this.getHelp(fromNumber);
        default:
          return await this.askClaude(fromNumber, text);
      }
    } catch (error) {
      console.error('Error handling text command:', error);
      return this.translate(fromNumber, 'error_processing');
    }
  }

  async parseInvoiceWithClaude(base64Image) {
    try {
      // Step 1: Describe the invoice
      const descResponse = await axios.post(CLAUDE_API_URL, {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64Image }
            },
            {
              type: 'text',
              text: `Read this invoice/receipt and tell me:
1. Company/vendor name
2. Total amount (look for "Total", "Montant", "Total TTC")
3. Date (look for "Date", "Échéance")
4. What is being invoiced (brief description)
Answer in simple text, one item per line.`
            }
          ]
        }]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });

      const descContent = descResponse.data.content.find(c => c.type === 'text');
      if (!descContent) return { success: false };

      // Step 2: Extract structured JSON
      const extractResponse = await axios.post(CLAUDE_API_URL, {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Based on this invoice information:
${descContent.text}

Extract and return ONLY this JSON (no other text):
{"vendor":"company name","amount":"total number only","dueDate":"YYYY-MM-DD","description":"brief description"}

Rules: Use null for missing fields. Convert DD/MM/YYYY to YYYY-MM-DD. Amount should be numeric only.`
        }]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });

      const extractContent = extractResponse.data.content.find(c => c.type === 'text');
      if (!extractContent) return { success: false };

      const jsonMatch = extractContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { success: false };

      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, ...parsed };
    } catch (error) {
      console.error('Error parsing invoice with Claude:', error.message);
      return { success: false };
    }
  }

  async transcribeWithDeepgram(audioBuffer) {
    try {
      const response = await axios.post(DEEPGRAM_API_URL, audioBuffer, {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/wav'
        },
        params: { model: 'nova-2', language: 'auto', smart_format: true }
      });
      return response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || null;
    } catch (error) {
      console.error('Deepgram error:', error.message);
      return null;
    }
  }

  async detectIntent(text, language) {
    try {
      const response = await axios.post(CLAUDE_API_URL, {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Classify this message intent. Respond ONLY with JSON:
{"action":"STATUS|REQUEST_PAYMENT|LIST_INVOICES|REMIND|HELP|OTHER","invoiceId":"invoice ref if mentioned","confidence":0.0}

Message (${language}): "${text}"`
        }]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });

      const textContent = response.data.content.find(c => c.type === 'text');
      const jsonMatch = textContent?.text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { action: 'OTHER', confidence: 0.5 };
    } catch (error) {
      console.error('Intent detection error:', error.message);
      return { action: 'OTHER', confidence: 0.3 };
    }
  }

  async getInvoiceStatus(fromNumber) {
    const customer = await this.prisma.customer.findFirst({
      where: { primary_phone: fromNumber, workspace_id: this.workspaceId }
    });

    if (!customer) return this.translate(fromNumber, 'no_invoices');

    const invoices = await this.prisma.invoice.findMany({
      where: { customer_id: customer.id, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    if (invoices.length === 0) return this.translate(fromNumber, 'no_invoices');

    let status = '📊 *Vos factures*\n\n';
    let pending = 0, paid = 0, overdue = 0;

    for (const inv of invoices) {
      const daysOld = Math.floor((Date.now() - new Date(inv.due_date)) / (86400000));
      const emoji = inv.payment_status === 'paid' ? '✅' : daysOld > 0 ? '⚠️' : '⏳';

      status += `${emoji} ${inv.invoice_number}\n`;
      status += `   ${Number(inv.total).toLocaleString('fr-FR')} MAD | ${this.formatDate(inv.due_date)}\n\n`;

      if (inv.payment_status === 'paid') paid++;
      else if (daysOld > 0) overdue++;
      else pending++;
    }

    status += `📈 *Résumé*: ⏳ ${pending} | ✅ ${paid} | ⚠️ ${overdue}`;
    return status;
  }

  async requestPayment(fromNumber, invoiceRef) {
    const customer = await this.prisma.customer.findFirst({
      where: { primary_phone: fromNumber, workspace_id: this.workspaceId }
    });

    if (!customer) return this.translate(fromNumber, 'invoice_not_found');

    // Search by invoice number or ID
    let invoice;
    if (invoiceRef) {
      invoice = await this.prisma.invoice.findFirst({
        where: {
          customer_id: customer.id,
          OR: [
            { invoice_number: { contains: invoiceRef } },
            ...(invoiceRef.match(/^\d+$/) ? [{ id: BigInt(invoiceRef) }] : [])
          ]
        }
      });
    } else {
      // Get most recent unpaid invoice
      invoice = await this.prisma.invoice.findFirst({
        where: { customer_id: customer.id, payment_status: 'unpaid' },
        orderBy: { created_at: 'desc' }
      });
    }

    if (!invoice) return this.translate(fromNumber, 'invoice_not_found');

    return `💳 *Demande de paiement*

📋 Facture: \`${invoice.invoice_number}\`
💰 Montant: *${Number(invoice.total).toLocaleString('fr-FR')} MAD*
📅 Échéance: *${this.formatDate(invoice.due_date)}*

Choisissez la méthode:
1️⃣ ⚡ Virement Instantané (20 sec)
2️⃣ 📱 Orange Money (mobile)
3️⃣ 🏦 Virement Bancaire (2-3 jours)

Répondez avec votre choix (1, 2 ou 3)`;
  }

  async listInvoices(fromNumber) {
    const customer = await this.prisma.customer.findFirst({
      where: { primary_phone: fromNumber, workspace_id: this.workspaceId }
    });

    if (!customer) return this.translate(fromNumber, 'no_invoices');

    const invoices = await this.prisma.invoice.findMany({
      where: { customer_id: customer.id, deleted_at: null },
      orderBy: { created_at: 'desc' },
      take: 20
    });

    if (invoices.length === 0) return this.translate(fromNumber, 'no_invoices');

    let list = '📋 *Toutes vos factures*\n\n';
    let totalUnpaid = 0;

    for (const inv of invoices) {
      const emoji = inv.payment_status === 'paid' ? '✅' : '⏳';
      list += `${emoji} ${inv.invoice_number} - ${Number(inv.total).toLocaleString('fr-FR')} MAD\n`;
      if (inv.payment_status !== 'paid') totalUnpaid += Number(inv.total);
    }

    list += `\n💰 *Total impayé:* ${totalUnpaid.toLocaleString('fr-FR')} MAD`;
    return list;
  }

  async sendReminders(fromNumber) {
    const customer = await this.prisma.customer.findFirst({
      where: { primary_phone: fromNumber, workspace_id: this.workspaceId }
    });

    if (!customer) return this.translate(fromNumber, 'no_reminders');

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        customer_id: customer.id,
        payment_status: { not: 'paid' },
        due_date: { lt: new Date() },
        deleted_at: null
      },
      orderBy: { due_date: 'asc' }
    });

    if (overdueInvoices.length === 0) return this.translate(fromNumber, 'no_reminders');

    let msg = '⏰ *Factures en retard*\n\n';
    let totalOverdue = 0;

    for (const inv of overdueInvoices) {
      const daysOld = Math.floor((Date.now() - new Date(inv.due_date)) / 86400000);
      msg += `⚠️ ${inv.invoice_number} - ${Number(inv.total).toLocaleString('fr-FR')} MAD (${daysOld}j en retard)\n`;
      totalOverdue += Number(inv.total);
    }

    msg += `\n🔴 *Total en retard:* ${totalOverdue.toLocaleString('fr-FR')} MAD`;
    return msg;
  }

  getHelp(fromNumber) {
    return `🤖 *Morocco Invoice CRM - Aide*

📸 *Photo* → L'IA analyse la facture automatiquement
💬 *Texte* → Posez n'importe quelle question
🎙️ *Audio* → Envoyez un message vocal

*Commandes:*
📊 "Statut" → Voir vos factures
💳 "Paiement" → Demander un paiement
📋 "Liste" → Toutes les factures
⏰ "Rappel" → Factures en retard
❓ "Aide" → Ce message

🌍 Français | العربية | English | Español`;
  }

  async askClaude(fromNumber, question) {
    try {
      const response = await axios.post(CLAUDE_API_URL, {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: `You are a WhatsApp assistant for a Moroccan construction invoice CRM.
User asked: "${question}"
Respond in the same language. Keep it short and WhatsApp-friendly (max 3 paragraphs).
If they seem confused, suggest typing "Aide" for help.`
        }]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });
      return response.data.content[0].text;
    } catch (error) {
      console.error('Claude error:', error.message);
      return '❌ Je n\'ai pas compris. Tapez "Aide" pour les commandes.';
    }
  }

  async logCommunication(fromNumber, messageType, inboundContent, outboundContent) {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: { primary_phone: fromNumber, workspace_id: this.workspaceId }
      });

      if (!customer) return;

      // Log inbound
      await this.prisma.communication.create({
        data: {
          workspace_id: this.workspaceId,
          customer_id: customer.id,
          platform: 'whatsapp',
          direction: 'inbound',
          message_type: messageType,
          message_content: inboundContent || '[Media]',
          status: 'delivered'
        }
      });

      // Log outbound
      if (outboundContent) {
        await this.prisma.communication.create({
          data: {
            workspace_id: this.workspaceId,
            customer_id: customer.id,
            platform: 'whatsapp',
            direction: 'outbound',
            message_type: 'bot_response',
            message_content: outboundContent,
            status: 'sent'
          }
        });
      }
    } catch (error) {
      console.error('Communication log error:', error.message);
    }
  }

  detectLanguage(text) {
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/\b(el|la|que|para|con)\b/i.test(text)) return 'es';
    if (/\bthe\b|\bwhich\b|\bfor\b|\bhow\b/i.test(text)) return 'en';
    return 'fr';
  }

  translate(fromNumber, key) {
    const lang = this.conversations[fromNumber]?.language || 'fr';
    const t = {
      error_processing: { fr: '❌ Erreur. Réessayez.', ar: '❌ خطأ. حاول مرة أخرى.', en: '❌ Error. Try again.' },
      could_not_parse: { fr: '❌ Impossible de lire la facture. Essayez une meilleure photo.', ar: '❌ لم أتمكن من قراءة الفاتورة.', en: '❌ Could not read the invoice.' },
      no_invoices: { fr: '📭 Aucune facture trouvée.', ar: '📭 لا توجد فواتير.', en: '📭 No invoices found.' },
      invoice_not_found: { fr: '❌ Facture introuvable.', ar: '❌ الفاتورة غير موجودة.', en: '❌ Invoice not found.' },
      no_reminders: { fr: '✅ Pas de rappels nécessaires!', ar: '✅ لا تذكيرات مطلوبة!', en: '✅ No reminders needed!' },
      could_not_transcribe: { fr: '❌ Audio non compris.', ar: '❌ لم أفهم الصوت.', en: '❌ Could not understand audio.' },
      error_parsing_invoice: { fr: '❌ Erreur lecture facture.', ar: '❌ خطأ في قراءة الفاتورة.', en: '❌ Error reading invoice.' },
      error_processing_audio: { fr: '❌ Erreur traitement audio.', ar: '❌ خطأ في معالجة الصوت.', en: '❌ Error processing audio.' }
    };
    return t[key]?.[lang] || t[key]?.fr || 'Erreur';
  }

  async downloadMedia(mediaUrl) {
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const response = await axios.get(mediaUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}

module.exports = WhatsAppBot;
