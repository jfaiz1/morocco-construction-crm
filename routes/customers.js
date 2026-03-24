const express = require('express');
const prisma = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      workspace_id: BigInt(req.user.workspace_id),
      deleted_at: null,
      is_active: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { business_name: { contains: search, mode: 'insensitive' } },
        { primary_phone: { contains: search } }
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: { select: { invoices: true, payments: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.customer.count({ where })
    ]);

    res.json({ customers, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('GET /customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id: BigInt(req.params.id),
        workspace_id: BigInt(req.user.workspace_id)
      },
      include: {
        invoices: { where: { deleted_at: null }, orderBy: { created_at: 'desc' } },
        payments: { orderBy: { created_at: 'desc' } },
        communications: { orderBy: { created_at: 'desc' }, take: 20 }
      }
    });

    if (!customer) return res.status(404).json({ error: 'Client introuvable' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/customers
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, business_name, business_type, primary_phone, primary_email, region, city, whatsapp_number, notes } = req.body;

    if (!name || !primary_phone) {
      return res.status(400).json({ error: 'Nom et téléphone requis' });
    }

    const customer = await prisma.customer.create({
      data: {
        workspace_id: BigInt(req.user.workspace_id),
        name,
        business_name: business_name || null,
        business_type: business_type || 'contractor',
        primary_phone,
        primary_email: primary_email || null,
        region: region || null,
        city: city || null,
        whatsapp_number: whatsapp_number || primary_phone,
        notes: notes || null,
        is_active: true,
        created_by: BigInt(req.user.id)
      }
    });

    res.status(201).json(customer);
  } catch (error) {
    console.error('POST /customers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const allowedFields = ['name', 'business_name', 'business_type', 'primary_phone', 'primary_email', 'region', 'city', 'whatsapp_number', 'notes', 'banking_preference'];
    const data = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) data[field] = req.body[field];
    }

    const updated = await prisma.customer.update({
      where: { id: BigInt(req.params.id) },
      data
    });

    res.json(updated);
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Client introuvable' });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
