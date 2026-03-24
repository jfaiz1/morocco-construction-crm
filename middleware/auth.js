const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'morocco-crm-dev-secret-change-me';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requis' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id.toString(), email: user.email, role: user.role, workspace_id: user.workspace_id.toString() },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

module.exports = { authenticateToken, generateToken, JWT_SECRET };
