import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { setOnAdminSessionExpired } from '@/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  const isAuthenticated = !!admin;

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAdmin(data);
        setSessionExpired(false);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Mid-session expiry: the cookie is httpOnly, so the only signal is admin
  // API calls starting to 401. Drop the session — AdminRoute then redirects
  // to /admin/login (with the session-expired notice) instead of leaving the
  // panel mounted with every list blank.
  useEffect(() => {
    setOnAdminSessionExpired(() => {
      setAdmin(null);
      setSessionExpired(true);
    });
  }, []);

  const value = { admin, isLoading, isAuthenticated, sessionExpired, checkAuth, setAdmin };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;