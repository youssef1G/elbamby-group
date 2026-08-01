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
  createReturnRequest,
  listReturnRequests,
  getReturnRequestById,
  updateReturnRequest,
} from './db.js';
import { signToken, verifyToken, requireAdmin, requireSuperAdmin } from './auth.js';
import { sendOrderConfirmation } from './email.js';

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
const publicGetLimiter = rateLimit({ windowMs, max: 100, standardHeaders: true, legacyHeaders: false, message: { error: { message: 'Too many requests, please wait', code: 'RATE_LIMITED' } } });

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

const phoneRegex = /^01[0-2,5]\d{8}$/;

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
  phone: z.string().regex(phoneRegex, 'Invalid Egyptian phone number'),
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
  phone: z.string().regex(phoneRegex, 'Invalid Egyptian phone number'),
  alt_phone: z.string().regex(phoneRegex, 'Invalid Egyptian phone number').optional(),
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
});

const createProductSchema = z.object({
  sku: z.string().optional(),
  name_en: z.string().min(1, 'Name (English) is required'),
  name_ar: z.string().min(1, 'Name (Arabic) is required'),
  slug: z.string().min(1, 'Slug is required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  category_id: z.string().uuid('Invalid category'),
  price: z.number().positive('Price must be positive'),
  compare_at_price: z.number().positive().optional(),
  stock_quantity: z.number().int().min(0, 'Stock cannot be negative'),
  low_stock_threshold: z.number().int().min(0).default(5),
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
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
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

    const token = signToken({ id: admin.id, username: admin.username, role: admin.role });

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
        is_active === 'true' ? true : is_active === 'false' ? false : undefined,
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
      rows = rows.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold);
    }
    if (out_of_stock === 'true') {
      rows = rows.filter((p) => p.stock_quantity === 0);
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

app.use('/api/products', publicGetLimiter);
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

    res.json({ data: (rows || []).map((r) => toCamelCase(r)) });
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

app.use('/api/categories', publicGetLimiter);
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

    const orderNumber = await generateOrderNumber();

    const orderParams = {
      orderNumber,
      ...customerFields,
      subtotal,
      shipping_fee: shippingFee,
      total,
      items: lineItems,
    };

    let order;
    try {
      const result = await createOrder(orderParams);
      order = result.data;
    } catch (err) {
      if (err.code === 'STOCK_CHECK_FAILED') {
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
      sendOrderConfirmation({
        email: order.email,
        orderNumber: order.order_number,
        customerName: order.customer_name,
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

    const { data: order, error } = await getOrderByNumberAndPhone(order_number, phone);

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

    const { data: orders, error } = await getOrdersByPhone(phone);

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

    if (order.phone !== phone) {
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
      search: search || undefined,
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
    const { status, note } = req.body;

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: {
          message: `Invalid status. Allowed: ${ORDER_STATUSES.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const { data: existing } = await getOrderById(id);
    if (!existing) {
      return res.status(404).json({ error: { message: 'Order not found', code: 'NOT_FOUND' } });
    }

    const { data: updated, error } = await updateOrderStatus(id, status);
    if (error) return next(error);

    await createStatusHistoryEntry({
      order_id: id,
      status,
      changed_by: req.admin.id,
      note: note || null,
    });

    if (CANCEL_EMAIL_STATUSES.includes(status) && updated.email) {
      sendOrderConfirmation({
        email: updated.email,
        orderNumber: updated.order_number,
        customerName: updated.customer_name,
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
app.post('/api/orders', validate(createOrderSchema), submitOrder);
app.get('/api/orders/track', trackingLimiter, trackOrder);
app.get('/api/orders/lookup', trackingLimiter, lookupOrders);
app.patch('/api/orders/:id/cancel', cancelOrder);

app.use('/api/admin/orders', requireAdmin);
app.get('/api/admin/orders', adminListOrders);
app.get('/api/admin/orders/:id', adminGetOrder);
app.patch('/api/admin/orders/:id/status', adminUpdateOrderStatus);
app.patch('/api/admin/orders/:id/note', adminUpdateOrderNote);

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

app.use('/api/banners', publicGetLimiter);
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

app.use('/api/settings', publicGetLimiter);
app.get('/api/settings', getPublicSettings);

app.use('/api/admin/settings', requireAdmin);
app.get('/api/admin/settings', adminGetSettings);
app.put('/api/admin/settings', validate(settingsSchema), adminUpdateSettings);

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

app.use('/api/support', trackingLimiter);
app.post('/api/support/complaints', validate(complaintSchema), submitComplaint);
app.post('/api/support/returns', validate(returnRequestSchema), submitReturnRequest);

app.use('/api/admin/support', requireAdmin);
app.get('/api/admin/support/complaints', adminListComplaints);
app.get('/api/admin/support/complaints/:id', adminGetComplaint);
app.patch('/api/admin/support/complaints/:id', validate(updateComplaintSchema), adminUpdateComplaint);
app.get('/api/admin/support/returns', adminListReturnRequests);
app.get('/api/admin/support/returns/:id', adminGetReturnRequest);
app.patch('/api/admin/support/returns/:id', validate(updateReturnRequestSchema), adminUpdateReturnRequest);

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
    const [orders, revenue, pending, lowStock] = await Promise.all([
      getOrderCount(),
      getDeliveredOrderTotals(),
      getOrderCount({ status: 'pending' }),
      getActiveProducts(),
    ]);

    if (orders.error) return next(orders.error);
    if (revenue.error) return next(revenue.error);
    if (pending.error) return next(pending.error);
    if (lowStock.error) return next(lowStock.error);

    const revenueTotal = (revenue.data || []).reduce((sum, o) => sum + Number(o.total), 0);
    const lowStockCount = (lowStock.data || []).filter(
      (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold,
    ).length;

    res.json({
      totalOrders: orders.count || 0,
      totalRevenue: revenueTotal,
      pendingOrders: pending.count || 0,
      lowStockCount,
    });
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
