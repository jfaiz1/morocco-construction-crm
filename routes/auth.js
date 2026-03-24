const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../database');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone_number } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Cet email existe déjà' });
    }

    // Get or create default workspace
    let workspace = await prisma.workspace.findFirst({ where: { slug: 'default' } });
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: 'Morocco CRM', slug: 'default', is_active: true }
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        workspace_id: workspace.id,
        email,
        password_hash,
        first_name: first_name || null,
        last_name: last_name || null,
        phone_number: phone_number || null,
        role: 'admin',
        is_active: true
      }
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants invalides' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id.toString(),
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(req.user.id) }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id.toString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      role: user.role,
      workspace_id: user.workspace_id.toString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, current_password, new_password } = req.body;

    const user = await prisma.user.findUnique({ where: { id: BigInt(req.user.id) } });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone_number !== undefined) updateData.phone_number = phone_number;

    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Cet email existe déjà' });
      updateData.email = email;
    }

    if (new_password) {
      if (!current_password) return res.status(400).json({ error: 'Mot de passe actuel requis' });
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
      updateData.password_hash = await bcrypt.hash(new_password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: BigInt(req.user.id) },
      data: updateData
    });

    const token = generateToken(updated);

    res.json({
      token,
      user: {
        id: updated.id.toString(),
        email: updated.email,
        first_name: updated.first_name,
        last_name: updated.last_name,
        role: updated.role,
        phone_number: updated.phone_number
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
