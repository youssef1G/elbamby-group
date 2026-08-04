import { createClient } from '@supabase/supabase-js';

// ──────────────────────────────────────────────
//  Supabase client (service role — server only)
// ──────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — queries will fail until set');
}

export const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

const TABLE = {
  ADMINS: 'admins',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  PRODUCT_IMAGES: 'product_images',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  BANNERS: 'banners',
  SETTINGS: 'settings',
  ORDER_STATUS_HISTORY: 'order_status_history',
  COMPLAINTS: 'complaints',
  RETURN_REQUESTS: 'return_requests',
  CUSTOMERS: 'customers',
  POINTS_TRANSACTIONS: 'points_transactions',
};

const _from = (table) => {
  if (!supabase) throw new Error('Supabase client not initialised');
  return supabase.from(table);
};

const _rpc = (...args) => {
  if (!supabase) throw new Error('Supabase client not initialised');
  return supabase.rpc(...args);
};

// ──────────────────────────────────────────────
//  case mapper
// ──────────────────────────────────────────────

function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function isPlainObject(val) {
  return val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date);
}

/**
 * Deeply converts all object keys from snake_case to camelCase.
 *
 * @param {*} obj        The value to transform (object, array, primitive).
 * @param {string[]} [dropKeys]  Optional list of keys to omit from the output.
 * @returns {*}          The transformed value.
 */
export function toCamelCase(obj, dropKeys = []) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => toCamelCase(item, dropKeys));
  if (!isPlainObject(obj)) return obj;

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (dropKeys.includes(key)) continue;
    result[snakeToCamel(key)] = toCamelCase(value, dropKeys);
  }
  return result;
}

// ──────────────────────────────────────────────
//  helpers
// ──────────────────────────────────────────────

function paginate(query, { page = 1, limit = 20 } = {}) {
  const from = (page - 1) * limit;
  return query.range(from, from + limit - 1);
}

// ──────────────────────────────────────────────
//  ADMINS
// ──────────────────────────────────────────────

export async function getAdminById(id) {
  return _from(TABLE.ADMINS).select('*').eq('id', id).single();
}

export async function listAdmins({ page, limit } = {}) {
  let q = _from(TABLE.ADMINS).select('*', { count: 'exact' }).order('created_at', { ascending: false });
  return paginate(q, { page, limit });
}

export async function createAdmin(data) {
  return _from(TABLE.ADMINS).insert(data).select('*').single();
}

export async function updateAdmin(id, data) {
  return _from(TABLE.ADMINS).update(data).eq('id', id).select('*').single();
}

export async function deleteAdmin(id) {
  return _from(TABLE.ADMINS).delete().eq('id', id);
}

// ──────────────────────────────────────────────
//  CATEGORIES
// ──────────────────────────────────────────────

export async function listCategories({ isActive } = {}) {
  let q = _from(TABLE.CATEGORIES)
    .select('*', { count: 'exact' })
    .order('sort_order', { ascending: true });
  if (isActive !== undefined) q = q.eq('is_active', isActive);
  return q;
}

export async function getCategoryBySlug(slug) {
  return _from(TABLE.CATEGORIES).select('*').eq('slug', slug).single();
}

export async function getCategoryById(id) {
  return _from(TABLE.CATEGORIES).select('*').eq('id', id).single();
}

export async function createCategory(data) {
  return _from(TABLE.CATEGORIES).insert(data).select('*').single();
}

export async function updateCategory(id, data) {
  return _from(TABLE.CATEGORIES).update(data).eq('id', id).select('*').single();
}

export async function deleteCategory(id) {
  return _from(TABLE.CATEGORIES).delete().eq('id', id);
}

export async function getProductCountByCategory(categoryId) {
  return _from(TABLE.PRODUCTS)
    .select('id', { count: 'exact' })
    .eq('category_id', categoryId)
    .eq('is_active', true);
}

// ──────────────────────────────────────────────
//  PRODUCTS
// ──────────────────────────────────────────────

const PRODUCT_SELECT = `
  *,
  product_images (id, image_url, sort_order)
`;

