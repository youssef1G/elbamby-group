import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

function getInitialTheme() {
  try {
    const stored = localStorage.getItem('bg-theme');
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialTheme);

  useEffect(() => { applyTheme(mode); }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      try { if (!localStorage.getItem('bg-theme')) setMode(mq.matches ? 'dark' : 'light'); } catch {}
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('bg-theme', next); } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggle, isDark: mode === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}