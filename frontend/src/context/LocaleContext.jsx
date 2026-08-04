import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import enDict from '../i18n/en.js';
import arDict from '../i18n/ar.js';

const translations = { en: enDict, ar: arDict };

const LocaleContext = createContext();

function getInitialLang() {
  try {
    const stored = localStorage.getItem('bg-lang');
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {}
  return 'ar';
}

export function LocaleProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((next) => {
    const l = next === 'ar' ? 'ar' : 'en';
    setLangState(l);
    try { localStorage.setItem('bg-lang', l); } catch {}
    document.documentElement.lang = l;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  }, []);

  /**
   * Backward-compatible t() function.
   * Supports:
   *   - Namespaced keys via ':'  →  t('shop:featured')  looks up 'shop.featured'
   *   - Dotted keys              →  t('home.heroEyebrow') as-is
   *   - Default-namespace keys   →  un-prefixed keys fall back to 'common.<key>'
   *   - i18next {{variable}}     → converted to {variable} internally
   */
  const t = useCallback((key, params) => {
    const dict = translations[lang];
    if (!dict) return key;
    const normalized = key.replace(/:/g, '.');
    let template = dict[normalized];
    if (template === undefined) {
      template = dict[`common.${normalized}`];
    }
    if (template === undefined) {
      const fallback = translations['en'][normalized];
      template = fallback !== undefined ? fallback : normalized.split('.').pop() || key;
    }
    if (params && typeof template === 'string') {
      return template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (_, name) =>
        params[name] != null ? String(params[name]) : ''
      );
    }
    return template;
  }, [lang]);

  const value = { t, lang, setLang, isAr: lang === 'ar', isEn: lang === 'en' };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}