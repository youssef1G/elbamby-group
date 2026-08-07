import jwt from 'jsonwebtoken';
import { getAdminSessionById } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
// Vercel lambdas don't set NODE_ENV at runtime — they set VERCEL_ENV.
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

// SameSite=None + Secure is required for cookie auth across split domains
// (frontend on vercel.app, backend on its own subdomain or a custom domain).
// Browsers accept Secure cookies on localhost (potentially trustworthy origin).
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'none', path: '/' };

function clearAdminCookie(res) {
  res.clearCookie('bg_admin_token', COOKIE_OPTIONS);
}

const unauthorized = (res) =>
  res.status(401).json({ error: { message: 'Invalid or expired session', code: 'UNAUTHORIZED' } });

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
      clearAdminCookie(res);
      return unauthorized(res);
    }

    // Re-read role/is_active from the DB on EVERY request. The JWT role claim
    // is not the source of truth: a deactivated or demoted admin must lose
    // access immediately, not at JWT expiry. requireSuperAdmin also benefits —
    // req.admin.role now always comes from the live row, so a stale token
    // can never hold a promoted role.
    getAdminSessionById(decoded.id)
      .then(({ data: admin, error }) => {
        if (error || !admin || !admin.is_active) {
          clearAdminCookie(res);
          return unauthorized(res);
        }
        req.admin = { ...decoded, ...admin };
        next();
      })
      .catch(() => {
        clearAdminCookie(res);
        res.status(500).json({
          error: { message: 'Authentication check failed', code: 'SERVER_ERROR' },
        });
      });
  } catch {
    clearAdminCookie(res);
    unauthorized(res);
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
