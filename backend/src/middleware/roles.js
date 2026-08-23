/**
 * Middleware Factory: requireRole
 * Usage: router.get('/admin-route', verifyToken, requireRole('admin'), handler)
 *
 * @param {string} role - 'student' | 'admin'
 */
const requireRole = (role) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  if (req.user.role !== role) {
    return res.status(403).json({
      error: `Access denied — requires role: ${role}`,
    });
  }
  next();
};

module.exports = { requireRole };
