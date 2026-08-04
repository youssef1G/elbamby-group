import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import {
  supabase,
  toCamelCase,
  getAdminById,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  listCategories,
  getCategoryBySlug,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getProductCountByCategory,
  listProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  softDeleteProduct,
  incrementViewCount,
  createProductImages,
  getImagesByProductId,
  hardDeleteProduct,
  getOrderItemCountByProductId,
  deleteProductImagesByProductId,
  getProductsWithImagesByIds,
  createOrder,
  listOrders,
  getOrderById,
  getOrderByNumberAndPhone,
  getOrdersByPhone,
  updateOrderStatus,
  updateOrderAdminNote,
  createStatusHistoryEntry,
  getTodayOrderCount,
  getOrderCount,
  getDeliveredOrderTotals,
  getActiveProducts,
  getProductCount,
  getAnalyticsSummary,
  getOrdersSince,
  getItemsWithOrdersSince,
  getProductsByIds,
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  getSettings,
  upsertSettings,
  createComplaint,
  listComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  createReturnRequest,
  listReturnRequests,
  getReturnRequestById,
  updateReturnRequest,
  deleteReturnRequest,
  // ── points / customer-accounts (docs/13-points-system.md, Stage A) ──
  getCustomerByPhone,
  getCustomerById,
  getCustomerAuthById,
  createCustomer,
  setCustomerPasswordByPhone,
  updateCustomer,
  updateCustomerPassword,
  listOrdersByCustomer,
  listCustomerDirectory,
  listPointsTransactionsByCustomer,
  createPointsTransaction,
  getPointsEarnRate,
  creditOrderEarnedPoints,
  refundOrderRedeemedPoints,
  reverseOrderEarnedPoints,
} from './db.js';
import { signToken, verifyToken, requireAdmin, requireSuperAdmin } from './auth.js';
import { sendOrderEmail } from './email.js';
import {
  requireCustomer,
  optionalCustomer,
  CUSTOMER_COOKIE,
  CUSTOMER_COOKIE_OPTIONS,
} from './customerAuth.js';

// ──────────────────────────────────────────────
//  constants
// ──────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === 'production';
const COOKIE_NAME = 'bg_admin_token';
const BCRYPT_ROUNDS = 12;
const CANCEL_EMAIL_STATUSES = ['confirmed', 'shipped', 'delivered', 'cancelled'];
const COMPLAINT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const RETURN_STATUSES = ['pending', 'approved', 'rejected', 'completed'];
const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

const PUBLIC_SETTINGS_FIELDS = [
  'store_name_en',
  'store_name_ar',
  'logo_url',
  'contact_phone',
  'whatsapp_number',
  'contact_email',
  'address_en',
  'address_ar',
  'facebook_url',
  'instagram_url',
  'tiktok_url',
  'default_shipping_fee',
  'free_shipping_threshold',
  'currency_code',
  // Points rates — exposed publicly so the checkout can recalculate the
  // order total live as redeemed points change (docs/13 §7.4) and the
  // success page can show the earned estimate (docs/13 §3.1).
  'points_earn_rate',
  'points_redeem_rate',
];

// ──────────────────────────────────────────────
//  helpers
// ──────────────────────────────────────────────

function requireDb(req, res) {
  if (!supabase) {
    res.status(500).json({ error: { message: 'Database not configured', code: 'SERVER_ERROR' } });
    return false;
  }
  return true;
}

function pad4(n) {
  return String(n).padStart(4, '0');
}

