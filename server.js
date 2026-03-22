const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const WhatsAppBot = require('./whatsapp-bot');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'your-account-sid';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'your-auth-token';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+1234567890';

// Initialize Prisma
const prisma = new PrismaClient();
const bot = new WhatsAppBot(prisma);

console.log('💾 Using PostgreSQL database with Prisma ORM');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to generate UUID
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

// Helper function to convert BigInt to string for JSON serialization
function convertBigInt(obj) {
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigInt);
  }
  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const key in obj) {
      result[key] = convertBigInt(obj[key]);
    }
    return result;
  }
  return obj;
}

// ===== REST API ENDPOINTS (for web dashboard) =====

// Home endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Invoice CRM API',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    status: '🚀 WhatsApp bot is ready',
    endpoints: {
      health: '/api/health',
      invoices: '/api/invoices',
      whatsapp: '/api/whatsapp/webhook'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.workspace.count();
    res.json({
      status: 'ok',
      message: 'WhatsApp CRM API running',
      port: PORT,
      database: 'PostgreSQL',
      whatsappBot: 'active',
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// GET all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    // Use raw SQL to avoid BigInt serialization issues
    const invoices = await prisma.$queryRaw`
      SELECT
        CAST(i.id AS TEXT) as id,
        CAST(i.workspace_id AS TEXT) as workspace_id,
        i.invoice_number,
        CAST(i.customer_id AS TEXT) as customer_id,
        i.issue_date,
        i.due_date,
        i.subtotal,
        i.tax_rate,
        i.tax_amount,
        i.total,
        i.status,
        i.payment_status,
        i.currency,
        i.is_draft,
        i.created_at,
        i.updated_at,
        i.deleted_at
      FROM "Invoice" i
      ORDER BY i.created_at DESC
    `;

    res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET invoices by phone number
app.get('/api/invoices/phone/:phone', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        customer: {
          primary_phone: req.params.phone
        }
      },
      include: {
        customer: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET single invoice
app.get('/api/invoices/:id', async (req, res) => {
  try {
    // Check if it's a phone number query
    if (req.params.id.includes('+') || req.params.id.includes('whatsapp')) {
      const invoices = await prisma.invoice.findMany({
        where: {
          customer: {
            primary_phone: req.params.id
          }
        },
        include: {
          customer: true
        }
      });
      return res.json({ invoices });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: BigInt(req.params.id) },
      include: { customer: true }
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CREATE invoice
app.post('/api/invoices', async (req, res) => {
  try {
    const { vendor, amount, dueDate, description, status, phoneNumber } = req.body;

    if (!vendor || !amount || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: {
        primary_phone: phoneNumber || 'manual',
        workspace_id: 1
      }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          workspace_id: 1,
          name: vendor,
          primary_phone: phoneNumber || 'manual',
          business_type: 'construction',
          is_active: true
        }
      });
    }

    const created = await prisma.invoice.create({
      data: {
        workspace_id: 1,
        invoice_number: `INV-${Date.now()}`,
        customer_id: customer.id,
        issue_date: new Date(),
        due_date: new Date(dueDate),
        subtotal: parseFloat(amount),
        tax_rate: 20.0,
        tax_amount: parseFloat(amount) * 0.20,
        total: parseFloat(amount) * 1.20,
        status: status || 'pending',
        payment_status: status === 'paid' ? 'paid' : 'unpaid',
        currency: 'MAD',
        is_draft: false
      },
      include: { customer: true }
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE invoice status
app.patch('/api/invoices/:id', async (req, res) => {
  try {
    const { status, payment_status } = req.body;

    if (!status && !payment_status) {
      return res.status(400).json({ error: 'Status or payment_status is required' });
    }

    const updated = await prisma.invoice.update({
      where: { id: BigInt(req.params.id) },
      data: {
        status: status || undefined,
        payment_status: payment_status || undefined,
        updated_at: new Date()
      },
      include: { customer: true }
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE invoice
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({
      where: { id: BigInt(req.params.id) }
    });

    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ===== WHATSAPP WEBHOOK =====

/**
 * Twilio WhatsApp webhook - receive messages
 */
app.post('/api/whatsapp/webhook', async (req, res) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  const webhookUrl = `${process.env.WEBHOOK_URL || 'http://localhost:3001'}/api/whatsapp/webhook`;

  // Verify Twilio request (optional for testing)
  if (process.env.VERIFY_TWILIO_SIGNATURE !== 'false') {
    const isValid = twilio.validateRequest(TWILIO_AUTH_TOKEN, twilioSignature, webhookUrl, req.body);
    if (!isValid) {
      return res.status(401).send('Unauthorized');
    }
  }

  try {
    const { From, Body, MediaUrl0, MediaContentType0 } = req.body;
    const fromNumber = From.replace('whatsapp:', '');

    console.log(`📨 WhatsApp message from ${fromNumber}`);

    let responseText = '';

    // Determine message type
    if (MediaUrl0 && MediaContentType0.startsWith('image')) {
      // 📸 Image message
      responseText = await bot.processMessage(fromNumber, 'image', MediaUrl0, null, Body);
    } else if (MediaUrl0 && MediaContentType0.startsWith('audio')) {
      // 🎙️ Audio message
      responseText = await bot.processMessage(fromNumber, 'audio', MediaUrl0, null, null);
    } else if (Body) {
      // 💬 Text message
      responseText = await bot.processMessage(fromNumber, 'text', null, Body, null);
    }

    // Send response via Twilio
    const twiliClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await twiliClient.messages.create({
      from: TWILIO_PHONE_NUMBER,
      to: From,
      body: responseText
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling WhatsApp message:', error);
    res.status(500).send('Error processing message');
  }
});

/**
 * Webhook validation (GET)
 */
app.get('/api/whatsapp/webhook', (req, res) => {
  res.send(req.query['hub.challenge']);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ WhatsApp CRM running on port ${PORT}`);
  console.log(`📱 WhatsApp Webhook: /api/whatsapp/webhook`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: PostgreSQL (Prisma ORM)`);
  console.log(`\n🚀 Ready to receive WhatsApp messages!`);
  console.log(`📋 API: http://localhost:${PORT}`);
});

module.exports = app;
