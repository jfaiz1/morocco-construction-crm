const express = require('express');
const prisma = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, payment_status, search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      workspace_id: BigInt(req.user.workspace_id),
      deleted_at: null,
    };

    if (status) where.status = status;
    if (payment_status) where.payment_status = payment_status;
    if (search) {
      where.OR = [
        { invoice_number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { customer: { select: { id: true, name: true, primary_phone: true, business_name: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.invoice.count({ where })
    ]);

    res.json({ invoices, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('GET /invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: BigInt(req.params.id),
        workspace_id: BigInt(req.user.workspace_id)
      },
      include: {
        customer: true,
        items: true,
        payments: true
      }
    });

    if (!invoice) return res.status(404).json({ error: 'Facture introuvable' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/invoices
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { customer_id, vendor_name, amount, due_date, description, items, tax_rate = 20 } = req.body;

    if (!amount || !due_date) {
      return res.status(400).json({ error: 'Montant et date d\'échéance requis' });
    }

    const workspaceId = BigInt(req.user.workspace_id);

    // Find or create customer
    let customerId;
    if (customer_id) {
      customerId = BigInt(customer_id);
    } else if (vendor_name) {
      let customer = await prisma.customer.findFirst({
        where: { name: vendor_name, workspace_id: workspaceId }
      });
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            workspace_id: workspaceId,
            name: vendor_name,
            primary_phone: 'manual',
            business_type: 'contractor',
            is_active: true
          }
        });
      }
      customerId = customer.id;
    } else {
      return res.status(400).json({ error: 'customer_id ou vendor_name requis' });
    }

    const subtotal = parseFloat(amount);
    const taxAmount = subtotal * (parseFloat(tax_rate) / 100);
    const total = subtotal + taxAmount;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const invoice = await prisma.invoice.create({
      data: {
        workspace_id: workspaceId,
        invoice_number: invoiceNumber,
        invoice_year: new Date().getFullYear(),
        customer_id: customerId,
        issue_date: new Date(),
        due_date: new Date(due_date),
        subtotal,
        tax_rate: parseFloat(tax_rate),
        tax_amount: taxAmount,
        total,
        status: 'pending',
        payment_status: 'unpaid',
        currency: 'MAD',
        is_draft: false,
        customer_notes: description || null,
        created_by: BigInt(req.user.id),
        items: items && items.length > 0 ? {
          create: items.map(item => ({
            description: item.description,
            category: item.category || 'service',
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'lot',
            unit_price: parseFloat(item.unit_price),
            line_total: (parseFloat(item.quantity) || 1) * parseFloat(item.unit_price),
            tax_rate: parseFloat(tax_rate),
            tax_amount: ((parseFloat(item.quantity) || 1) * parseFloat(item.unit_price)) * (parseFloat(tax_rate) / 100)
          }))
        } : undefined
      },
      include: { customer: true, items: true }
    });

    res.status(201).json(invoice);
  } catch (error) {
    console.error('POST /invoices error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/invoices/:id
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, payment_status, internal_notes } = req.body;

    const data = { updated_at: new Date() };
    if (status) data.status = status;
    if (payment_status) data.payment_status = payment_status;
    if (internal_notes !== undefined) data.internal_notes = internal_notes;

    const updated = await prisma.invoice.update({
      where: { id: BigInt(req.params.id) },
      data,
      include: { customer: true }
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Facture introuvable' });
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/invoices/:id (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await prisma.invoice.update({
      where: { id: BigInt(req.params.id) },
      data: { deleted_at: new Date() }
    });
    res.json({ message: 'Facture supprimée' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Facture introuvable' });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