async function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`;

  const { count, error } = await getTodayOrderCount();
  if (error) throw error;

  const seq = (count || 0) + 1;
  return `BG-${datePrefix}-${pad4(seq)}`;
}

function mapPeriod(p) {
  if (!['7d', '30d', '90d'].includes(p)) return '30d';
  return p;
}

function daysForPeriod(p) {
  return p === '7d' ? 7 : p === '90d' ? 90 : 30;
}

// ──────────────────────────────────────────────
//  rate limiters
// ──────────────────────────────────────────────

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);

const authLimiter = rateLimit({ windowMs, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: { message: 'Too many login attempts, try again later', code: 'RATE_LIMITED' } } });
const orderLimiter = rateLimit({ windowMs, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: { message: 'Too many requests, please wait', code: 'RATE_LIMITED' } } });
const trackingLimiter = rateLimit({ windowMs, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: { message: 'Too many requests, please wait', code: 'RATE_LIMITED' } } });
const publicGetLimiter = () =>
  rateLimit({ windowMs, max: 100, standardHeaders: true, legacyHeaders: false, message: { error: { message: 'Too many requests, please wait', code: 'RATE_LIMITED' } } });

// ──────────────────────────────────────────────
//  validation middleware
// ──────────────────────────────────────────────

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return res.status(400).json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details } });
    }
    req.validatedBody = result.data;
    next();
  };
}

// ──────────────────────────────────────────────
//  zod schemas
// ──────────────────────────────────────────────

// Accepts local (01XXXXXXXXX), international (+201XXXXXXXXX), and spaced/dashed
// variants; normalizePhone() runs BEFORE the regex so all forms pass and every
// validated value is stored in local form.
const phoneRegex = /^01[0-2,5]\d{8}$/;

function normalizePhone(value) {
  if (typeof value !== 'string') return value;
  const cleaned = value.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+20')) return `0${cleaned.slice(3)}`;
  return cleaned;
}

// Admin list-search: users may paste +20/international forms — normalize only
// phone-like queries (starts with +), never name/order-number searches.
function normalizeSearchPhone(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.startsWith('+') ? normalizePhone(trimmed) : trimmed;
}

const phoneField = z
  .string()
  .transform(normalizePhone)
  .pipe(z.string().regex(phoneRegex, 'Invalid Egyptian phone number'));

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const createAdminSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['super_admin', 'admin']).default('admin'),
  is_active: z.boolean().default(true),
});

const updateAdminSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.enum(['super_admin', 'admin']).optional(),
  is_active: z.boolean().optional(),
});

const bannerSchema = z.object({
  image_url: z.string().url('Image URL is required'),
  title_en: z.string().optional(),
  title_ar: z.string().optional(),
  subtitle_en: z.string().optional(),
  subtitle_ar: z.string().optional(),
  link_url: z.string().optional(),
  position: z.enum(['home_hero', 'home_secondary', 'shop_top']).default('home_hero'),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

const categorySchema = z.object({
  name_en: z.string().min(1, 'Name (English) is required'),
  name_ar: z.string().min(1, 'Name (Arabic) is required'),
  slug: z.string().min(1, 'Slug is required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  image_url: z.string().url().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

const complaintSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: phoneField,
  email: z.string().email('Invalid email').optional(),
  message: z.string().min(1, 'Message is required'),
  order_id: z.string().uuid().optional(),
});

const updateComplaintSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  admin_response: z.string().optional(),
});

const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Name is required'),
  phone: phoneField,
  alt_phone: phoneField.optional(),
  email: z.string().email('Invalid email').optional(),
  address_line: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  governorate: z.string().min(1, 'Governorate is required'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    }),
  ).min(1, 'At least one item is required'),
  // ── points (docs/13-points-system.md 3.2 / 4) — additive, optional ──
  // Only honored when a logged-in customer session is present. Guests sending
  // this field get it rejected below (in submitOrder), so a guest cannot
  // sneak a redemption through.
  points_to_redeem: z.number().int().min(0).default(0),
});

const createProductSchema = z.object({
  sku: z.string().optional(),
  name_en: z.string().min(1, 'Name (English) is required'),
  name_ar: z.string().min(1, 'Name (Arabic) is required'),
  slug: z.string().min(1, 'Slug is required'),
  description_en: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  category_id: z.string().uuid('Invalid category'),
  price: z.number().positive('Price must be positive'),
  compare_at_price: z.number().positive().nullable().optional(),
  stock_quantity: z.number().int().min(0, 'Stock cannot be negative'),
  unlimited_stock: z.boolean().default(false),
  low_stock_threshold: z.number().int().min(0).default(5),
  capacity_gb: z.number().int().positive().nullable().optional(),
  speed_class: z.string().nullable().optional(),
  interface_type: z.string().nullable().optional(),
  form_factor: z.string().nullable().optional(),
  is_featured: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  images: z
    .array(z.object({ image_url: z.string().url(), sort_order: z.number().int() }))
    .min(1, 'At least one image is required'),
});

const updateProductSchema = createProductSchema.partial();

const returnRequestSchema = z.object({
  order_number: z.string().min(1, 'Order number is required'),
  phone: z.string().min(1, 'Phone is required'),
  reason: z.string().min(1, 'Reason is required'),
});

const updateReturnRequestSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
  admin_note: z.string().optional(),
});

const settingsSchema = z.object({
  store_name_en: z.string().optional(),
  store_name_ar: z.string().optional(),
  logo_url: z.string().url().optional(),
  contact_phone: z.string().optional(),
  whatsapp_number: z.string().optional(),
  contact_email: z.string().email().optional(),
  address_en: z.string().optional(),
  address_ar: z.string().optional(),
  facebook_url: z.string().url().optional(),
  instagram_url: z.string().url().optional(),
  tiktok_url: z.string().url().optional(),
  default_shipping_fee: z.number().min(0).optional(),
  free_shipping_threshold: z.number().min(0).optional(),
  low_stock_threshold_default: z.number().int().min(0).optional(),
  currency_code: z.string().optional(),
  // ── points config (docs/13-points-system.md 2.4) — additive, optional ──
  // shippable through the existing admin PUT /api/admin/settings. A dedicated
  // `PUT /api/admin/settings/points` route is part of Stage B/C and is NOT
  // introduced here (no new route, just two fields on the existing schema).
  points_earn_rate: z.number().min(0).optional(),
  points_redeem_rate: z.number().min(0).optional(),
});

// ── Customer auth (docs/13-points-system.md 5.1) ─────────────────────────────
// Separate from admin auth. Inlined here per the backend 4-file convention
// (schemas live in server.js, not a separate schemas/ folder).

const customerRegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: phoneField,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  email: z.string().email('Invalid email').optional(),
});

const customerLoginSchema = z.object({
  phone: phoneField,
  password: z.string().min(1, 'Password is required'),
});

const customerProfileUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  // empty string = clear the email (stored as NULL)
  email: z
    .union([z.string().email('Invalid email'), z.literal('')])
    .optional(),
});

const customerPasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Admin customer/points management (docs/13-points-system.md §5.3 / §6) ─────
// In-store path: create an account with name + phone only — no password; the
// customer claims it online later via register (see §2.1 claim note).

const adminCreateCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: phoneField,
});

// direction-specific requirement (egp_amount for grant, points for deduct) is
// enforced inline in the handler (same pattern as the inline status checks).
const pointsAdjustSchema = z.object({
  direction: z.enum(['grant', 'deduct']),
  egp_amount: z.number().positive().optional(),
  points: z.number().int().positive().optional(),
  note: z.string().min(1, 'Note is required'),
});

const pointsSettingsSchema = z.object({
  points_earn_rate: z.number().min(0),
  points_redeem_rate: z.number().min(0),
});

// ──────────────────────────────────────────────
//  error handler
// ──────────────────────────────────────────────

function errorHandler(err, _req, res, _next) {
  const prod = process.env.NODE_ENV === 'production';
  const status = err.status || 500;

  res.status(status).json({
    error: {
      message: prod && status === 500 ? 'Internal server error' : err.message,
      code: err.code || 'INTERNAL_ERROR',
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

// ──────────────────────────────────────────────
//  app
// ──────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: frontendUrls, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ──────────────────────────────────────────────
//  AUTH
// ──────────────────────────────────────────────

async function login(req, res, next) {
  try {
    if (!requireDb(req, res)) return;

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
      return res.status(400).json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details } });
    }

    const { username, password } = parsed.data;

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, email, password_hash, role, is_active')
      .eq('username', username)
      .single();

    if (error || !admin) {
      return res.status(401).json({ error: { message: 'Invalid username or password', code: 'AUTH_FAILED' } });
    }

    if (!admin.is_active) {
      return res.status(403).json({ error: { message: 'Account deactivated', code: 'FORBIDDEN' } });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: { message: 'Invalid username or password', code: 'AUTH_FAILED' } });
    }

    const token = signToken({ id: admin.id, username: admin.username, role: admin.role, kind: 'admin' });

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await supabase.from('admins').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);

    res.json({ id: admin.id, username: admin.username, role: admin.role });
  } catch (err) {
    next(err);
  }
}

function logout(_req, res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
  res.json({ message: 'Logged out' });
}

async function me(req, res, next) {
  try {
    if (!requireDb(req, res)) return;

    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } });
    }

    const decoded = verifyToken(token);
    const { data: admin } = await supabase
      .from('admins')
      .select('id, username, email, role, is_active')
      .eq('id', decoded.id)
      .single();

    if (!admin || !admin.is_active) {
      res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
      return res.status(401).json({ error: { message: 'Admin not found or deactivated', code: 'UNAUTHORIZED' } });
    }

    res.json(admin);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
      return res.status(401).json({ error: { message: 'Invalid or expired session', code: 'UNAUTHORIZED' } });
    }
    next(err);
  }
}

app.post('/api/auth/login', authLimiter, login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', me);

// ──────────────────────────────────────────────
//  PRODUCTS
// ──────────────────────────────────────────────

async function listPublicProducts(req, res, next) {
  try {
    const {
      category,
      search,
      sort,
      featured,
      new: isNew,
      page = '1',
      limit = '20',
    } = req.query;

    let categoryId = undefined;

    if (category) {
      const { data: cat, error: catErr } = await getCategoryBySlug(category);
      if (catErr && catErr.code !== 'PGRST116') return next(catErr);
      if (!cat) {
        return res.json({
          data: [],
          meta: { page: 1, limit: Number(limit), total: 0, totalPages: 0 },
        });
      }
      categoryId = cat.id;
    }

    const filters = {
      is_active: true,
      category_id: categoryId,
      search: search || undefined,
      is_featured: featured === 'true' ? true : undefined,
      is_new_arrival: isNew === 'true' ? true : undefined,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
      sort: sort || 'newest',
    };

    const { data: rows, error, count } = await listProducts(filters);

    if (error) return next(error);

    res.json({
      data: (rows || []).map((r) => toCamelCase(r)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getPublicProduct(req, res, next) {
  try {
    const { slug } = req.params;

    const { data: product, error } = await getProductBySlug(slug);

    if (error || !product || !product.is_active) {
      return res.status(404).json({ error: { message: 'Product not found', code: 'NOT_FOUND' } });
    }

    incrementViewCount(product.id).catch(() => {});

    res.json(toCamelCase(product));
  } catch (err) {
    next(err);
  }
}

async function adminListProducts(req, res, next) {
  try {
    const {
      category,
      search,
      sort,
      featured,
      is_active,
      is_new_arrival,
      low_stock,
      out_of_stock,
      page = '1',
      limit = '20',
    } = req.query;

    const filters = {
      category_id: category || undefined,
      search: search || undefined,
      is_active:
        is_active === 'true' ? true : is_active === 'false' ? false : true,
      is_featured: featured === 'true' ? true : undefined,
      is_new_arrival: is_new_arrival === 'true' ? true : undefined,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
      sort: req.query.sort || 'newest',
    };

    let { data: rows, error, count } = await listProducts(filters);

    if (error) return next(error);

    rows = rows || [];

    if (low_stock === 'true') {
      rows = rows.filter(
        (p) => !p.unlimited_stock && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold,
      );
    }
    if (out_of_stock === 'true') {
      rows = rows.filter((p) => !p.unlimited_stock && p.stock_quantity === 0);
    }
    if (low_stock === 'true' || out_of_stock === 'true') {
      count = rows.length;
    }

    res.json({
      data: rows.map((r) => toCamelCase(r)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function adminGetProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { data: product, error } = await getProductById(id);

    if (error || !product) {
      return res.status(404).json({ error: { message: 'Product not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(product));
  } catch (err) {
    next(err);
  }
}

async function adminCreateProduct(req, res, next) {
  try {
    const { images, ...fields } = req.validatedBody;

    const { data: product, error } = await createProduct(fields);

    if (error) return next(error);

    if (images && images.length > 0) {
      const imageRows = images.map((img, idx) => ({
        product_id: product.id,
        image_url: img.image_url,
        sort_order: img.sort_order ?? idx,
      }));

      const { error: imgError } = await createProductImages(imageRows);
      if (imgError) return next(imgError);

      const { data: savedImages } = await getImagesByProductId(product.id);
      product.product_images = savedImages || [];
    }

    res.status(201).json(toCamelCase(product));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { images, ...fields } = req.validatedBody;

    const { data: product, error } = await updateProduct(id, fields);

    if (error) return next(error);
    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found', code: 'NOT_FOUND' } });
    }

    if (images !== undefined) {
      await deleteProductImagesByProductId(id);

      if (images.length > 0) {
        const imageRows = images.map((img, idx) => ({
          product_id: id,
          image_url: img.image_url,
          sort_order: img.sort_order ?? idx,
        }));
        await createProductImages(imageRows);
      }

      const { data: savedImages } = await getImagesByProductId(id);
      product.product_images = savedImages || [];
    }

    res.json(toCamelCase(product));
  } catch (err) {
    next(err);
  }
}

async function adminDeleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    const hardDelete = req.query.hard === 'true';

    if (hardDelete) {
      if (req.admin.role !== 'super_admin') {
        return res.status(403).json({
          error: { message: 'Hard delete requires super_admin role', code: 'FORBIDDEN' },
        });
      }

      const { count, error: countErr } = await getOrderItemCountByProductId(id);
      if (countErr) return next(countErr);

      if (count > 0) {
        return res.status(409).json({
          error: {
            message: `Cannot hard-delete: product is referenced by ${count} order(s). Set is_active=false instead.`,
            code: 'CONFLICT',
            details: { orderItemCount: count },
          },
        });
      }

      const { error: delErr } = await hardDeleteProduct(id);
      if (delErr) return next(delErr);

      return res.json({ message: 'Product permanently deleted' });
    }

    const { data: product, error } = await softDeleteProduct(id);

    if (error) return next(error);
    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found', code: 'NOT_FOUND' } });
    }

    res.json({ message: 'Product deactivated' });
  } catch (err) {
    next(err);
  }
}

async function adminToggleProduct(req, res, next) {
  try {
    const { id } = req.params;
    const { field, value } = req.body;

    const allowedFields = ['is_active', 'is_featured', 'is_new_arrival'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        error: {
          message: `Invalid toggle field: "${field}". Allowed: ${allowedFields.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (typeof value !== 'boolean') {
      return res.status(400).json({
        error: { message: 'Value must be a boolean', code: 'VALIDATION_ERROR' },
      });
    }

    const { data: product, error } = await updateProduct(id, { [field]: value });

    if (error) return next(error);
    if (!product) {
      return res.status(404).json({ error: { message: 'Product not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(product));
  } catch (err) {
    next(err);
  }
}

app.use('/api/products', publicGetLimiter());
app.get('/api/products', listPublicProducts);
app.get('/api/products/:slug', getPublicProduct);

app.use('/api/admin/products', requireAdmin);
app.get('/api/admin/products', adminListProducts);
app.get('/api/admin/products/:id', adminGetProduct);
app.post('/api/admin/products', validate(createProductSchema), adminCreateProduct);
app.put('/api/admin/products/:id', validate(updateProductSchema), adminUpdateProduct);
app.delete('/api/admin/products/:id', adminDeleteProduct);
app.patch('/api/admin/products/:id/toggle', adminToggleProduct);

// ──────────────────────────────────────────────
//  CATEGORIES
// ──────────────────────────────────────────────

async function listPublicCategories(_req, res, next) {
  try {
    const { data: rows, error } = await listCategories({ isActive: true });

    if (error) return next(error);

    res.json({ data: (rows || []).map((r) => toCamelCase(r)) });
  } catch (err) {
    next(err);
  }
}

async function adminListCategories(req, res, next) {
  try {
    const { is_active } = req.query;
    const filters = {};
    if (is_active === 'true') filters.isActive = true;
    else if (is_active === 'false') filters.isActive = false;

    const { data: rows, error } = await listCategories(filters);

    if (error) return next(error);

    const counts = {};
    if (rows?.length) {
      await Promise.all(
        rows.map(async (c) => {
          const { count, error: cErr } = await getProductCountByCategory(c.id);
          if (!cErr) counts[c.id] = count ?? 0;
        }),
      );
    }

    res.json({
      data: (rows || []).map((r) => toCamelCase({ ...r, product_count: counts[r.id] ?? 0 })),
    });
  } catch (err) {
    next(err);
  }
}

async function adminCreateCategory(req, res, next) {
  try {
    const { data: category, error } = await createCategory(req.validatedBody);

    if (error) return next(error);

    res.status(201).json(toCamelCase(category));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { data: category, error } = await updateCategory(id, req.validatedBody);

    if (error) return next(error);
    if (!category) {
      return res.status(404).json({ error: { message: 'Category not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(category));
  } catch (err) {
    next(err);
  }
}

async function adminDeleteCategory(req, res, next) {
  try {
    const { id } = req.params;

    const { count, error: countError } = await getProductCountByCategory(id);

    if (countError) return next(countError);

    if (count > 0) {
      return res.status(409).json({
        error: {
          message: `Cannot delete: ${count} product(s) are assigned to this category. Reassign them first.`,
          code: 'CONFLICT',
          details: { productCount: count },
        },
      });
    }

    const { error } = await deleteCategory(id);

    if (error) return next(error);

    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

async function adminGetCategory(req, res, next) {
  try {
    const { id } = req.params;
    const { data: category, error } = await getCategoryById(id);

    if (error || !category) {
      return res.status(404).json({ error: { message: 'Category not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(category));
  } catch (err) {
    next(err);
  }
}

app.use('/api/categories', publicGetLimiter());
app.get('/api/categories', listPublicCategories);

app.use('/api/admin/categories', requireAdmin);
app.get('/api/admin/categories', adminListCategories);
app.get('/api/admin/categories/:id', adminGetCategory);
app.post('/api/admin/categories', validate(categorySchema), adminCreateCategory);
app.put('/api/admin/categories/:id', validate(categorySchema), adminUpdateCategory);
app.delete('/api/admin/categories/:id', adminDeleteCategory);

// ──────────────────────────────────────────────
//  ORDERS
// ──────────────────────────────────────────────

async function submitOrder(req, res, next) {
  try {
    const validated = req.validatedBody;
    const { items, ...customerFields } = validated;

    const productIds = items.map((i) => i.product_id);
    const { data: products, error: productsError } = await getProductsWithImagesByIds(productIds);

    if (productsError) return next(productsError);

    const productMap = new Map(products.map((p) => [p.id, p]));
    const lineItems = [];

    for (const item of items) {
      const p = productMap.get(item.product_id);
      if (!p || !p.is_active) {
        return res.status(409).json({
          error: {
            message: `Product ${item.product_id} is no longer available`,
            code: 'STOCK_CONFLICT',
            items: [{ productId: item.product_id, error: 'PRODUCT_UNAVAILABLE' }],
          },
        });
      }
      const primaryImage = (p.product_images || []).sort((a, b) => a.sort_order - b.sort_order)[0];
      lineItems.push({
        product_id: p.id,
        quantity: item.quantity,
        unit_price_snapshot: Number(p.price),
        product_name_snapshot: p.name_en,
        product_image_snapshot: primaryImage?.image_url || null,
      });
    }

    const subtotal = lineItems.reduce((sum, i) => sum + i.unit_price_snapshot * i.quantity, 0);

    const { data: settings, error: settingsError } = await getSettings();
    if (settingsError) return next(settingsError);

    let shippingFee = Number(settings.default_shipping_fee) || 0;
    if (settings.free_shipping_threshold && subtotal >= Number(settings.free_shipping_threshold)) {
      shippingFee = 0;
    }
    const total = subtotal + shippingFee;

    // ── points redemption (docs/13 3.2 / 4) ───────────────────────────────
    // Only honored when a customer session is present. A guest sending
    // points_to_redeem > 0 is rejected here (the schema already accepted the
    // field but we don't honor it without an authenticated customer).
    const customerId = req.customer?.id || null;
    let pointsToRedeem = Number(validated.points_to_redeem || 0);
    let pointsDiscountEgp = 0;

    if (pointsToRedeem > 0) {
      if (!customerId) {
        return res.status(400).json({
          error: {
            message: 'Points redemption requires a logged-in customer account',
            code: 'VALIDATION_ERROR',
          },
        });
      }
      // No minimum redemption amount — any positive value is allowed.
      // (open item #1 in docs/13 §8, default per user instruction.)
      if (!Number.isInteger(pointsToRedeem) || pointsToRedeem < 0) {
        return res.status(400).json({
          error: { message: 'points_to_redeem must be a non-negative integer', code: 'VALIDATION_ERROR' },
        });
      }
      const redeemRate = Number(settings.points_redeem_rate ?? 0.1);
      if (redeemRate <= 0) {
        return res.status(400).json({
          error: {
            message: 'Points redemption is currently unavailable',
            code: 'REDEMPTION_DISABLED',
          },
        });
      }
      pointsDiscountEgp = Math.round(pointsToRedeem * redeemRate * 100) / 100;
      if (pointsDiscountEgp > total) {
        // Spec 3.2 explicitly allows a fully-points order (0 EGP due) for COD,
        // so cap the discount at the order total and redeem only the points
        // needed to cover it. Excess points stay in the customer's balance.
        const pointsNeeded = Math.ceil(total / redeemRate);
        pointsToRedeem = Math.min(pointsToRedeem, pointsNeeded);
        pointsDiscountEgp = total;
      }
    }

    // `total` below is the amount the customer actually owes — already
    // reduced by any points discount. Per spec 3.1, points are later EARNED
    // on this post-discount total (the floor(total * earn_rate) calculation).
    const totalAfterDiscount = Math.max(0, total - pointsDiscountEgp);

    const orderNumber = await generateOrderNumber();

    const orderParams = {
      orderNumber,
      ...customerFields,
      subtotal,
      shipping_fee: shippingFee,
      total: totalAfterDiscount,
      items: lineItems,
      ...(customerId ? { customer_id: customerId } : {}),
      points_to_redeem: pointsToRedeem,
      points_discount_egp: pointsDiscountEgp,
    };

    let order;
    try {
      const result = await createOrder(orderParams);
      order = result.data;
    } catch (err) {
      if (err.code === 'STOCK_CHECK_FAILED') {
        // Points-related failures are surfaced by the RPC (migration 017)
        // as specific exception messages; map each to a clear 4xx so the
        // frontend can distinguish them from a stock conflict.
        const msg = err.message || '';
        if (msg.includes('INSUFFICIENT_POINTS')) {
          return res.status(400).json({
            error: {
              message: 'Not enough points to redeem the requested amount',
              code: 'INSUFFICIENT_POINTS',
            },
          });
        }
        if (msg.includes('CUSTOMER_NOT_FOUND')) {
          return res.status(400).json({
            error: {
              message: 'Customer account not found',
              code: 'CUSTOMER_NOT_FOUND',
            },
          });
        }
        if (msg.includes('INVALID_REDEMPTION')) {
          return res.status(400).json({
            error: {
              message: 'Points redemption requires a logged-in customer account',
              code: 'INVALID_REDEMPTION',
            },
          });
        }
        const affectedItems = (err.details || []).map((d) => ({
          productId: d.product_id,
          error: d.error,
          available: d.available,
          requested: d.requested,
        }));
        return res.status(409).json({
          error: {
            message: 'Stock check failed for one or more items',
            code: 'STOCK_CONFLICT',
            items: affectedItems.length ? affectedItems : items.map((i) => ({ productId: i.product_id })),
          },
        });
      }
      throw err;
    }

    if (!order) return;

    if (order.email) {
      sendOrderEmail({
        email: order.email,
        order,
        items: order.items || [],
        status: order.status || 'pending',
      }).catch(() => {});
    }

    const { error: histError } = await createStatusHistoryEntry({
      order_id: order.id,
      status: 'pending',
      changed_by: null,
      note: null,
    });
    if (histError) console.error('Failed to write initial status history:', histError.message);

    res.status(201).json(toCamelCase({ ...order, items: order.items }));
  } catch (err) {
    next(err);
  }
}

async function trackOrder(req, res, next) {
  try {
    const { order_number, phone } = req.query;

    if (!order_number || !phone) {
      return res.status(400).json({
        error: {
          message: 'Both order_number and phone are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const { data: order, error } = await getOrderByNumberAndPhone(order_number, normalizePhone(phone));

    if (error || !order) {
      return res.status(404).json({ error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(order));
  } catch (err) {
    next(err);
  }
}

async function lookupOrders(req, res, next) {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        error: { message: 'Phone is required', code: 'VALIDATION_ERROR' },
      });
    }

    const { data: orders, error } = await getOrdersByPhone(normalizePhone(phone));

    if (error) return next(error);

    res.json({ data: (orders || []).map((o) => toCamelCase(o)) });
  } catch (err) {
    next(err);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: { message: 'Phone is required to cancel an order', code: 'VALIDATION_ERROR' },
      });
    }

    const { data: order, error } = await getOrderById(id);

    if (error || !order) {
      return res.status(404).json({ error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }

    if (order.phone !== normalizePhone(phone)) {
      return res.status(403).json({ error: { message: 'Phone does not match this order', code: 'FORBIDDEN' } });
    }

    if (order.status !== 'pending') {
      return res.status(409).json({
        error: {
          message: `Order cannot be cancelled in status "${order.status}"`,
          code: 'CONFLICT',
        },
      });
    }

    const { data: updated, error: updateError } = await updateOrderStatus(id, 'cancelled');
    if (updateError) return next(updateError);

    // Points: a pending order can have points_redeemed (redeemed at checkout)
    // but never points_earned (earned only on delivery), so only the
    // redeem-side refund applies here. (docs/13 §3.3)
    if (order.customer_id && Number(order.points_redeemed || 0) > 0) {
      await refundOrderRedeemedPoints(order, 'cancelled');
    }

    await createStatusHistoryEntry({
      order_id: id,
      status: 'cancelled',
      changed_by: null,
      note: 'Cancelled by customer',
    });

    res.json(toCamelCase(updated));
  } catch (err) {
    next(err);
  }
}

async function adminListOrders(req, res, next) {
  try {
    const { status, date_from, date_to, search, page = '1', limit = '20' } = req.query;

    const filters = {
      status: status || undefined,
      date_from: date_from || undefined,
      date_to: date_to || undefined,
      search: search ? normalizeSearchPhone(search) : undefined,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    };

    const { data: rows, error, count } = await listOrders(filters);

    if (error) return next(error);

    res.json({
      data: (rows || []).map((r) => toCamelCase(r)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function adminGetOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { data: order, error } = await getOrderById(id);

    if (error || !order) {
      return res.status(404).json({ error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(order));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note, estimated_delivery } = req.body;

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: {
          message: `Invalid status. Allowed: ${ORDER_STATUSES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (
      estimated_delivery !== undefined &&
      estimated_delivery !== null &&
      estimated_delivery !== '' &&
      !/^\d{4}-\d{2}-\d{2}$/.test(estimated_delivery)
    ) {
      return res.status(400).json({
        error: { message: 'estimated_delivery must be a YYYY-MM-DD date', code: 'VALIDATION_ERROR' },
      });
    }

    const { data: existing } = await getOrderById(id);
    if (!existing) {
      return res.status(404).json({ error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }

    const { data: updated, error } = await updateOrderStatus(
      id,
      status,
      estimated_delivery === '' ? null : estimated_delivery,
    );
    if (error) return next(error);

    // ── points lifecycle (docs/13-points-system.md §3) ──────────────────────
    // Earning: credited ONLY on a transition INTO delivered (not when an
    // already-delivered order is re-saved as delivered — that's a no-op
    // transition, and re-applying delivered shouldn't re-credit). The
    // `creditOrderEarnedPoints` helper additionally guards on
    // orders.points_earned = 0 for belt-and-braces idempotency.
    if (existing.status !== 'delivered' && status === 'delivered') {
      await creditOrderEarnedPoints(existing);
    }

    // Reversal: when moving INTO a terminal non-fulfilled status:
    //   1. points_redeemed > 0 → refund the redeemed points back
    //      (refund_reversal, positive ledger entry)
    //   2. points_earned > 0  → the order WAS delivered; the state machine
    //      here permits delivered → cancelled/returned (no transition guard
    //      in adminUpdateOrderStatus), so per the user's decision on
    //      docs/13 §3.3 open item #2 we DO reverse earned points via a
    //      negative manual_deduct-style ledger entry.
    if (status === 'cancelled' || status === 'returned') {
      if (existing.customer_id && Number(existing.points_redeemed || 0) > 0) {
        await refundOrderRedeemedPoints(existing, status);
      }
      if (existing.customer_id && Number(existing.points_earned || 0) > 0) {
        await reverseOrderEarnedPoints(existing, status);
      }
    }

    await createStatusHistoryEntry({
      order_id: id,
      status,
      changed_by: req.admin.id,
      note: note || null,
    });

    if (CANCEL_EMAIL_STATUSES.includes(status) && updated.email) {
      const { data: orderItems } = await getOrderById(id);
      sendOrderEmail({
        email: updated.email,
        order: updated,
        items: orderItems?.order_items || [],
        status,
      }).catch(() => {});
    }

    res.json(toCamelCase(updated));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateOrderNote(req, res, next) {
  try {
    const { id } = req.params;
    const { admin_note } = req.body;

    if (typeof admin_note !== 'string') {
      return res.status(400).json({
        error: { message: 'admin_note must be a string', code: 'VALIDATION_ERROR' },
      });
    }

    const { data: updated, error } = await updateOrderAdminNote(id, admin_note);
    if (error) return next(error);
    if (!updated) {
      return res.status(404).json({ error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(updated));
  } catch (err) {
    next(err);
  }
}

app.use('/api/orders', orderLimiter);
app.post('/api/orders', optionalCustomer, validate(createOrderSchema), submitOrder);
app.get('/api/orders/track', trackingLimiter, trackOrder);
app.get('/api/orders/lookup', trackingLimiter, lookupOrders);
app.patch('/api/orders/:id/cancel', cancelOrder);

app.use('/api/admin/orders', requireAdmin);
app.get('/api/admin/orders', adminListOrders);
app.get('/api/admin/orders/:id', adminGetOrder);
app.patch('/api/admin/orders/:id/status', adminUpdateOrderStatus);
app.patch('/api/admin/orders/:id/note', adminUpdateOrderNote);

// ──────────────────────────────────────────────
//  CUSTOMERS
// ──────────────────────────────────────────────

async function adminListCustomers(req, res, next) {
  try {
    const { search = '', page = '1', limit = '20' } = req.query;
    const { data, error, count } = await listCustomerDirectory({
      search: normalizeSearchPhone(search),
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    });

    if (error) return next(error);

    res.json({
      data: (data || []).map((r) => toCamelCase(r)),
      meta: {
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / (Math.min(100, Math.max(1, parseInt(limit, 10) || 20)))),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function adminGetCustomer(req, res, next) {
  try {
    const { data: customer, error } = await getCustomerById(req.params.id);

    if (error || !customer) {
      return res.status(404).json({ error: { message: 'Customer not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(customer));
  } catch (err) {
    next(err);
  }
}

async function adminGetCustomerPointsHistory(req, res, next) {
  try {
    const { page = '1', limit = '20' } = req.query;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const { data, error, count } = await listPointsTransactionsByCustomer(req.params.id, {
      page: p,
      limit: l,
    });

    if (error) return next(error);

    res.json({
      data: (data || []).map((r) => toCamelCase(r)),
      meta: {
        page: p,
        limit: l,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / l),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function adminCreateCustomerAccount(req, res, next) {
  try {
    const { name, phone } = req.validatedBody;

    const { data: customer, error } = await createCustomer({ name, phone });

    if (error) {
      // unique phone index (migration 016) — same 409 pattern as customerRegister
      if (error.code === '23505') {
        return res.status(409).json({
          error: { message: 'An account already exists for this phone number', code: 'CONFLICT' },
        });
      }
      return next(error);
    }

    res.status(201).json(toCamelCase(customer));
  } catch (err) {
    next(err);
  }
}

async function adminAdjustCustomerPoints(req, res, next) {
  try {
    const { direction, egp_amount, points, note } = req.validatedBody;
    const customerId = req.params.id;

    const { data: customer, error: findErr } = await getCustomerById(customerId);

    if (findErr || !customer) {
      return res.status(404).json({ error: { message: 'Customer not found', code: 'NOT_FOUND' } });
    }

    let signedPoints;
    let type;

    if (direction === 'grant') {
      // Spec §6: admin enters the EGP amount spent in-store; conversion always
      // goes through points_earn_rate (floor), exactly like online orders.
      if (egp_amount == null) {
        return res.status(400).json({
          error: { message: 'egp_amount is required for a grant', code: 'VALIDATION_ERROR' },
        });
      }
      const rate = await getPointsEarnRate();
      signedPoints = Math.floor(egp_amount * rate);
      type = 'manual_grant';
      if (signedPoints <= 0) {
        return res.status(400).json({
          error: { message: 'Grant amount converts to 0 points', code: 'VALIDATION_ERROR' },
        });
      }
    } else {
      if (points == null) {
        return res.status(400).json({
          error: { message: 'points is required for a deduction', code: 'VALIDATION_ERROR' },
        });
      }
      // Balance floor: a manual deduction must never push the balance negative
      // (the ledger trigger has no guard of its own — user decision on §6.5).
      if (points > Number(customer.points_balance || 0)) {
        return res.status(422).json({
          error: { message: 'Deduction exceeds the customer balance', code: 'INSUFFICIENT_POINTS' },
        });
      }
      signedPoints = -points;
      type = 'manual_deduct';
    }

    const { data: transaction, error: txErr } = await createPointsTransaction({
      customer_id: customerId,
      order_id: null,
      type,
      points: signedPoints,
      note,
      created_by_admin_id: req.admin.id,
    });

    if (txErr) return next(txErr);

    const { data: updated } = await getCustomerById(customerId);

    res.status(201).json({
      transaction: toCamelCase(transaction),
      customer: toCamelCase(updated),
    });
  } catch (err) {
    next(err);
  }
}

app.use('/api/admin/customers', requireAdmin);
app.get('/api/admin/customers', adminListCustomers);
app.get('/api/admin/customers/:id', adminGetCustomer);
app.get('/api/admin/customers/:id/points-history', adminGetCustomerPointsHistory);
app.post('/api/admin/customers', validate(adminCreateCustomerSchema), adminCreateCustomerAccount);
app.post('/api/admin/customers/:id/points-adjust', validate(pointsAdjustSchema), adminAdjustCustomerPoints);

// ──────────────────────────────────────────────────────────────
//  CUSTOMER AUTH + ACCOUNT (docs/13-points-system.md §5.1)
//  Fully separate from admin auth: separate JWT (kind: 'customer'),
//  separate httpOnly cookie (bg_customer_token), separate middleware.
// ──────────────────────────────────────────────────────────────

async function customerRegister(req, res, next) {
  try {
    const { name, phone, password, email } = req.validatedBody;

    const { data: existing, error: findErr } = await getCustomerByPhone(phone);

    if (findErr && findErr.code !== 'PGRST116') return next(findErr);

    if (existing) {
      // Claim flow (docs/13 §2.1 / §5.1): a customer created via in-store
      // admin grant (password_hash NULL) can claim their account online by
      // registering with the same phone. If they already have a password,
      // it's a plain duplicate-registration error.
      if (existing.password_hash) {
        return res.status(409).json({
          error: { message: 'An account already exists for this phone number', code: 'CONFLICT' },
        });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const { data: claimed, error: claimErr } = await setCustomerPasswordByPhone(phone, passwordHash);
      if (claimErr) return next(claimErr);

      const token = signToken({ id: claimed.id, kind: 'customer' });
      res.cookie(CUSTOMER_COOKIE, token, CUSTOMER_COOKIE_OPTIONS);
      return res.status(201).json({
        id: claimed.id,
        name: claimed.name,
        phone: claimed.phone,
        email: claimed.email || null,
        points_balance: claimed.points_balance ?? 0,
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { data: customer, error: createErr } = await createCustomer({
      name,
      phone,
      email: email || null,
      password_hash: passwordHash,
    });

    if (createErr) return next(createErr);

    const token = signToken({ id: customer.id, kind: 'customer' });
    res.cookie(CUSTOMER_COOKIE, token, CUSTOMER_COOKIE_OPTIONS);

    res.status(201).json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      points_balance: customer.points_balance ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

async function customerLogin(req, res, next) {
  try {
    const { phone, password } = req.validatedBody;

    const { data: customer, error } = await getCustomerByPhone(phone);

    if (error || !customer || !customer.password_hash) {
      return res.status(401).json({ error: { message: 'Invalid phone or password', code: 'AUTH_FAILED' } });
    }

    const valid = await bcrypt.compare(password, customer.password_hash);
    if (!valid) {
      return res.status(401).json({ error: { message: 'Invalid phone or password', code: 'AUTH_FAILED' } });
    }

    const token = signToken({ id: customer.id, kind: 'customer' });
    res.cookie(CUSTOMER_COOKIE, token, CUSTOMER_COOKIE_OPTIONS);

    res.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      points_balance: customer.points_balance ?? 0,
    });
  } catch (err) {
    next(err);
  }
}

function customerLogout(_req, res) {
  res.clearCookie(CUSTOMER_COOKIE, CUSTOMER_COOKIE_OPTIONS);
  res.json({ message: 'Logged out' });
}

async function customerMe(req, res, next) {
  try {
    const { data: customer, error } = await getCustomerById(req.customer.id);

    if (error || !customer) {
      res.clearCookie(CUSTOMER_COOKIE, CUSTOMER_COOKIE_OPTIONS);
      return res.status(401).json({ error: { message: 'Customer not found', code: 'UNAUTHORIZED' } });
    }

    res.json(toCamelCase(customer));
  } catch (err) {
    next(err);
  }
}

async function customerPointsHistory(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const { data: rows, error, count } = await listPointsTransactionsByCustomer(req.customer.id, { page, limit });

    if (error) return next(error);

    res.json({
      data: (rows || []).map((r) => toCamelCase(r)),
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function customerOrders(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

    const { data: rows, error, count } = await listOrdersByCustomer(req.customer.id, { page, limit });

    if (error) return next(error);

    res.json({
      data: (rows || []).map((o) => toCamelCase(o)),
      meta: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function customerUpdateProfile(req, res, next) {
  try {
    const { name, email } = req.validatedBody;

    const fields = {};
    if (name !== undefined) fields.name = name;
    if (email !== undefined) fields.email = email === '' ? null : email;

    const { data: customer, error } = await updateCustomer(req.customer.id, fields);

    if (error || !customer) {
      return next(error || new Error('Customer not found'));
    }

    res.json(toCamelCase(customer));
  } catch (err) {
    next(err);
  }
}

async function customerChangePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.validatedBody;

    // Full row (incl. password_hash) keyed by the session's customer id.
    const { data: customer, error } = await getCustomerAuthById(req.customer.id);
    if (error || !customer || !customer.password_hash) {
      return res.status(401).json({
        error: { message: 'Current password is incorrect', code: 'WRONG_PASSWORD' },
      });
    }

    const valid = await bcrypt.compare(current_password, customer.password_hash);
    if (!valid) {
      return res.status(401).json({
        error: { message: 'Current password is incorrect', code: 'WRONG_PASSWORD' },
      });
    }

    const passwordHash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    const { error: updateErr } = await updateCustomerPassword(req.customer.id, passwordHash);
    if (updateErr) return next(updateErr);

    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

app.post('/api/customers/register', authLimiter, validate(customerRegisterSchema), customerRegister);
app.post('/api/customers/login', authLimiter, validate(customerLoginSchema), customerLogin);
app.post('/api/customers/logout', customerLogout);
app.get('/api/customers/me', requireCustomer, customerMe);
app.get('/api/customers/me/points-history', requireCustomer, customerPointsHistory);
app.get('/api/customers/me/orders', requireCustomer, customerOrders);
app.patch('/api/customers/me', requireCustomer, validate(customerProfileUpdateSchema), customerUpdateProfile);
app.put('/api/customers/me/password', requireCustomer, validate(customerPasswordSchema), customerChangePassword);

// ──────────────────────────────────────────────
//  BANNERS
// ──────────────────────────────────────────────

async function listPublicBanners(req, res, next) {
  try {
    const { position } = req.query;
    const { data: rows, error } = await listBanners({
      position: position || undefined,
      is_active: true,
    });

    if (error) return next(error);

    res.json({ data: (rows || []).map((r) => toCamelCase(r)) });
  } catch (err) {
    next(err);
  }
}

async function adminListBanners(req, res, next) {
  try {
    const { position, is_active } = req.query;
    const filters = { position: position || undefined };
    if (is_active === 'true') filters.is_active = true;
    else if (is_active === 'false') filters.is_active = false;

    const { data: rows, error } = await listBanners(filters);

    if (error) return next(error);

    res.json({ data: (rows || []).map((r) => toCamelCase(r)) });
  } catch (err) {
    next(err);
  }
}

async function adminGetBanner(req, res, next) {
  try {
    const { id } = req.params;
    const { data: banner, error } = await getBannerById(id);

    if (error || !banner) {
      return res.status(404).json({ error: { message: 'Banner not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(banner));
  } catch (err) {
    next(err);
  }
}

async function adminCreateBanner(req, res, next) {
  try {
    const { data: banner, error } = await createBanner(req.validatedBody);

    if (error) return next(error);

    res.status(201).json(toCamelCase(banner));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateBanner(req, res, next) {
  try {
    const { id } = req.params;
    const { data: banner, error } = await updateBanner(id, req.validatedBody);

    if (error) return next(error);
    if (!banner) {
      return res.status(404).json({ error: { message: 'Banner not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(banner));
  } catch (err) {
    next(err);
  }
}

async function adminDeleteBanner(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await deleteBanner(id);

    if (error) return next(error);

    res.json({ message: 'Banner deleted' });
  } catch (err) {
    next(err);
  }
}

app.use('/api/banners', publicGetLimiter());
app.get('/api/banners', listPublicBanners);

app.use('/api/admin/banners', requireAdmin);
app.get('/api/admin/banners', adminListBanners);
app.get('/api/admin/banners/:id', adminGetBanner);
app.post('/api/admin/banners', validate(bannerSchema), adminCreateBanner);
app.put('/api/admin/banners/:id', validate(bannerSchema.partial()), adminUpdateBanner);
app.delete('/api/admin/banners/:id', adminDeleteBanner);

// ──────────────────────────────────────────────
//  SETTINGS
// ──────────────────────────────────────────────

async function getPublicSettings(_req, res, next) {
  try {
    const { data: settings, error } = await getSettings();

    if (error) return next(error);
    if (!settings) {
      return res.status(404).json({ error: { message: 'Settings not configured', code: 'NOT_FOUND' } });
    }

    const filtered = {};
    for (const key of PUBLIC_SETTINGS_FIELDS) {
      filtered[key] = settings[key];
    }

    res.json(toCamelCase(filtered));
  } catch (err) {
    next(err);
  }
}

async function adminGetSettings(_req, res, next) {
  try {
    const { data: settings, error } = await getSettings();

    if (error) return next(error);
    if (!settings) {
      return res.status(404).json({ error: { message: 'Settings not configured', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(settings));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateSettings(req, res, next) {
  try {
    let data = { ...req.validatedBody };

    if (req.admin.role !== 'super_admin') {
      const { default_shipping_fee, currency_code, ...rest } = data;
      data = rest;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: { message: 'No settings provided to update', code: 'VALIDATION_ERROR' },
      });
    }

    const { data: settings, error } = await upsertSettings(data);

    if (error) return next(error);

    res.json(toCamelCase(settings));
  } catch (err) {
    next(err);
  }
}

app.use('/api/settings', publicGetLimiter());
app.get('/api/settings', getPublicSettings);

app.use('/api/admin/settings', requireAdmin);
app.get('/api/admin/settings', adminGetSettings);
app.put('/api/admin/settings', validate(settingsSchema), adminUpdateSettings);

async function adminUpdatePointsSettings(req, res, next) {
  try {
    const { data: settings, error } = await upsertSettings(req.validatedBody);

    if (error) return next(error);

    res.json(toCamelCase(settings));
  } catch (err) {
    next(err);
  }
}

app.put('/api/admin/settings/points', validate(pointsSettingsSchema), adminUpdatePointsSettings);

// ──────────────────────────────────────────────
//  SUPPORT (complaints + returns)
// ──────────────────────────────────────────────

async function submitComplaint(req, res, next) {
  try {
    const { data: complaint, error } = await createComplaint(req.validatedBody);

    if (error) return next(error);

    res.status(201).json(toCamelCase(complaint));
  } catch (err) {
    next(err);
  }
}

async function adminListComplaints(req, res, next) {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filters = {
      status: status || undefined,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    };

    const { data: rows, error, count } = await listComplaints(filters);

    if (error) return next(error);

    res.json({
      data: (rows || []).map((r) => toCamelCase(r)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function adminGetComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { data: complaint, error } = await getComplaintById(id);

    if (error || !complaint) {
      return res.status(404).json({ error: { message: 'Complaint not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(complaint));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const body = { ...req.validatedBody };

    if (body.status && !COMPLAINT_STATUSES.includes(body.status)) {
      return res.status(400).json({
        error: {
          message: `Invalid status. Allowed: ${COMPLAINT_STATUSES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const { data: complaint, error } = await updateComplaint(id, body);

    if (error) return next(error);
    if (!complaint) {
      return res.status(404).json({ error: { message: 'Complaint not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(complaint));
  } catch (err) {
    next(err);
  }
}

async function adminDeleteComplaint(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await deleteComplaint(id);

    if (error) return next(error);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function submitReturnRequest(req, res, next) {
  try {
    const { order_number, phone, reason } = req.validatedBody;

    if (!order_number || !phone || !reason) {
      return res.status(400).json({
        error: {
          message: 'order_number, phone, and reason are required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const { data: order, error: orderErr } = await getOrderByNumberAndPhone(order_number, phone);
    if (orderErr || !order) {
      return res.status(404).json({
        error: { message: 'No order found with that number and phone', code: 'NOT_FOUND' },
      });
    }

    if (order.status !== 'delivered') {
      return res.status(409).json({
        error: {
          message: `Returns are only allowed for delivered orders (current: ${order.status})`,
          code: 'CONFLICT',
        },
      });
    }

    const { data: ret, error } = await createReturnRequest({
      order_id: order.id,
      reason,
    });

    if (error) return next(error);

    res.status(201).json(toCamelCase(ret));
  } catch (err) {
    next(err);
  }
}

async function adminListReturnRequests(req, res, next) {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filters = {
      status: status || undefined,
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    };

    const { data: rows, error, count } = await listReturnRequests(filters);

    if (error) return next(error);

    res.json({
      data: (rows || []).map((r) => toCamelCase(r)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function adminGetReturnRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { data: ret, error } = await getReturnRequestById(id);

    if (error || !ret) {
      return res.status(404).json({ error: { message: 'Return request not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(ret));
  } catch (err) {
    next(err);
  }
}

async function adminUpdateReturnRequest(req, res, next) {
  try {
    const { id } = req.params;
    const body = { ...req.validatedBody };

    if (body.status && !RETURN_STATUSES.includes(body.status)) {
      return res.status(400).json({
        error: {
          message: `Invalid status. Allowed: ${RETURN_STATUSES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const { data: ret, error } = await updateReturnRequest(id, body);

    if (error) return next(error);
    if (!ret) {
      return res.status(404).json({ error: { message: 'Return request not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(ret));
  } catch (err) {
    next(err);
  }
}

async function adminDeleteReturnRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { error } = await deleteReturnRequest(id);

    if (error) return next(error);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

app.use('/api/support', trackingLimiter);
app.post('/api/support/complaints', validate(complaintSchema), submitComplaint);
app.post('/api/support/returns', validate(returnRequestSchema), submitReturnRequest);

app.use('/api/admin/support', requireAdmin);
app.get('/api/admin/support/complaints', adminListComplaints);
app.get('/api/admin/support/complaints/:id', adminGetComplaint);
app.patch('/api/admin/support/complaints/:id', validate(updateComplaintSchema), adminUpdateComplaint);
app.delete('/api/admin/support/complaints/:id', adminDeleteComplaint);
app.get('/api/admin/support/returns', adminListReturnRequests);
app.get('/api/admin/support/returns/:id', adminGetReturnRequest);
app.patch('/api/admin/support/returns/:id', validate(updateReturnRequestSchema), adminUpdateReturnRequest);
app.delete('/api/admin/support/returns/:id', adminDeleteReturnRequest);

// ──────────────────────────────────────────────
//  ADMINS (super admin only)
// ──────────────────────────────────────────────

async function listAdminUsers(req, res, next) {
  try {
    const { page = '1', limit = '20' } = req.query;
    const { data: rows, error } = await listAdmins({
      page: Math.max(1, parseInt(page, 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 20)),
    });

    if (error) return next(error);

    res.json({ data: (rows || []).map((r) => toCamelCase(r, ['password_hash'])) });
  } catch (err) {
    next(err);
  }
}

async function getAdminUser(req, res, next) {
  try {
    const { id } = req.params;
    const { data: admin, error } = await getAdminById(id);

    if (error || !admin) {
      return res.status(404).json({ error: { message: 'Admin not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(admin, ['password_hash']));
  } catch (err) {
    next(err);
  }
}

async function createAdminUser(req, res, next) {
  try {
    const { password, ...rest } = req.validatedBody;
    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { data: admin, error } = await createAdmin({ ...rest, password_hash });

    if (error) return next(error);

    res.status(201).json(toCamelCase(admin, ['password_hash']));
  } catch (err) {
    next(err);
  }
}

async function updateAdminUser(req, res, next) {
  try {
    const { id } = req.params;
    const body = { ...req.validatedBody };

    if (body.password) {
      body.password_hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
      delete body.password;
    }

    const { data: admin, error } = await updateAdmin(id, body);

    if (error) return next(error);
    if (!admin) {
      return res.status(404).json({ error: { message: 'Admin not found', code: 'NOT_FOUND' } });
    }

    res.json(toCamelCase(admin, ['password_hash']));
  } catch (err) {
    next(err);
  }
}

async function deleteAdminUser(req, res, next) {
  try {
    const { id } = req.params;

    if (req.admin.id === id) {
      return res.status(409).json({
        error: { message: 'Cannot delete your own account', code: 'CONFLICT' },
      });
    }

    const { data: target, error: fetchErr } = await getAdminById(id);
    if (fetchErr || !target) {
      return res.status(404).json({ error: { message: 'Admin not found', code: 'NOT_FOUND' } });
    }

    if (target.role === 'super_admin' && target.is_active) {
      const { data: rows } = await listAdmins({});
      const activeSuperAdmins = (rows || []).filter((a) => a.role === 'super_admin' && a.is_active);

      if (activeSuperAdmins.length <= 1) {
        return res.status(409).json({
          error: {
            message: 'Cannot delete the last active super_admin',
            code: 'CONFLICT',
          },
        });
      }
    }

    const { error } = await deleteAdmin(id);
    if (error) return next(error);

    res.json({ message: 'Admin deleted' });
  } catch (err) {
    next(err);
  }
}

app.use('/api/admin/admins', requireSuperAdmin);
app.get('/api/admin/admins', listAdminUsers);
app.get('/api/admin/admins/:id', getAdminUser);
app.post('/api/admin/admins', validate(createAdminSchema), createAdminUser);
app.put('/api/admin/admins/:id', validate(updateAdminSchema), updateAdminUser);
app.delete('/api/admin/admins/:id', deleteAdminUser);

// ──────────────────────────────────────────────
//  ANALYTICS
// ──────────────────────────────────────────────

async function getOverview(_req, res, next) {
  try {
    const [orders, revenue, pending, products, lowStock] = await Promise.all([
      getOrderCount(),
      getDeliveredOrderTotals(),
      getOrderCount({ status: 'pending' }),
      getProductCount(),
      getActiveProducts(),
    ]);

    if (orders.error) return next(orders.error);
    if (revenue.error) return next(revenue.error);
    if (pending.error) return next(pending.error);
    if (products.error) return next(products.error);
    if (lowStock.error) return next(lowStock.error);

    const revenueTotal = (revenue.data || []).reduce((sum, o) => sum + Number(o.total), 0);
    const lowStockCount = (lowStock.data || []).filter(
      (p) => !p.unlimited_stock && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold,
    ).length;
    const outOfStockCount = (lowStock.data || []).filter(
      (p) => !p.unlimited_stock && p.stock_quantity === 0,
    ).length;

    res.json({
      total_orders: orders.count || 0,
      total_revenue: revenueTotal,
      pending_orders: pending.count || 0,
      total_products: products.count || 0,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
    });
  } catch (err) {
    next(err);
  }
}

async function getAnalyticsSummaryHandler(req, res, next) {
  try {
    const period = mapPeriod(req.query.period);
    const days = daysForPeriod(period);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    const { data, error } = await getAnalyticsSummary(startDate.toISOString());
    if (error) return next(error);
    res.json({ period, data });
  } catch (err) {
    next(err);
  }
}

async function getSales(req, res, next) {
  try {
    const period = mapPeriod(req.query.period);
    const days = daysForPeriod(period);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    const startDateIso = startDate.toISOString();

    const { data: rows, error } = await getOrdersSince(startDateIso);

    if (error) return next(error);

    const buckets = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (days - 1 - i));
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, orderCount: 0, revenue: 0 };
    }

    for (const o of rows || []) {
      const key = (o.created_at || '').slice(0, 10);
      if (!buckets[key]) continue;
      buckets[key].orderCount += 1;
      if (o.status === 'delivered') {
        buckets[key].revenue += Number(o.total);
      }
    }

    res.json({
      period,
      data: Object.values(buckets),
    });
  } catch (err) {
    next(err);
  }
}

async function getTopProducts(req, res, next) {
  try {
    const period = mapPeriod(req.query.period);
    const days = daysForPeriod(period);
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - days);
    const startDateIso = startDate.toISOString();

    const { data: items, error } = await getItemsWithOrdersSince(startDateIso);

    if (error) return next(error);

    const agg = {};
    for (const row of items || []) {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      if (!order) continue;
      const status = order.status;
      if (status === 'cancelled' || status === 'returned') continue;

      const oid = row.product_id || 'unknown';
      if (!agg[oid]) agg[oid] = { productId: oid, quantitySold: 0 };
      agg[oid].quantitySold += row.quantity;
    }

    const top = Object.values(agg)
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    if (top.length > 0) {
      const productIds = top
        .map((t) => t.productId)
        .filter((id) => id !== 'unknown');
      if (productIds.length > 0) {
        const { data: products } = await getProductsByIds(productIds, 'id, name_en, name_ar, slug');
        const pmap = new Map((products || []).map((p) => [p.id, p]));
        for (const t of top) {
          const p = pmap.get(t.productId);
          t.nameEn = p?.name_en;
          t.nameAr = p?.name_ar;
          t.slug = p?.slug;
        }
      }
    }

    res.json({ period, data: top });
  } catch (err) {
    next(err);
  }
}

app.use('/api/admin/analytics', requireAdmin);

app.get('/api/admin/analytics', getAnalyticsSummaryHandler);
app.get('/api/admin/analytics/overview', getOverview);
app.get('/api/admin/analytics/sales', getSales);
app.get('/api/admin/analytics/top-products', getTopProducts);

// ──────────────────────────────────────────────
//  boot
// ──────────────────────────────────────────────

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

export default app;

