const express = require('express');
const prisma = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { invoice_id, customer_id, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      workspace_id: BigInt(req.user.workspace_id),
      deleted_at: null
    };

    if (invoice_id) where.invoice_id = BigInt(invoice_id);
    if (customer_id) where.customer_id = BigInt(customer_id);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          invoice: { select: { invoice_number: true, total: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.payment.count({ where })
    ]);

    res.json({ payments, total, page: parseInt(page) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments - Record a payment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, payment_date, notes } = req.body;

    if (!invoice_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'invoice_id, amount et payment_method requis' });
    }

    const workspaceId = BigInt(req.user.workspace_id);

    // Verify invoice exists
    const invoice = await prisma.invoice.findFirst({
      where: { id: BigInt(invoice_id), workspace_id: workspaceId }
    });

    if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });

    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const payment = await prisma.payment.create({
      data: {
        workspace_id: workspaceId,
        payment_number: paymentNumber,
        customer_id: invoice.customer_id,
        invoice_id: BigInt(invoice_id),
        amount: parseFloat(amount),
        currency: 'MAD',
        payment_method,
        payment_date: payment_date ? new Date(payment_date) : new Date(),
        status: 'confirmed',
        notes: notes || null,
        created_by: BigInt(req.user.id)
      },
      include: { invoice: true, customer: true }
    });

    // Update invoice payment status
    const totalPaid = await prisma.payment.aggregate({
      where: { invoice_id: BigInt(invoice_id), deleted_at: null },
      _sum: { amount: true }
    });

    const paidAmount = Number(totalPaid._sum.amount || 0);
    const invoiceTotal = Number(invoice.total);

    let newStatus;
    if (paidAmount >= invoiceTotal) {
      newStatus = 'paid';
    } else if (paidAmount > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'unpaid';
    }

    await prisma.invoice.update({
      where: { id: BigInt(invoice_id) },
      data: {
        payment_status: newStatus,
        status: newStatus === 'paid' ? 'paid' : invoice.status
      }
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('POST /payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
