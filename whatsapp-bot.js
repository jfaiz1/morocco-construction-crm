const axios = require('axios');
const FormData = require('form-data');
const https = require('https');

// Deepgram API for audio transcription
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_API_URL = 'https://api.deepgram.com/v1/listen';

// Claude API
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

class WhatsAppBot {
  constructor(db) {
    this.db = db;
    this.conversations = {}; // Track conversation state per phone number
  }

  /**
   * Process incoming WhatsApp message
   */
  async processMessage(fromNumber, mediaType, mediaUrl, messageText, mediaCaption) {
    console.log(`📨 Message from ${fromNumber} - Type: ${mediaType}`);

    // Load or create conversation
    if (!this.conversations[fromNumber]) {
      this.conversations[fromNumber] = {
        phoneNumber: fromNumber,
        messages: [],
        invoices: [],
        lastAction: null,
        language: 'fr' // Default to French, will detect
      };
    }

    const conversation = this.conversations[fromNumber];
    let response = '';

    try {
      if (mediaType === 'image') {
        // 📸 Handle invoice photo
        response = await this.handleInvoicePhoto(fromNumber, mediaUrl, mediaCaption);
      } else if (mediaType === 'audio') {
        // 🎙️ Handle audio message
        response = await this.handleAudioMessage(fromNumber, mediaUrl);
      } else if (mediaType === 'text') {
        // 💬 Handle text command
        response = await this.handleTextCommand(fromNumber, messageText);
      }

      // Store message in conversation
      conversation.messages.push({
        timestamp: new Date().toISOString(),
        type: mediaType,
        content: messageText || mediaCaption || '[Media]',
        response: response
      });

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      return this.translate(fromNumber, 'error_processing');
    }
  }

