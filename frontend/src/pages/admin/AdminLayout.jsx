import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import AdminSidebar from '@/components/admin/AdminSidebar.jsx';

export default function AdminLayout() {
  const { t } = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg-surface-sunken">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="shrink-0 sticky top-0 z-30 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border h-16 flex items-center px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden btn-ghost !min-h-0 h-11 w-11 flex items-center justify-center text-bg-text-secondary"
              aria-label={t('common:nav.menu')}
            >
              <Menu size={24} strokeWidth={2} />
            </button>
            <h2 className="text-body-lg font-heading font-bold text-bg-text-primary hidden sm:block">
              {t('common:brand.fullName')}
            </h2>
            <span className="text-caption text-bg-text-secondary font-mono sm:hidden">
              {t('admin:adminPanel')}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 sm:p-8 max-w-6xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
