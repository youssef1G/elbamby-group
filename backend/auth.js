import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.bg_admin_token;
    if (!token) return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });

    const decoded = verifyToken(token);

    // Guard: only tokens carrying kind === 'admin' are admin sessions. A
    // customer token (kind: 'customer', docs/13 §5.1) shares the same JWT
    // secret, so without this check it would slip through as an admin.
    if (decoded?.kind !== 'admin') {
      res.clearCookie('bg_admin_token', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
      return res.status(401).json({ error: { message: 'Invalid or expired session', code: 'UNAUTHORIZED' } });
    }

    req.admin = decoded;
    next();
  } catch {
    res.clearCookie('bg_admin_token', { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
    res.status(401).json({ error: { message: 'Invalid or expired session', code: 'UNAUTHORIZED' } });
  }
}

export function requireSuperAdmin(req, res, next) {
  requireAdmin(req, res, () => {
    if (req.admin?.role !== 'super_admin') {
      return res.status(403).json({ error: { message: 'Super admin access required', code: 'FORBIDDEN' } });
    }
    next();
  });
}