  /**
   * Handle invoice photo with Claude Vision
   */
  async handleInvoicePhoto(fromNumber, mediaUrl, caption) {
    try {
      console.log(`🔍 Analyzing invoice photo from ${fromNumber}`);

      // Download image
      const imageData = await this.downloadMedia(mediaUrl);
      const base64Image = imageData.toString('base64');

      // Call Claude Vision to parse invoice
      const parseResult = await this.parseInvoiceWithClaude(base64Image);

      if (!parseResult.success) {
        return this.translate(fromNumber, 'could_not_parse');
      }

      const { vendor, amount, dueDate, description } = parseResult;

      // Create invoice in database
      const invoice = {
        phoneNumber: fromNumber,
        vendor,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate).toISOString(),
        description: description || caption,
        status: 'pending'
      };

      const created = await this.db.invoices.create(invoice);

      const conversation = this.conversations[fromNumber];
      conversation.invoices.push(created.id);

      // Send confirmation
      const confirmMsg = `✅ *Facture créée*

📋 Client: *${vendor}*
💰 Montant: *${amount} MAD*
📅 Échéance: *${this.formatDate(dueDate)}*
🆔 ID: \`${invoice.id}\`

👉 Répondez "Paiement ${invoice.id}" pour demander le paiement`;

      return confirmMsg;
    } catch (error) {
      console.error('Error handling invoice photo:', error);
      return this.translate(fromNumber, 'error_parsing_invoice');
    }
  }

  /**
   * Handle audio message - transcribe with Deepgram
   */
  async handleAudioMessage(fromNumber, mediaUrl) {
    try {
      console.log(`🎙️ Transcribing audio from ${fromNumber}`);

      // Download audio file
      const audioData = await this.downloadMedia(mediaUrl);

      // Transcribe with Deepgram
      const transcript = await this.transcribeWithDeepgram(audioData);

      if (!transcript) {
        return this.translate(fromNumber, 'could_not_transcribe');
      }

      // Process transcribed text as command
      return await this.handleTextCommand(fromNumber, transcript);
    } catch (error) {
      console.error('Error handling audio:', error);
      return this.translate(fromNumber, 'error_processing_audio');
    }
  }

  /**
   * Handle text commands - natural language processing
   */
  async handleTextCommand(fromNumber, text) {
    try {
      const conversation = this.conversations[fromNumber];
      const detectedLanguage = this.detectLanguage(text);
      conversation.language = detectedLanguage;

      console.log(`💬 Text command from ${fromNumber}: "${text}"`);

      // Use Claude to understand intent
      const intent = await this.detectIntent(text, detectedLanguage);

      switch (intent.action) {
        case 'STATUS':
          return this.getInvoiceStatus(fromNumber);

        case 'REQUEST_PAYMENT':
          return await this.requestPayment(fromNumber, intent.invoiceId);

        case 'LIST_INVOICES':
          return this.listInvoices(fromNumber);

        case 'REMIND':
          return this.sendReminders(fromNumber);

        case 'HELP':
          return this.getHelp(fromNumber);

        default:
          // Try to understand with Claude
          return await this.askClaude(fromNumber, text);
      }
    } catch (error) {
      console.error('Error handling text command:', error);
      return this.translate(fromNumber, 'error_processing');
    }
  }

  /**
   * Parse invoice photo with Claude Vision API
   */
  async parseInvoiceWithClaude(base64Image) {
    try {
      const response = await axios.post(CLAUDE_API_URL, {
        model: 'claude-opus-4-1',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: `Analyze this invoice image and extract the following information in JSON format:
{
  "vendor": "Client/Company name",
  "amount": "Total amount (numeric only)",
  "dueDate": "Due date (YYYY-MM-DD format)",
  "description": "Brief description of work/items"
}

If any field is missing, use null. Be strict JSON format.`
              }
            ]
          }
        ]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });

      const textContent = response.data.content.find(c => c.type === 'text');
      if (!textContent) return { success: false };

      // Extract JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { success: false };

      const parsed = JSON.parse(jsonMatch[0]);
      return { success: true, ...parsed };
    } catch (error) {
      console.error('Error parsing invoice with Claude:', error);
      return { success: false };
    }
  }

  /**
   * Transcribe audio with Deepgram API
   */
  async transcribeWithDeepgram(audioBuffer) {
    try {
      const response = await axios.post(DEEPGRAM_API_URL, audioBuffer, {
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/wav'
        },
        params: {
          model: 'nova-2',
          language: 'auto',
          smart_format: true
        }
      });

      const transcript = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      return transcript || null;
    } catch (error) {
      console.error('Error transcribing with Deepgram:', error);
      return null;
    }
  }

  /**
   * Detect intent from text with Claude
   */
  async detectIntent(text, language) {
    try {
      const response = await axios.post(CLAUDE_API_URL, {
        model: 'claude-opus-4-1',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Analyze this message and detect the user's intent. Respond in JSON format:
{
  "action": "STATUS|REQUEST_PAYMENT|LIST_INVOICES|REMIND|HELP|OTHER",
  "invoiceId": "if requesting payment, the invoice ID",
  "confidence": 0.0-1.0
}

Message (${language}): "${text}"

Respond only with JSON.`
          }
        ]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });

      const textContent = response.data.content.find(c => c.type === 'text');
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { action: 'OTHER', confidence: 0.5 };
    } catch (error) {
      console.error('Error detecting intent:', error);
      return { action: 'OTHER', confidence: 0.3 };
    }
  }

  /**
   * Get invoice status for contractor
   */
  getInvoiceStatus(fromNumber) {
    const conversation = this.conversations[fromNumber];
    const contractorInvoices = this.db.invoices.filter(i => i.phoneNumber === fromNumber);

    if (contractorInvoices.length === 0) {
      return this.translate(fromNumber, 'no_invoices');
    }

    let status = '📊 *Vos factures*\n\n';
    let pending = 0, paid = 0, overdue = 0;

    contractorInvoices.forEach(inv => {
      const daysOld = Math.floor((Date.now() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
      const statusEmoji = inv.status === 'paid' ? '✅' : daysOld > 0 ? '⚠️' : '⏳';

      status += `${statusEmoji} ${inv.vendor}\n`;
      status += `   ${inv.amount} MAD | ${this.formatDate(inv.dueDate)}\n`;
      status += `   🆔 \`${inv.id}\`\n\n`;

      if (inv.status === 'paid') paid++;
      else if (daysOld > 0) overdue++;
      else pending++;
    });

    status += `\n📈 *Résumé*: ⏳ ${pending} | ✅ ${paid} | ⚠️ ${overdue}`;
    return status;
  }

  /**
   * Request payment for an invoice
   */
  async requestPayment(fromNumber, invoiceId) {
    const invoice = this.db.invoices.find(i => i.id === invoiceId && i.phoneNumber === fromNumber);

    if (!invoice) {
      return this.translate(fromNumber, 'invoice_not_found');
    }

    // TODO: Integrate actual payment methods
    const paymentMsg = `💳 *Demande de paiement*

📋 Facture: \`${invoiceId}\`
💰 Montant: *${invoice.amount} MAD*

Choisissez la méthode:
1️⃣ Virement Instantané (20 sec)
2️⃣ Orange Money (mobile)
3️⃣ Virement Bancaire (2-3 jours)

Répondez avec votre choix!`;

    return paymentMsg;
  }

  /**
   * List all invoices
   */
  listInvoices(fromNumber) {
    const contractorInvoices = this.db.invoices.filter(i => i.phoneNumber === fromNumber);
    if (contractorInvoices.length === 0) {
      return this.translate(fromNumber, 'no_invoices');
    }

    let list = '📋 *Toutes vos factures*\n\n';
    contractorInvoices.forEach(inv => {
      list += `• ${inv.vendor} - ${inv.amount} MAD\n`;
    });
    return list;
  }

  /**
   * Send payment reminders
   */
  sendReminders(fromNumber) {
    const contractorInvoices = this.db.invoices.filter(i =>
      i.phoneNumber === fromNumber &&
      i.status === 'pending' &&
      new Date(i.dueDate) < new Date()
    );

    if (contractorInvoices.length === 0) {
      return this.translate(fromNumber, 'no_reminders');
    }

    let msg = '⏰ *Factures en retard*\n\n';
    contractorInvoices.forEach(inv => {
      const daysOld = Math.floor((Date.now() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
      msg += `⚠️ ${inv.vendor} - ${daysOld}j en retard\n`;
    });
    return msg;
  }

  /**
   * Get help message
   */
  getHelp(fromNumber) {
    return `🤖 *Aide - Commandes*

📸 *Envoyer une photo* - L'IA parse la facture
💬 *Texte* - Posez une question
🎙️ *Audio* - Envoyez un message vocal

📊 Tapez "Statut" - Voir vos factures
💳 Tapez "Paiement" - Demander paiement
📋 Tapez "Liste" - Toutes les factures
⏰ Tapez "Rappel" - Rappels de paiement

🌍 Parlez en: Français, Arabe, Darija, Anglais ou Espagnol!`;
  }

  /**
   * Ask Claude for general questions
   */
  async askClaude(fromNumber, question) {
    try {
      const response = await axios.post(CLAUDE_API_URL, {
        model: 'claude-opus-4-1',
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: `You are a helpful WhatsApp assistant for a Moroccan invoice CRM.
The user asked (in their language): "${question}"

Respond helpfully in the same language. Keep it short and WhatsApp-friendly.`
          }
        ]
      }, {
        headers: {
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      });

      return response.data.content[0].text;
    } catch (error) {
      console.error('Error asking Claude:', error);
      return '❌ Je n\'ai pas compris. Tapez "Aide" pour les commandes.';
    }
  }

  /**
   * Detect language from text
   */
  detectLanguage(text) {
    // Simple language detection
    const arabicPattern = /[\u0600-\u06FF]/;
    const spanishPattern = /\b(el|la|de|que|y|el|para|con)\b/i;

    if (arabicPattern.test(text)) return 'ar';
    if (spanishPattern.test(text)) return 'es';
    if (/\bthe\b|\bwhich\b|\bfor\b/i.test(text)) return 'en';
    return 'fr'; // Default to French
  }

  /**
   * Translate messages
   */
  translate(fromNumber, key) {
    const conversation = this.conversations[fromNumber];
    const lang = conversation?.language || 'fr';

    const translations = {
      'error_processing': {
        fr: '❌ Erreur lors du traitement. Réessayez.',
        ar: '❌ خطأ في المعالجة. حاول مرة أخرى.',
        es: '❌ Error al procesar. Intenta de nuevo.'
      },
      'could_not_parse': {
        fr: '❌ Je n\'ai pas pu lire la facture. Essayez une meilleure photo.',
        ar: '❌ لم أتمكن من قراءة الفاتورة. حاول صورة أوضح.',
        es: '❌ No pude leer la factura. Intenta una foto más clara.'
      },
      'no_invoices': {
        fr: '📭 Vous n\'avez pas de factures.',
        ar: '📭 ليس لديك فواتير.',
        es: '📭 No tienes facturas.'
      },
      'invoice_not_found': {
        fr: '❌ Facture introuvable.',
        ar: '❌ الفاتورة غير موجودة.',
        es: '❌ Factura no encontrada.'
      },
      'no_reminders': {
        fr: '✅ Pas de rappels nécessaires!',
        ar: '✅ لا توجد تنبيهات مطلوبة!',
        es: '✅ ¡Sin recordatorios necesarios!'
      },
      'could_not_transcribe': {
        fr: '❌ Je n\'ai pas pu comprendre l\'audio.',
        ar: '❌ لم أستطع فهم الصوت.',
        es: '❌ No pude entender el audio.'
      },
      'error_parsing_invoice': {
        fr: '❌ Erreur lors de la lecture de la facture.',
        ar: '❌ خطأ في قراءة الفاتورة.',
        es: '❌ Error al leer la factura.'
      },
      'error_processing_audio': {
        fr: '❌ Erreur lors du traitement de l\'audio.',
        ar: '❌ خطأ في معالجة الصوت.',
        es: '❌ Error al procesar el audio.'
      }
    };

    return translations[key]?.[lang] || translations[key]?.['fr'] || 'Erreur';
  }

  /**
   * Download media from URL
   */
  async downloadMedia(mediaUrl) {
    return new Promise((resolve, reject) => {
      https.get(mediaUrl, (response) => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    });
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  /**
   * Note: Database is auto-saved to Firestore via db.invoices.create()
   */
}

module.exports = WhatsAppBot;
