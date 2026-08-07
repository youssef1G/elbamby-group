const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
    throw err;
  }

  return data;
}
