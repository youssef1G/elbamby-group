import { useState, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useLocale } from '@/context/LocaleContext.jsx';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, ShoppingBag, Menu, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import useFocusTrap from '@/hooks/useFocusTrap.js';

export default function Navbar() {
  const { t, lang, setLang } = useLocale();
  const { mode, toggle: toggleTheme } = useTheme();
  const { items, setIsCartOpen } = useCart();
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useFocusTrap({ isOpen: menuOpen, ref: menuRef, onClose: () => setMenuOpen(false) });

  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar');

  const links = [
    { to: '/', label: t('nav.home', { ns: 'common' }), end: true },
    { to: '/shop', label: t('nav.shop', { ns: 'common' }) },
    { to: '/about', label: t('nav.about', { ns: 'common' }) },
    { to: '/contact', label: t('nav.contact', { ns: 'common' }) },
    { to: '/my-orders', label: t('nav.myOrders', { ns: 'common' }) },
  ];

  const linkClass = ({ isActive }) =>
    `relative text-[13px] font-medium tracking-tight transition-colors hover:text-bg-primary-500 py-1 ${
      isActive ? 'text-bg-primary-500' : 'text-bg-text-secondary'
    }`;

  const linkStyle = ({ isActive }) => ({
    padding: '0.375rem 0.875rem',
    borderRadius: '9999px',
    background: isActive ? 'color-mix(in srgb, var(--bg-primary-500) 10%, transparent)' : 'transparent',
  });

  return (
    <header className="sticky top-0 z-40 bg-bg-surface/80 backdrop-blur-lg border-b border-bg-border transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-[72px]">
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0"
          onClick={() => setMenuOpen(false)}
        >
          <img
            src="/logo.jpg"
            alt={t('brand.fullName', { ns: 'common' })}
            className="h-9 w-9 rounded-lg object-cover"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-heading font-semibold text-[15px] tracking-tight text-bg-text-primary">
              {t('brand.name', { ns: 'common' })}
            </span>
            <span className="font-heading font-medium text-[10px] uppercase tracking-[0.15em] text-bg-text-secondary">
              {t('brand.subName', { ns: 'common' })}
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              style={linkStyle}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-0.5">
          <button
            onClick={toggleTheme}
            className="h-10 w-10 rounded-full flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-border/40 transition-colors"
            aria-label={
              mode === 'dark'
                ? t('theme.toggleToLight', { ns: 'common' })
                : t('theme.toggleToDark', { ns: 'common' })
            }
          >
            {mode === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" focusable="false" /> : <Moon className="w-5 h-5" aria-hidden="true" focusable="false" />}
          </button>

          <button
            type="button"
            onClick={toggleLang}
            className="h-10 px-2.5 rounded-full flex items-center justify-center text-[11px] font-bold text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-border/40 transition-colors"
            aria-label={
              lang === 'en'
                ? t('language.switchToArabic', { ns: 'common' })
                : t('language.switchToEnglish', { ns: 'common' })
            }
          >
            {lang === 'en' ? 'AR' : 'EN'}
          </button>

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative h-10 w-10 rounded-full flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-border/40 transition-colors"
            aria-label={t('nav.cart', { ns: 'common' })}
          >
            <ShoppingBag className="w-5 h-5" aria-hidden="true" focusable="false" />
            {itemCount > 0 && (
              <span className="absolute top-1.5 end-1.5 min-w-[18px] h-[18px] bg-bg-primary-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center px-1">
                {itemCount}
              </span>
            )}
          </button>

          <button
            className="md:hidden h-10 w-10 rounded-full flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-border/40 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t('nav.menu', { ns: 'common' })}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" aria-hidden="true" focusable="false" /> : <Menu className="w-5 h-5" aria-hidden="true" focusable="false" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            ref={menuRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-bg-border bg-bg-surface overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 72px)' }}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.main', { ns: 'common' })}
          >
            <div className="px-5 pb-6 pt-3 flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                      isActive
                        ? 'bg-bg-primary-50 text-bg-primary-500'
                        : 'text-bg-text-primary hover:bg-bg-neutral-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <button
                onClick={() => {
                  toggleLang();
                  setMenuOpen(false);
                }}
                className="mt-2 px-4 py-3 rounded-xl text-[15px] font-medium text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-neutral-100 transition-colors text-start"
              >
                {lang === 'en' ? '🇪🇬 العربية' : '🇬🇧 English'}
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
