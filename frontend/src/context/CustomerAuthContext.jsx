import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getCustomerMe, loginCustomer, registerCustomer, logoutCustomer } from '@/api.js';
import { AUTO_REFRESH_MS } from '@/lib/constants.js';

const CustomerAuthContext = createContext(null);

function normalize(d) {
  if (!d) return null;
  const c = d.customer !== undefined ? d.customer : d;
  if (!c) return null;
  return {
    id: d.id,
    name: d.name ?? '',
    phone: d.phone ?? '',
    email: d.email ?? null,
    pointsBalance: Number(d.pointsBalance ?? d.points_balance ?? 0),
    createdAt: d.createdAt ?? null,
  };
}

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!customer;

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCustomerMe();
      setCustomer(normalize(data));
    } catch {
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Silent refresh: re-fetches the profile without touching isLoading (no
  // flicker). Used by the polling interval below and after profile edits.
  const refreshProfile = useCallback(async () => {
    try {
      const data = await getCustomerMe();
      setCustomer(normalize(data));
    } catch (err) {
      // A 401 means the session is actually gone (expired/logged out
      // elsewhere) — treat it as logged-out instead of keeping a ghost
      // customer that can never redeem points. Anything else (network
      // blip, 5xx) is transient and keeps the last known customer.
      if (err?.status === 401 || err?.code === 'UNAUTHORIZED') {
        setCustomer(null);
      }
    }
  }, []);

  // Silent periodic refresh while logged in: keeps the points balance (and
  // any other profile field) live when the admin grants/earns points, without
  // a page reload. Never touches isLoading (no flicker), and pauses while the
  // tab is hidden.
  useEffect(() => {
    if (!customer) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      refreshProfile();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [customer, refreshProfile]);

  const login = useCallback(async (phone, password) => {
    const data = await loginCustomer({ phone, password });
    setCustomer(normalize(data));
    return data;
  }, []);

  const register = useCallback(async (data) => {
    const res = await registerCustomer(data);
    setCustomer(normalize(res));
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutCustomer();
    } catch {}
    setCustomer(null);
  }, []);

  const value = { customer, isLoading, isAuthenticated, checkAuth, refreshProfile, login, register, logout };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}

export default CustomerAuthContext;
