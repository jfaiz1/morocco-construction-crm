const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const twilio = require('twilio');
const WhatsAppBot = require('./whatsapp-bot');
const { initializeFirestore, FirestoreDB } = require('./firestore-db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'your-account-sid';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'your-auth-token';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+1234567890';

// Initialize Firestore
let db;
try {
  initializeFirestore();
  db = new FirestoreDB();
  console.log('💾 Using Firestore database');
} catch (error) {
  console.error('❌ Firestore initialization failed:', error.message);
  console.log('⚠️  Please set up Firebase credentials');
  process.exit(1);
}

const bot = new WhatsAppBot(db);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to generate UUID
function generateId() {
  return Math.random().toString(36).substr(2, 9);
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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WhatsApp CRM API running',
    port: PORT,
    database: 'JSON-based',
    whatsappBot: 'active',
    uptime: process.uptime()
  });
});

// GET all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const invoices = await db.invoices.getAll();
    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET invoices by phone number
app.get('/api/invoices/phone/:phone', async (req, res) => {
  try {
    const invoices = await db.invoices.getByPhone(req.params.phone);
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
      const invoices = await db.invoices.getByPhone(req.params.id);
      return res.json({ invoices });
    }

    const invoice = await db.invoices.getById(req.params.id);
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
    const { vendor, amount, dueDate, project, description, status, phoneNumber } = req.body;

    if (!vendor || !amount || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const invoice = {
      phoneNumber: phoneNumber || 'manual',
      vendor,
      amount: parseFloat(amount),
      dueDate,
      project: project || null,
      description: description || null,
      status: status || 'pending'
    };

    const created = await db.invoices.create(invoice);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE invoice status
app.patch('/api/invoices/:id', async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const updated = await db.invoices.update(req.params.id, { status });
    if (!updated) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE invoice
app.delete('/api/invoices/:id', async (req, res) => {
  try {
    const deleted = await db.invoices.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted' });
  } catch (error) {
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
  console.log(`💾 Database: invoices.json`);
  console.log(`\n🚀 Ready to receive WhatsApp messages!`);
  console.log(`📋 API: http://localhost:${PORT}`);
});

module.exports = app;
