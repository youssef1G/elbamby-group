import { apiClient } from './client.js';

/**
 * Single API module — tictoc-xpoint pattern.
 * All data-access functions grouped by resource. No per-resource files, no hook layer.
 * Components import from here directly and call within useEffect.
 */

// ─── Products ────────────────────────────────────────────────────────────────
export function fetchProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/products${qs ? `?${qs}` : ''}`);
}
export function fetchProduct(slug) { return apiClient(`/products/${slug}`); }
export function fetchAdminProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/products${qs ? `?${qs}` : ''}`);
}
export function fetchAdminProduct(id) { return apiClient(`/admin/products/${id}`); }
export function createProduct(data) {
  return apiClient('/admin/products', { method: 'POST', body: JSON.stringify(data) });
}
export function updateProduct(id, data) {
  return apiClient(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteProduct(id, hard = false) {
  return apiClient(`/admin/products/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE' });
}
export function toggleProduct(id, field, value) {
  return apiClient(`/admin/products/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ field, value }) });
}

// ─── Categories ──────────────────────────────────────────────────────────────
export function fetchCategories(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/categories${qs ? `?${qs}` : ''}`);
}
export function fetchAdminCategories(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/categories${qs ? `?${qs}` : ''}`);
}
export function createCategory(data) {
  return apiClient('/admin/categories', { method: 'POST', body: JSON.stringify(data) });
}
export function updateCategory(id, data) {
  return apiClient(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteCategory(id) {
  return apiClient(`/admin/categories/${id}`, { method: 'DELETE' });
}

// ─── Admins ───────────────────────────────────────────────────────────────────
export function fetchAdmins() { return apiClient('/admin/admins'); }
export function createAdmin(data) {
  return apiClient('/admin/admins', { method: 'POST', body: JSON.stringify(data) });
}
export function updateAdmin(id, data) {
  return apiClient(`/admin/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteAdmin(id) {
  return apiClient(`/admin/admins/${id}`, { method: 'DELETE' });
}

// ─── Analytics ─────────────────────────────────────────────────────────────────
export function fetchAnalyticsOverview() { return apiClient('/admin/analytics/overview'); }
export function fetchAnalytics(period) { return apiClient(`/admin/analytics?period=${period || '30d'}`); }
export function fetchAnalyticsSales(period) {
  return apiClient(`/admin/analytics/sales?period=${period}`);
}
export function fetchAnalyticsTopProducts(period) {
  return apiClient(`/admin/analytics/top-products?period=${period}`);
}

// ─── Orders (public) ─────────────────────────────────────────────────────────
export function createOrder(data) {
  return apiClient('/orders', { method: 'POST', body: JSON.stringify(data) });
}
export function trackOrder(orderNumber, phone) {
  return apiClient(`/orders/track?order_number=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`);
}
export function lookupOrders(phone) {
  return apiClient(`/orders/lookup?phone=${encodeURIComponent(phone)}`);
}
export function cancelOrder(id, phone) {
  return apiClient(`/orders/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ phone }) });
}

// ─── Orders (admin) ──────────────────────────────────────────────────────────
export function fetchOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/orders${qs ? `?${qs}` : ''}`);
}
export function fetchOrder(id) { return apiClient(`/admin/orders/${id}`); }
export function updateOrderStatus(id, data) {
  return apiClient(`/admin/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function updateOrderNote(id, note) {
  return apiClient(`/admin/orders/${id}/note`, { method: 'PATCH', body: JSON.stringify({ note }) });
}

// ─── Banners ─────────────────────────────────────────────────────────────────
export function fetchBanners(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/banners${qs ? `?${qs}` : ''}`);
}
export function fetchAdminBanners(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/banners${qs ? `?${qs}` : ''}`);
}
export function createBanner(data) {
  return apiClient('/admin/banners', { method: 'POST', body: JSON.stringify(data) });
}
export function updateBanner(id, data) {
  return apiClient(`/admin/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}
export function deleteBanner(id) {
  return apiClient(`/admin/banners/${id}`, { method: 'DELETE' });
}

// ─── Settings ────────────────────────────────────────────────────────────────
export function getSettings() { return apiClient('/settings'); }
export function fetchAdminSettings() { return apiClient('/admin/settings'); }
export function updateSettings(data) {
  return apiClient('/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
}
export function updatePointsSettings(data) {
  return apiClient('/admin/settings/points', { method: 'PUT', body: JSON.stringify(data) });
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export function login(username, password) {
  return apiClient('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}
export function logout() { return apiClient('/auth/logout', { method: 'POST' }); }
export function getMe() { return apiClient('/auth/me'); }

// ─── Customer auth + account (docs/13 §5.1) ─────────────────────────────────
export function registerCustomer(data) {
  return apiClient('/customers/register', { method: 'POST', body: JSON.stringify(data) });
}
export function loginCustomer(data) {
  return apiClient('/customers/login', { method: 'POST', body: JSON.stringify(data) });
}
export function logoutCustomer() { return apiClient('/customers/logout', { method: 'POST' }); }
export function getCustomerMe() { return apiClient('/customers/me'); }
export function fetchMyPointsHistory(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/customers/me/points-history${qs ? `?${qs}` : ''}`);
}
export function fetchMyOrders(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/customers/me/orders${qs ? `?${qs}` : ''}`);
}
export function updateMyProfile(data) {
  return apiClient('/customers/me', { method: 'PATCH', body: JSON.stringify(data) });
}
export function changeMyPassword(data) {
  return apiClient('/customers/me/password', { method: 'PUT', body: JSON.stringify(data) });
}

// ─── Support (complaints + returns) ──────────────────────────────────────────
export function submitComplaint(data) {
  return apiClient('/support/complaints', { method: 'POST', body: JSON.stringify(data) });
}
export function submitReturn(data) {
  return apiClient('/support/returns', { method: 'POST', body: JSON.stringify(data) });
}
export function fetchComplaints(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/support/complaints${qs ? `?${qs}` : ''}`);
}
export function fetchReturns(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/support/returns${qs ? `?${qs}` : ''}`);
}
export function updateSupportComplaint(id, data) {
  return apiClient(`/admin/support/complaints/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function updateSupportReturn(id, data) {
  return apiClient(`/admin/support/returns/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteSupportComplaint(id) {
  return apiClient(`/admin/support/complaints/${id}`, { method: 'DELETE' });
}
export function deleteSupportReturn(id) {
  return apiClient(`/admin/support/returns/${id}`, { method: 'DELETE' });
}

// ─── Customers (admin, docs/13 §5.3) ─────────────────────────────────────────
export function fetchCustomers(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/customers${qs ? `?${qs}` : ''}`);
}
export function fetchCustomer(id) { return apiClient(`/admin/customers/${id}`); }
export function fetchCustomerPointsHistory(id, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiClient(`/admin/customers/${id}/points-history${qs ? `?${qs}` : ''}`);
}
export function createCustomer(data) {
  return apiClient('/admin/customers', { method: 'POST', body: JSON.stringify(data) });
}
export function adjustCustomerPoints(id, data) {
  return apiClient(`/admin/customers/${id}/points-adjust`, { method: 'POST', body: JSON.stringify(data) });
}
