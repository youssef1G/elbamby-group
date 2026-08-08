const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Registered by AuthContext. Fired when an ADMIN API call comes back 401 —
// the JWT cookie is httpOnly so the frontend can't read its expiry; the only
// way to know the session died mid-page is a rejected admin request. Customer
// 401s are NOT routed here (guests hit /customers/me 401 all the time).
let onAdminSessionExpired = null;
export function setOnAdminSessionExpired(fn) {
  onAdminSessionExpired = fn;
}

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE.replace(/\/$/, '')}/api${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  };

  const res = await fetch(url, config);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Request failed');
    err.status = res.status;
    err.code = data?.error?.code;
    err.details = data?.error?.details;
    err.items = data?.error?.items;

    if (endpoint.startsWith('/admin') && res.status === 401) {
      onAdminSessionExpired?.();
    }

    throw err;
  }

  return data;
}
