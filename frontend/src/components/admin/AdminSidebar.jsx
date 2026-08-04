import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { logout } from '@/api.js';
import { slideInLeft, slideInRight } from '@/lib/animations.js';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Headphones,
  BarChart3,
  Contact,
  Users,
  Settings,
  LogOut,
  X,
  Cpu,
  Globe,
} from 'lucide-react';

const links = [
  { key: 'dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { key: 'products', to: '/admin/products', icon: Package },
  { key: 'categories', to: '/admin/categories', icon: FolderTree },
  { key: 'orders', to: '/admin/orders', icon: ShoppingBag },
  { key: 'support', to: '/admin/support', icon: Headphones },
  { key: 'analytics', to: '/admin/analytics', icon: BarChart3 },
  { key: 'customers', to: '/admin/customers', icon: Contact },
  { key: 'admins', to: '/admin/manage', icon: Users },
  { key: 'settings', to: '/admin/settings', icon: Settings },
];

export default function AdminSidebar({ mobileOpen, onClose }) {
  const { t, lang, setLang } = useLocale();
  const { setAdmin, admin } = useAuth();
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  const toggleLang = () => setLang(isAr ? 'en' : 'ar');

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    setAdmin(null);
    navigate('/admin/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-bg-surface border-e border-bg-border">
      <div className="h-16 px-5 border-b border-bg-border flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-md bg-bg-primary-500/10 flex items-center justify-center shrink-0">
          <Cpu
            size={18}
            strokeWidth={1.5}
            className="text-bg-primary-500"
            aria-hidden="true"
            focusable="false"
          />
        </div>
        <div className="min-w-0">
          <p className="text-body-sm font-bold text-bg-text-primary leading-tight font-heading">
            {t('common:brand.fullName')}
          </p>
          <p className="text-caption text-bg-text-secondary font-mono tracking-wider">
            {t('admin:adminPanel')}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden ms-auto text-bg-text-secondary hover:text-bg-text-primary"
            aria-label={t('common:common.close')}
          >
            <X size={18} aria-hidden="true" focusable="false" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.key}
            to={l.to}
            end={l.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-bg-primary-500/10 text-bg-primary-500 font-semibold'
                  : 'text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-surface-sunken font-medium'
              }`
            }
          >
            <l.icon size={16} strokeWidth={1.5} aria-hidden="true" focusable="false" />
            {t(`admin:sidebar.${l.key}`)}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-bg-border space-y-2">
        <button
          onClick={() => {
            onClose?.();
            navigate('/');
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-body-sm text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-surface-sunken transition-colors w-full font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: isAr ? 'scaleX(-1)' : 'none' }}>
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('admin:storefront')}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-md text-body-sm text-bg-text-secondary hover:text-bg-error hover:bg-bg-error/5 transition-colors font-medium"
          >
            <LogOut size={14} strokeWidth={1.5} aria-hidden="true" focusable="false" />
            {t('admin:sidebar.logout')}
          </button>
          <button
            onClick={toggleLang}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-body-sm font-semibold text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-surface-sunken transition-colors"
            aria-label={
              isAr ? t('common:language.switchToEnglish') : t('common:language.switchToArabic')
            }
          >
            <Globe size={14} strokeWidth={1.5} aria-hidden="true" focusable="false" />
            <span className="font-mono text-caption">{isAr ? 'EN' : 'ع'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (mobileOpen === undefined) return sidebar;

  return (
    <>
      <div className="hidden lg:block w-64 shrink-0">{sidebar}</div>
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              className="absolute start-0 top-0 bottom-0 w-64"
              {...(isAr ? slideInRight(true) : slideInLeft(false))}
            >
              {sidebar}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}