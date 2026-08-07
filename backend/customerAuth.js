import { verifyToken } from './auth.js';

// Customer auth — fully separate from admin auth per docs/13-points-system.md
// Section 5.1:
//   - separate cookie name (`bg_customer_token` vs `bg_admin_token`)
//   - separate JWT (carry a `kind: 'customer'` claim so a customer token can
//     never be mistaken for an admin token by auth.js's requireAdmin, which
//     would otherwise just decode() any valid JWT)
//   - separate middleware file
//
// `signToken` / `verifyToken` from auth.js are reused — they only wrap
// jwt.sign/jwt.verify against the same JWT_SECRET. The separation that
// matters (cookie name + the `kind` claim guard below) lives here.

const CUSTOMER_COOKIE_NAME = 'bg_customer_token';

export const CUSTOMER_COOKIE = CUSTOMER_COOKIE_NAME;
// SameSite=None + Secure for split-domain deployments (see auth.js).
export const CUSTOMER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function requireCustomer(req, res, next) {
  try {
    const token = req.cookies?.[CUSTOMER_COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
    }

    const decoded = verifyToken(token);

    // Guard: a customer session MUST carry kind === 'customer'. An admin token
    // (or any token without this claim) is rejected so admin↔customer tokens
    // cannot be cross-used.
    if (decoded?.kind !== 'customer') {
      res.clearCookie(CUSTOMER_COOKIE_NAME, CUSTOMER_COOKIE_OPTIONS);
      return res.status(401).json({ error: { message: 'Invalid session', code: 'UNAUTHORIZED' } });
    }

    req.customer = decoded;
    next();
  } catch {
    res.clearCookie(CUSTOMER_COOKIE_NAME, CUSTOMER_COOKIE_OPTIONS);
    res.status(401).json({ error: { message: 'Invalid or expired session', code: 'UNAUTHORIZED' } });
  }
}

// Optional variant for routes that must serve BOTH guests and logged-in
// customers (e.g. POST /api/orders): attaches `req.customer` when a valid
// customer cookie is present, otherwise continues as a guest — never 401s.
// An invalid/expired cookie is cleared and treated as a guest session.
export function optionalCustomer(req, res, next) {
  try {
    const token = req.cookies?.[CUSTOMER_COOKIE_NAME];
    if (!token) return next();

    const decoded = verifyToken(token);
    if (decoded?.kind === 'customer') {
      req.customer = decoded;
      return next();
    }

    res.clearCookie(CUSTOMER_COOKIE_NAME, CUSTOMER_COOKIE_OPTIONS);
  } catch {
    res.clearCookie(CUSTOMER_COOKIE_NAME, CUSTOMER_COOKIE_OPTIONS);
  }
  next();
}
