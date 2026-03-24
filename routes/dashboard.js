const express = require('express');
const prisma = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const workspaceId = BigInt(req.user.workspace_id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      overdueInvoices,
      totalCustomers,
      recentInvoices,
      monthlyInvoices
    ] = await Promise.all([
      // Total invoices
      prisma.invoice.count({
        where: { workspace_id: workspaceId, deleted_at: null }
      }),
      // Pending invoices with sum
      prisma.invoice.aggregate({
        where: { workspace_id: workspaceId, deleted_at: null, payment_status: 'unpaid', due_date: { gte: now } },
        _sum: { total: true },
        _count: true
      }),
      // Paid invoices with sum
      prisma.invoice.aggregate({
        where: { workspace_id: workspaceId, deleted_at: null, payment_status: 'paid' },
        _sum: { total: true },
        _count: true
      }),
      // Overdue invoices with sum
      prisma.invoice.aggregate({
        where: { workspace_id: workspaceId, deleted_at: null, payment_status: { not: 'paid' }, due_date: { lt: now } },
        _sum: { total: true },
        _count: true
      }),
      // Total customers
      prisma.customer.count({
        where: { workspace_id: workspaceId, deleted_at: null, is_active: true }
      }),
      // Recent invoices
      prisma.invoice.findMany({
        where: { workspace_id: workspaceId, deleted_at: null },
        include: { customer: { select: { name: true, primary_phone: true } } },
        orderBy: { created_at: 'desc' },
        take: 5
      }),
      // This month's invoices
      prisma.invoice.aggregate({
        where: { workspace_id: workspaceId, deleted_at: null, created_at: { gte: startOfMonth } },
        _sum: { total: true },
        _count: true
      })
    ]);

    res.json({
      overview: {
        total_invoices: totalInvoices,
        total_customers: totalCustomers,
        pending: {
          count: pendingInvoices._count,
          amount: Number(pendingInvoices._sum.total || 0)
        },
        paid: {
          count: paidInvoices._count,
          amount: Number(paidInvoices._sum.total || 0)
        },
        overdue: {
          count: overdueInvoices._count,
          amount: Number(overdueInvoices._sum.total || 0)
        },
        this_month: {
          count: monthlyInvoices._count,
          amount: Number(monthlyInvoices._sum.total || 0)
        }
      },
      recent_invoices: recentInvoices,
      currency: 'MAD'
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/chart - monthly revenue data
router.get('/chart', authenticateToken, async (req, res) => {
  try {
    const workspaceId = BigInt(req.user.workspace_id);

    // Get last 6 months of data
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [invoiced, collected] = await Promise.all([
        prisma.invoice.aggregate({
          where: { workspace_id: workspaceId, deleted_at: null, created_at: { gte: start, lte: end } },
          _sum: { total: true },
          _count: true
        }),
        prisma.invoice.aggregate({
          where: { workspace_id: workspaceId, deleted_at: null, payment_status: 'paid', created_at: { gte: start, lte: end } },
          _sum: { total: true }
        })
      ]);

      months.push({
        month: start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        invoiced: Number(invoiced._sum.total || 0),
        collected: Number(collected._sum.total || 0),
        count: invoiced._count
      });
    }

    res.json({ months });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
