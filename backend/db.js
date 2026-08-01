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

export async function getAdminByUsername(username) {
  return _from(TABLE.ADMINS).select('*').eq('username', username).single();
}

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

export async function updateLastLogin(id) {
  return _from(TABLE.ADMINS)
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', id);
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
    .eq('category_id', categoryId);
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
  return _from(TABLE.PRODUCTS).update({ is_active: false }).eq('id', id);
}

export async function incrementViewCount(id) {
  return _from(TABLE.PRODUCTS)
    .update({ view_count: supabase.raw('view_count + 1') })
    .eq('id', id);
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

export async function deleteProductImage(id) {
  return _from(TABLE.PRODUCT_IMAGES).delete().eq('id', id);
}

export async function reorderProductImages(images) {
  return _from(TABLE.PRODUCT_IMAGES).upsert(images, {
    onConflict: 'id',
    defaultToNull: false,
  });
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
      order_items (product_name_snapshot, product_image_snapshot, quantity, line_total)
    `
    )
    .eq('phone', phone)
    .order('created_at', { ascending: false });
}

/**
 * Atomic order creation with stock validation.
 * Requires the `decrement_stock` RPC (migration 013) to be deployed.
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
 *   items: Array<{ product_id: string, quantity: number, unit_price_snapshot: number, product_name_snapshot: string, product_image_snapshot?: string }>
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
}) {
  const stockItems = items.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
  }));

  const { data: rpcResult, error: rpcError } = await _rpc('decrement_stock', {
    order_items: stockItems,
  });

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

export async function updateOrderStatus(id, status) {
  return _from(TABLE.ORDERS)
    .update({ status })
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
//  ORDER ITEMS
// ──────────────────────────────────────────────

export async function createOrderItems(items) {
  return _from(TABLE.ORDER_ITEMS).insert(items).select('*');
}

export async function getOrderItemsByOrderId(orderId) {
  return _from(TABLE.ORDER_ITEMS)
    .select('*')
    .eq('order_id', orderId)
    .order('id', { ascending: true });
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

export async function getStatusHistoryByOrderId(orderId) {
  return _from(TABLE.ORDER_STATUS_HISTORY)
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });
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
  return _from(TABLE.SETTINGS).upsert({ id: 1, ...data }).select('*').single();
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