export async function listProducts({
  category_id,
  search,
  is_active,
  is_featured,
  is_new_arrival,
  page = 1,
  limit = 20,
  sort = 'newest',
} = {}) {
  let q = _from(TABLE.PRODUCTS).select(PRODUCT_SELECT, { count: 'exact' });

  if (category_id) q = q.eq('category_id', category_id);
  if (is_active !== undefined) q = q.eq('is_active', is_active);
  if (is_featured !== undefined) q = q.eq('is_featured', is_featured);
  if (is_new_arrival !== undefined) q = q.eq('is_new_arrival', is_new_arrival);

  if (search) {
    q = q.or(`name_en.ilike.%${search}%,name_ar.ilike.%${search}%`);
  }

  switch (sort) {
    case 'price_asc':
      q = q.order('price', { ascending: true });
      break;
    case 'price_desc':
      q = q.order('price', { ascending: false });
      break;
    case 'featured':
      q = q.order('is_featured', { ascending: false });
      q = q.order('sort_order', { ascending: true });
      break;
    case 'newest':
    default:
      q = q.order('created_at', { ascending: false });
      break;
  }

  return paginate(q, { page, limit });
}

export async function getProductBySlug(slug) {
  return _from(TABLE.PRODUCTS)
    .select(`${PRODUCT_SELECT}, category:categories(id, name_en, name_ar, slug)`)
    .eq('slug', slug)
    .single();
}

export async function getProductById(id) {
  return _from(TABLE.PRODUCTS)
    .select(`${PRODUCT_SELECT}, category:categories(id, name_en, name_ar, slug)`)
    .eq('id', id)
    .single();
}

export async function createProduct(data) {
  return _from(TABLE.PRODUCTS).insert(data).select('*').single();
}

export async function updateProduct(id, data) {
  return _from(TABLE.PRODUCTS).update(data).eq('id', id).select('*').single();
}

export async function softDeleteProduct(id) {
  return _from(TABLE.PRODUCTS).update({ is_active: false }).eq('id', id).select('*').single();
}

export async function incrementViewCount(id) {
  const { data, error } = await _from(TABLE.PRODUCTS)
    .select('view_count')
    .eq('id', id)
    .single();
  if (error) return { data: null, error };
  return _from(TABLE.PRODUCTS).update({ view_count: (data?.view_count ?? 0) + 1 }).eq('id', id);
}

// ──────────────────────────────────────────────
//  PRODUCT IMAGES
// ──────────────────────────────────────────────

export async function getImagesByProductId(productId) {
  return _from(TABLE.PRODUCT_IMAGES)
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
}

export async function createProductImages(images) {
  return _from(TABLE.PRODUCT_IMAGES).insert(images).select('*');
}

export async function deleteProductImagesByProductId(productId) {
  return _from(TABLE.PRODUCT_IMAGES).delete().eq('product_id', productId);
}

export async function getProductsWithImagesByIds(ids) {
  return _from(TABLE.PRODUCTS)
    .select('id, sku, name_en, name_ar, price, stock_quantity, is_active, product_images(image_url, sort_order)')
    .in('id', ids);
}

export async function hardDeleteProduct(id) {
  return _from(TABLE.PRODUCTS).delete().eq('id', id);
}

export async function getOrderItemCountByProductId(productId) {
  return _from(TABLE.ORDER_ITEMS)
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);
}

// ──────────────────────────────────────────────
//  ORDERS
// ──────────────────────────────────────────────

