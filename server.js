const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();

const prisma = require('./database');
const WhatsAppBot = require('./whatsapp-bot');
const authRouter = require('./routes/auth');
const invoiceRouter = require('./routes/invoices');
const customerRouter = require('./routes/customers');
const dashboardRouter = require('./routes/dashboard');
const paymentRouter = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3001;

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize bot
const bot = new WhatsAppBot(prisma);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== API ROUTES =====
app.use('/api/auth', authRouter);
app.use('/api/invoices', invoiceRouter);
app.use('/api/customers', customerRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/payments', paymentRouter);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ===== WHATSAPP WEBHOOK =====
app.post('/api/whatsapp/webhook', async (req, res) => {
  const twilioSignature = req.headers['x-twilio-signature'];
  const webhookUrl = `${process.env.WEBHOOK_URL || `http://localhost:${PORT}`}/api/whatsapp/webhook`;

  // Verify Twilio signature in production
  if (process.env.VERIFY_TWILIO_SIGNATURE !== 'false' && TWILIO_AUTH_TOKEN) {
    const isValid = twilio.validateRequest(TWILIO_AUTH_TOKEN, twilioSignature, webhookUrl, req.body);
    if (!isValid) {
      return res.status(401).send('Unauthorized');
    }
  }

  try {
    const { From, Body, MediaUrl0, MediaContentType0 } = req.body;
    const fromNumber = From.replace('whatsapp:', '');

    console.log(`📨 WhatsApp from ${fromNumber}`);

    let responseText = '';

    if (MediaUrl0 && MediaContentType0 && MediaContentType0.startsWith('image')) {
      responseText = await bot.processMessage(fromNumber, 'image', MediaUrl0, null, Body);
    } else if (MediaUrl0 && MediaContentType0 && MediaContentType0.startsWith('audio')) {
      responseText = await bot.processMessage(fromNumber, 'audio', MediaUrl0, null, null);
    } else if (Body) {
      responseText = await bot.processMessage(fromNumber, 'text', null, Body, null);
    }

    // Send response via Twilio
    if (responseText && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      await twilioClient.messages.create({
        from: TWILIO_PHONE_NUMBER,
        to: From,
        body: responseText
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).send('Error processing message');
  }
});

app.get('/api/whatsapp/webhook', (req, res) => {
  res.send(req.query['hub.challenge'] || 'OK');
});

// ===== SERVE FRONTEND =====
const frontendPath = path.join(__dirname, 'frontend', 'dist');
app.use(express.static(frontendPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
    if (err) {
      res.json({
        message: 'Morocco WhatsApp CRM API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth/login',
          invoices: '/api/invoices',
          customers: '/api/customers',
          dashboard: '/api/dashboard/stats',
          whatsapp: '/api/whatsapp/webhook'
        }
      });
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n✅ Morocco WhatsApp CRM running on port ${PORT}`);
  console.log(`📱 WhatsApp Webhook: /api/whatsapp/webhook`);
  console.log(`📊 Dashboard API: /api/dashboard/stats`);
  console.log(`💾 Database: PostgreSQL (Prisma ORM)`);
  console.log(`🌐 Frontend: http://localhost:${PORT}\n`);
});

module.exports = app;
