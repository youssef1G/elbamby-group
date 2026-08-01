import { NavLink, useNavigate } from 'react-router-dom';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { logout } from '@/api.js';
import {
  LayoutDashboard, Package, FolderTree, ShoppingBag,
  Image, Settings, Users, Headphones, BarChart3, LogOut, X, Cpu, Globe
} from 'lucide-react';

const links = [
  { key: 'dashboard', to: '/admin', icon: LayoutDashboard },
  { key: 'products', to: '/admin/products', icon: Package },
  { key: 'categories', to: '/admin/categories', icon: FolderTree },
  { key: 'orders', to: '/admin/orders', icon: ShoppingBag },
  { key: 'banners', to: '/admin/banners', icon: Image },
  { key: 'settings', to: '/admin/settings', icon: Settings },
  { key: 'admins', to: '/admin/admins', icon: Users },
  { key: 'support', to: '/admin/support', icon: Headphones },
  { key: 'analytics', to: '/admin/analytics', icon: BarChart3 },
];

export default function AdminSidebar({ mobileOpen, onClose }) {
  const { t, lang, setLang } = useLocale();
  const { setAdmin, admin } = useAuth();
  const navigate = useNavigate();
  const isAr = lang === 'ar';

  const toggleLang = () => setLang(isAr ? 'en' : 'ar');

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    setAdmin(null);
    navigate('/admin/login');
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-bg-surface border-e border-bg-border">
      <div className="h-16 px-5 border-b border-bg-border flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-md bg-bg-primary-500/10 flex items-center justify-center shrink-0">
          <Cpu size={18} strokeWidth={1.5} className="text-bg-primary-500" aria-hidden="true" focusable="false" />
        </div>
        <div className="min-w-0">
          <p className="text-body-sm font-bold text-bg-text-primary leading-tight font-heading">El Bamby Group</p>
          <p className="text-caption text-bg-text-secondary font-mono tracking-wider">Admin Panel</p>
        </div>
          {onClose && (
          <button onClick={onClose} className="lg:hidden ms-auto text-bg-text-secondary hover:text-bg-text-primary" aria-label={t('common:common.close')}>
            <X size={18} aria-hidden="true" focusable="false" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.key}
            to={l.to}
            end={l.to === '/admin'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-md text-body-sm transition-all ${
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
        <div className="flex items-center gap-3 px-3 py-2 rounded-md text-body-sm">
          <div className="w-7 h-7 rounded-full bg-bg-primary-500/10 flex items-center justify-center text-bg-primary-500 text-caption font-bold shrink-0" aria-hidden="true">
            {(admin?.username || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-medium text-bg-text-primary truncate">{admin?.username || 'Admin'}</p>
            <p className="text-caption text-bg-text-secondary capitalize">{admin?.role || 'admin'}</p>
          </div>
        </div>
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
            aria-label={isAr ? t('language.switchToEnglish', { ns: 'common' }) : t('language.switchToArabic', { ns: 'common' })}
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
      <div className="hidden lg:block w-60 shrink-0">{sidebar}</div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <div className="absolute start-0 top-0 bottom-0 w-60">{sidebar}</div>
        </div>
      )}
    </>
  );
}