export async function listOrders({
  status,
  date_from,
  date_to,
  search,
  page = 1,
  limit = 20,
} = {}) {
  let q = _from(TABLE.ORDERS)
    .select(
      `
      *,
      order_items (id, product_id, product_name_snapshot, unit_price_snapshot, quantity, line_total)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  if (date_from) q = q.gte('created_at', date_from);
  if (date_to) q = q.lte('created_at', date_to);

  if (search) {
    q = q.or(
      `customer_name.ilike.%${search}%,phone.ilike.%${search}%,order_number.ilike.%${search}%`
    );
  }

  return paginate(q, { page, limit });
}

export async function getOrderById(id) {
  return _from(TABLE.ORDERS)
    .select(
      `
      *,
      order_items (*),
      order_status_history (*)
    `
    )
    .eq('id', id)
    .single();
}

export async function getOrderByNumberAndPhone(orderNumber, phone) {
  return _from(TABLE.ORDERS)
    .select(
      `
      *,
      order_items (*),
      order_status_history (*)
    `
    )
    .eq('order_number', orderNumber)
    .eq('phone', phone)
    .single();
}

export async function getOrdersByPhone(phone) {
  return _from(TABLE.ORDERS)
    .select(
      `
      id,
      order_number,
      status,
      total,
      created_at,
      phone,
      address_line,
      city,
      order_items (product_name_snapshot, product_image_snapshot, quantity, line_total)
    `
    )
    .eq('phone', phone)
    .order('created_at', { ascending: false });
}

/**
 * Atomic order creation with stock validation (+ optional points redemption).
 * Requires the `decrement_stock` RPC (migration 013) to be deployed, and the
 * extended signature added in migration 017 (p_customer_id / p_points_to_redeem).
 *
 * The RPC validates the customer's points balance and inserts the `redeem`
 * ledger row atomically with the stock decrement — if either fails, the whole
 * call errors and `STOCK_CHECK_FAILED` (or an equivalent) is thrown, matching
 * the existing failure path the frontend already handles.
 *
 * @param {{
 *   orderNumber: string,
 *   customer_name: string,
 *   phone: string,
 *   alt_phone?: string,
 *   email?: string,
 *   address_line: string,
 *   city: string,
 *   governorate: string,
 *   notes?: string,
 *   subtotal: number,
 *   shipping_fee: number,
 *   total: number,
 *   items: Array<{ product_id: string, quantity: number, unit_price_snapshot: number, product_name_snapshot: string, product_image_snapshot?: string }>,
 *   customer_id?: string|null,
 *   points_to_redeem?: number,
 *   points_discount_egp?: number
 * }} params
 */
export async function createOrder({
  orderNumber,
  customer_name,
  phone,
  alt_phone,
  email,
  address_line,
  city,
  governorate,
  notes,
  subtotal,
  shipping_fee,
  total,
  items,
  customer_id = null,
  points_to_redeem = 0,
  points_discount_egp = 0,
}) {
  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data: productFlags } = await _from(TABLE.PRODUCTS)
    .select('id, unlimited_stock')
    .in('id', ids);
  const unlimited = new Set(
    (productFlags || []).filter((p) => p.unlimited_stock).map((p) => p.id),
  );

  const stockItems = items
    .filter((i) => !unlimited.has(i.product_id))
    .map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
    }));

  // p_points_to_redeem = 0 / p_customer_id = null for guests → the RPC skips
  // the new branches entirely (byte-identical to the pre-points behavior).
  // Only forward the new params when a logged-in customer is actually redeeming,
  // so guest orders construct the exact same _rpc() call shape as before.
  const rpcArgs = { order_items: stockItems };
  if (points_to_redeem > 0 && customer_id) {
    rpcArgs.p_customer_id = customer_id;
    rpcArgs.p_points_to_redeem = points_to_redeem;
  }

  const { data: rpcResult, error: rpcError } = await _rpc('decrement_stock', rpcArgs);

  if (rpcError) {
    const err = new Error(rpcError.message);
    err.code = 'STOCK_CHECK_FAILED';
    err.supabaseError = rpcError;
    throw err;
  }

  if (!rpcResult?.success) {
    const err = new Error('Stock check failed');
    err.code = 'STOCK_CHECK_FAILED';
    err.details = rpcResult;
    throw err;
  }

  const orderRow = {
    order_number: orderNumber,
    customer_name,
    phone,
    alt_phone,
    email,
    address_line,
    city,
    governorate,
    notes,
    subtotal,
    shipping_fee,
    total,
  };

  // Additive points columns. Only written when a customer is attached and
  // redeemed points; default-0 / null for every other case = identical to the
  // pre-points row shape on disk.
  if (customer_id) {
    orderRow.customer_id = customer_id;
    orderRow.points_redeemed = points_to_redeem || 0;
    orderRow.points_discount_egp = points_discount_egp || 0;
  }

  const { data: order, error: orderError } = await _from(TABLE.ORDERS)
    .insert(orderRow)
    .select('*')
    .single();

  if (orderError) throw orderError;

  const lineItems = items.map((i) => ({
    order_id: order.id,
    product_id: i.product_id,
    product_name_snapshot: i.product_name_snapshot,
    product_image_snapshot: i.product_image_snapshot || null,
    unit_price_snapshot: i.unit_price_snapshot,
    quantity: i.quantity,
    line_total: i.unit_price_snapshot * i.quantity,
  }));

  const { data: insertedItems, error: itemsError } = await _from(TABLE.ORDER_ITEMS)
    .insert(lineItems)
    .select('*');

  if (itemsError) throw itemsError;

  return { data: { ...order, items: insertedItems } };
}

export async function updateOrderStatus(id, status, estimatedDelivery) {
  const update = { status };
  if (estimatedDelivery !== undefined) update.estimated_delivery = estimatedDelivery;
  return _from(TABLE.ORDERS)
    .update(update)
    .eq('id', id)
    .select('*')
    .single();
}

export async function updateOrderAdminNote(id, adminNote) {
  return _from(TABLE.ORDERS)
    .update({ admin_note: adminNote })
    .eq('id', id)
    .select('*')
    .single();
}

export async function getTodayOrderCount() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const startOfDay = `${yyyy}-${mm}-${dd}T00:00:00.000Z`;
  const endOfDay = `${yyyy}-${mm}-${dd}T23:59:59.999Z`;

  return _from(TABLE.ORDERS)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfDay)
    .lt('created_at', endOfDay);
}

// ──────────────────────────────────────────────
//  CUSTOMERS (the accounts table — distinct from the orders-derived
//  customer aggregates above. powering docs/13-points-system.md)
// ──────────────────────────────────────────────

export async function getCustomerByPhone(phone) {
  return _from(TABLE.CUSTOMERS).select('*').eq('phone', phone).single();
}

export async function getCustomerById(id) {
  return _from(TABLE.CUSTOMERS)
    .select('id, name, phone, email, points_balance, created_at, updated_at')
    .eq('id', id)
    .single();
}

/**
 * Full row (INCLUDING password_hash) keyed by id — for password-rotation
 * verification. Never returned to the client; the public shape must go
 * through getCustomerById / updateCustomer.
 */
export async function getCustomerAuthById(id) {
  return _from(TABLE.CUSTOMERS).select('*').eq('id', id).single();
}

/**
 * Admin customer directory (docs/13 §5.3 — keeps the pre-Stage-B behavior of
 * showing order-based customers too): accounts from `customers` (with live
 * points_balance, kept in sync by the ledger trigger) MERGED with
 * orders-derived customer aggregates for phones that have no account yet —
 * walk-in/guest orderers get id null, points_balance 0, and their order
 * stats, so they still appear in the panel and can be converted to an
 * account via the in-store "Add Points" flow (docs/13 §6).
 *
 * Searchable by name/phone, paginated in JS (mirrors the pre-existing
 * listCustomers approach of aggregating orders in JS).
 */
export async function listCustomerDirectory({ search = '', page = 1, limit = 20 } = {}) {
  const [accountsRes, ordersRes] = await Promise.all([
    _from(TABLE.CUSTOMERS).select('id, name, phone, email, points_balance, created_at'),
    _from(TABLE.ORDERS).select('phone, customer_name, total, status, created_at'),
  ]);

  if (accountsRes.error || ordersRes.error) {
    return { data: [], count: 0, error: accountsRes.error || ordersRes.error };
  }

  // Aggregate orders by phone (same logic the old listCustomers used).
  const byPhone = new Map();
  for (const o of ordersRes.data || []) {
    if (!o.phone) continue;
    const existing = byPhone.get(o.phone);
    const excluded = o.status === 'cancelled' || o.status === 'returned';
    byPhone.set(o.phone, {
      phone: o.phone,
      name: o.customer_name || '—',
      order_count: (existing?.order_count || 0) + 1,
      total_spent: (existing?.total_spent || 0) + (excluded ? 0 : Number(o.total || 0)),
      last_order_date: !existing || o.created_at > existing.last_order_date ? o.created_at : existing.last_order_date,
      joined_date: !existing || o.created_at < existing.joined_date ? o.created_at : existing.joined_date,
    });
  }

  const rows = [];
  const seen = new Set();

  for (const a of accountsRes.data || []) {
    seen.add(a.phone);
    const stats = byPhone.get(a.phone) || {};
    rows.push({
      id: a.id,
      name: a.name,
      phone: a.phone,
      email: a.email,
      points_balance: a.points_balance,
      created_at: a.created_at,
      order_count: stats.order_count || 0,
      total_spent: stats.total_spent || 0,
      last_order_date: stats.last_order_date || null,
      joined_date: stats.joined_date || a.created_at,
    });
  }

  for (const stats of byPhone.values()) {
    if (seen.has(stats.phone)) continue;
    rows.push({
      id: null,
      name: stats.name,
      phone: stats.phone,
      email: null,
      points_balance: 0,
      created_at: stats.joined_date || null,
      order_count: stats.order_count,
      total_spent: stats.total_spent,
      last_order_date: stats.last_order_date,
      joined_date: stats.joined_date,
    });
  }

  let all = rows;
  if (search) {
    const needle = search.toLowerCase();
    all = all.filter(
      (r) => String(r.name).toLowerCase().includes(needle) || String(r.phone).includes(search),
    );
  }

  all.sort((a, b) =>
    String(b.last_order_date || b.created_at || '').localeCompare(
      String(a.last_order_date || a.created_at || ''),
    ),
  );

  const total = all.length;
  const start = (page - 1) * limit;
  return { data: all.slice(start, start + limit), count: total, error: null };
}

/**
 * Create a new customer account. If a row already exists for this phone with
 * password_hash NULL (an in-store-admin-created customer who never claimed
 * their account online), the "claim" flow (Section 5.1) is handled by
 * `setCustomerPassword` instead.
 */
export async function createCustomer(data) {
  return _from(TABLE.CUSTOMERS).insert(data).select('*').single();
}

/**
 * Claim flow (docs/13 2.1/5.1): set/update the password on an existing
 * customers row. Used both for initial password-set on a password-less
 * in-store-created customer and for any future password rotation flow.
 *
 * `phone` is used as the lookup key (not id) because the register endpoint
 * only knows the phone at request time.
 */
export async function setCustomerPasswordByPhone(phone, passwordHash) {
  return _from(TABLE.CUSTOMERS)
    .update({ password_hash: passwordHash })
    .eq('phone', phone)
    .select('*')
    .single();
}

/**
 * Profile update for the logged-in customer (name/email only — phone is the
 * login key and must stay immutable from the customer side).
 * Returns the refreshed public shape (no password_hash).
 */
export async function updateCustomer(id, fields) {
  return _from(TABLE.CUSTOMERS)
    .update(fields)
    .eq('id', id)
    .select('id, name, phone, email, points_balance, created_at, updated_at')
    .single();
}

/** Password rotation for the logged-in customer (verified by the handler). */
export async function updateCustomerPassword(id, passwordHash) {
  return _from(TABLE.CUSTOMERS)
    .update({ password_hash: passwordHash })
    .eq('id', id)
    .select('id')
    .single();
}

/**
 * Orders belonging to a registered customer account — same field shape as
 * getOrdersByPhone so the storefront OrderCard can render them identically.
 */
export async function listOrdersByCustomer(customerId, { page = 1, limit = 20 } = {}) {
  return paginate(
    _from(TABLE.ORDERS)
      .select(
        `
        id,
        order_number,
        status,
        total,
        points_earned,
        points_redeemed,
        created_at,
        phone,
        address_line,
        city,
        order_items (product_name_snapshot, product_image_snapshot, quantity, line_total)
      `
      )
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    { page, limit }
  );
}

// ──────────────────────────────────────────────
//  POINTS TRANSACTIONS (append-only ledger — never UPDATE/DELETE)
// ──────────────────────────────────────────────

/**
 * Insert one ledger row. `balance_after` is filled by the DB trigger
 * (migration 016 part 3) — application code passes 0; the trigger overwrites
 * it before the row hits disk. Returned object is the row as actually stored.
 *
 * @param {{
 *   customer_id: string,
 *   order_id?: string|null,
 *   type: 'earn'|'redeem'|'refund_reversal'|'manual_grant'|'manual_deduct',
 *   points: number,            // signed: positive for earn/grant, negative for redeem/deduct
 *   note?: string|null,
 *   created_by_admin_id?: string|null,
 * }} entry
 */
export async function createPointsTransaction(entry) {
  return _from(TABLE.POINTS_TRANSACTIONS)
    .insert({
      customer_id: entry.customer_id,
      order_id: entry.order_id ?? null,
      type: entry.type,
      points: entry.points,
      balance_after: 0, // trigger-overwritten
      note: entry.note ?? null,
      created_by_admin_id: entry.created_by_admin_id ?? null,
    })
    .select('*')
    .single();
}

export async function listPointsTransactionsByCustomer(customerId, { page = 1, limit = 20 } = {}) {
  let q = _from(TABLE.POINTS_TRANSACTIONS)
    .select('*', { count: 'exact' })
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return paginate(q, { page, limit });
}

/**
 * Idempotent earn hook (docs/13 3.1).
 *
 * Credits `points_earned` to the customer ONLY when the order's existing
 * `points_earned = 0` (i.e. never credited before — guards against
 * double-credit on a re-apply of status=delivered).
 *
 * Ordering: the conditional UPDATE (`... WHERE points_earned = 0`) is the
 * atomic claim — at most one concurrent caller can flip the row from 0 to N.
 * The ledger INSERT runs only after the claim succeeded, so double-crediting
 * (the financially important failure) is impossible. Known trade-off vs. the
 * spec's "set atomically in the same statement": the two statements are not
 * one DB transaction, so a crash between them could leave `points_earned`
 * stamped with no matching ledger row (customer got no points — harmless to
 * the balance, detectable as a mismatch). Supabase-js offers no single
 * statement covering both; flagging this rather than inventing a new RPC.
 *
 * Mutates nothing if the order has no customer attached (guest order) or
 * `pointsEarned > 0` already (idempotent skip).
 *
 * @returns {Promise<{ credited: boolean, pointsEarned?: number }>}
 */
export async function creditOrderEarnedPoints(order) {
  const customerId = order.customer_id;
  if (!customerId) return { credited: false };
  const existingEarned = Number(order.points_earned || 0);
  if (existingEarned > 0) return { credited: false };

  const rate = await getPointsEarnRate();
  const baseTotal = Number(order.total || 0);
  // Spec 3.1: floor(total_after_points_discount * earn_rate)
  const pointsToEarn = Math.floor(baseTotal * rate);
  if (pointsToEarn <= 0) return { credited: false };

  // Atomic claim: only succeeds if nobody has credited this order yet.
  const { data: stamped, error: claimErr } = await _from(TABLE.ORDERS)
    .update({ points_earned: pointsToEarn })
    .eq('id', order.id)
    .eq('points_earned', 0)
    .select('id')
    .single();

  if (claimErr) {
    // PGRST116 = no row matched the conditional → someone else credited first;
    // treat as idempotent skip, not an error.
    if (claimErr.code === 'PGRST116') return { credited: false };
    const err = new Error(claimErr.message);
    err.code = 'POINTS_EARN_FAILED';
    err.supabaseError = claimErr;
    throw err;
  }
  if (!stamped) return { credited: false };

  const { error: histError } = await createPointsTransaction({
    customer_id: customerId,
    order_id: order.id,
    type: 'earn',
    points: pointsToEarn,
    note: `Earned on order ${order.order_number}`,
  });
  if (histError) {
    const err = new Error(histError.message);
    err.code = 'POINTS_EARN_FAILED';
    err.supabaseError = histError;
    throw err;
  }

  return { credited: true, pointsEarned: pointsToEarn };
}

/**
 * Refund redeemed points when an order leaves the fulfillment pipeline
 * (cancelled/returned). Idempotent: only fires if `points_redeemed > 0`.
 * Inserts one `refund_reversal` (positive) ledger row. (docs/13 3.3)
 *
 * @param {object} order   pre-transition order snapshot
 * @param {string} toStatus  destination status (cancelled/returned) — used
 *                           only for the audit note text.
 */
export async function refundOrderRedeemedPoints(order, toStatus) {
  const customerId = order.customer_id;
  if (!customerId) return { refunded: false };
  const redeemed = Number(order.points_redeemed || 0);
  if (redeemed <= 0) return { refunded: false };

  const { error: histError } = await createPointsTransaction({
    customer_id: customerId,
    order_id: order.id,
    type: 'refund_reversal',
    points: redeemed, // positive — credits back
    note: `Refund of redeemed points — order ${order.order_number} ${toStatus || order.status}`,
  });
  if (histError) {
    const err = new Error(histError.message);
    err.code = 'POINTS_REVERSAL_FAILED';
    err.supabaseError = histError;
    throw err;
  }
  return { refunded: true, pointsRefunded: redeemed };
}

/**
 * Reverse previously-EARNED points when a delivered order is later moved to
 * a non-fulfilled terminal status (cancelled/returned). Idempotent on
 * `points_earned > 0`. The order state machine here (server.js
 * adminUpdateOrderStatus has no transition guard) DOES permit
 * delivered → cancelled/returned, so this branch is reachable per the
 * user's decision (cf. docs/13 3.3 open item #2).
 *
 * Note we also set `orders.points_earned = 0` after the reversal so an
 * idempotent re-apply doesn't double-deduct — mirrors the earn hook's guard.
 *
 * @param {object} order   pre-transition order snapshot
 * @param {string} toStatus  destination status — used only for the audit note.
 */
export async function reverseOrderEarnedPoints(order, toStatus) {
  const customerId = order.customer_id;
  if (!customerId) return { reversed: false };
  const earned = Number(order.points_earned || 0);
  if (earned <= 0) return { reversed: false };

  const { error: histError } = await createPointsTransaction({
    customer_id: customerId,
    order_id: order.id,
    type: 'manual_deduct', // spec 3.3: "a manual_deduct-style reversal"
    points: -earned, // negative — debits back
    note: `Reversal of earned points — order ${order.order_number} reverted from delivered to ${toStatus || order.status}`,
  });
  if (histError) {
    const err = new Error(histError.message);
    err.code = 'POINTS_REVERSAL_FAILED';
    err.supabaseError = histError;
    throw err;
  }

  const { error: updErr } = await _from(TABLE.ORDERS)
    .update({ points_earned: 0 })
    .eq('id', order.id)
    .eq('points_earned', earned);
  if (updErr) {
    const err = new Error(updErr.message);
    err.code = 'POINTS_REVERSAL_FAILED';
    err.supabaseError = updErr;
    throw err;
  }

  return { reversed: true, pointsReversed: earned };
}

// ──────────────────────────────────────────────
//  POINTS CONFIG (settings.points_earn_rate / points_redeem_rate)
// ──────────────────────────────────────────────

export async function getPointsEarnRate() {
  const { data } = await _from(TABLE.SETTINGS).select('points_earn_rate').eq('id', 1).single();
  return Number(data?.points_earn_rate ?? 1);
}

// ──────────────────────────────────────────────
//  ORDER STATUS HISTORY
// ──────────────────────────────────────────────

export async function createStatusHistoryEntry({ order_id, status, changed_by, note }) {
  return _from(TABLE.ORDER_STATUS_HISTORY)
    .insert({ order_id, status, changed_by: changed_by || null, note: note || null })
    .select('*')
    .single();
}

// ──────────────────────────────────────────────
//  BANNERS
// ──────────────────────────────────────────────

export async function listBanners({ position, is_active } = {}) {
  let q = _from(TABLE.BANNERS)
    .select('*')
    .order('sort_order', { ascending: true });
  if (position) q = q.eq('position', position);
  if (is_active !== undefined) q = q.eq('is_active', is_active);
  return q;
}

export async function getBannerById(id) {
  return _from(TABLE.BANNERS).select('*').eq('id', id).single();
}

export async function createBanner(data) {
  return _from(TABLE.BANNERS).insert(data).select('*').single();
}

export async function updateBanner(id, data) {
  return _from(TABLE.BANNERS).update(data).eq('id', id).select('*').single();
}

export async function deleteBanner(id) {
  return _from(TABLE.BANNERS).delete().eq('id', id);
}

// ──────────────────────────────────────────────
//  SETTINGS
// ──────────────────────────────────────────────

export async function getSettings() {
  return _from(TABLE.SETTINGS).select('*').eq('id', 1).single();
}

export async function upsertSettings(data) {
  const { data: existing } = await _from(TABLE.SETTINGS).select('id').eq('id', 1).single();
  if (existing) {
    return _from(TABLE.SETTINGS).update(data).eq('id', 1).select('*').single();
  }
  return _from(TABLE.SETTINGS).insert({ id: 1, ...data }).select('*').single();
}

// ──────────────────────────────────────────────
//  COMPLAINTS
// ──────────────────────────────────────────────

export async function createComplaint(data) {
  return _from(TABLE.COMPLAINTS).insert(data).select('*').single();
}

export async function listComplaints({ status, page = 1, limit = 20 } = {}) {
  let q = _from(TABLE.COMPLAINTS)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  return paginate(q, { page, limit });
}

export async function getComplaintById(id) {
  return _from(TABLE.COMPLAINTS).select('*').eq('id', id).single();
}

export async function updateComplaint(id, data) {
  return _from(TABLE.COMPLAINTS).update(data).eq('id', id).select('*').single();
}

export async function deleteComplaint(id) {
  return _from(TABLE.COMPLAINTS).delete().eq('id', id);
}

// ──────────────────────────────────────────────
//  RETURN REQUESTS
// ──────────────────────────────────────────────

export async function createReturnRequest(data) {
  return _from(TABLE.RETURN_REQUESTS).insert(data).select('*').single();
}

export async function listReturnRequests({ status, page = 1, limit = 20 } = {}) {
  let q = _from(TABLE.RETURN_REQUESTS)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  return paginate(q, { page, limit });
}

export async function getReturnRequestById(id) {
  return _from(TABLE.RETURN_REQUESTS).select('*').eq('id', id).single();
}

export async function updateReturnRequest(id, data) {
  return _from(TABLE.RETURN_REQUESTS).update(data).eq('id', id).select('*').single();
}

export async function deleteReturnRequest(id) {
  return _from(TABLE.RETURN_REQUESTS).delete().eq('id', id);
}

// ──────────────────────────────────────────────
//  ANALYTICS
// ──────────────────────────────────────────────

export async function getOrderCount(filters = {}) {
  let q = _from(TABLE.ORDERS).select('id', { count: 'exact', head: true });
  if (filters.status) q = q.eq('status', filters.status);
  return q;
}

export async function getDeliveredOrderTotals() {
  return _from(TABLE.ORDERS).select('total').eq('status', 'delivered');
}

export async function getActiveProducts() {
  return _from(TABLE.PRODUCTS)
    .select('id, stock_quantity, low_stock_threshold, is_active')
    .eq('is_active', true);
}

export async function getProductCount() {
  return _from(TABLE.PRODUCTS).select('id', { count: 'exact', head: true });
}

export async function getOrdersSince(dateISO) {
  return _from(TABLE.ORDERS)
    .select('id, total, status, created_at')
    .gte('created_at', dateISO)
    .order('created_at', { ascending: true });
}

export async function getItemsWithOrdersSince(dateISO) {
  return _from(TABLE.ORDER_ITEMS)
    .select('quantity, product_id, orders!inner(created_at, status)')
    .gte('orders.created_at', dateISO);
}

export async function getProductsByIds(ids, columns) {
  let q = _from(TABLE.PRODUCTS).select(columns || 'id, name_en, name_ar, slug');
  if (ids.length > 0) q = q.in('id', ids);
  return q;
}

/**
 * tictoc-xpoint-parity analytics summary (GET /api/admin/analytics).
 * Mirrors tictoc's response shape: totalRevenue, deliveredRevenue, avgOrderValue,
 * totalOrders, completionRate, ordersByStatus, ordersByCategory, cities.
 */
export async function getAnalyticsSummary(sinceISO) {
  const [ordersRes, productsRes, itemsRes] = await Promise.all([
    _from(TABLE.ORDERS)
      .select('id, status, total, city, created_at')
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: true }),
    _from(TABLE.PRODUCTS).select('id, category:categories(name_en, name_ar)'),
    _from(TABLE.ORDER_ITEMS)
      .select('quantity, product_id, orders!inner(created_at)')
      .gte('orders.created_at', sinceISO),
  ]);

  if (ordersRes.error) return ordersRes;
  if (productsRes.error) return productsRes;
  if (itemsRes.error) return itemsRes;

  const orders = ordersRes.data || [];
  const catOf = new Map(
    (productsRes.data || []).map((p) => [p.id, p.category?.name_en || 'Uncategorized']),
  );

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const deliveredRevenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const completed = orders.filter((o) => o.status === 'delivered').length;
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled').length;
  const completionRate = nonCancelled > 0 ? Math.round((completed / nonCancelled) * 100) : 0;

  const statusMap = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
  orders.forEach((o) => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  });
  const ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  const categoryMap = {};
  (itemsRes.data || []).forEach((item) => {
    const cat = catOf.get(item.product_id) || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(item.quantity || 1);
  });
  const ordersByCategory = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const cityCounts = {};
  orders.forEach((o) => {
    const city = o.city || 'Unknown';
    cityCounts[city] = (cityCounts[city] || 0) + 1;
  });

  return {
    data: {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      deliveredRevenue: Math.round(deliveredRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      totalOrders: orders.length,
      completionRate,
      ordersByStatus,
      ordersByCategory,
      cities: Object.entries(cityCounts)
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
    },
    error: null,
  };
}
