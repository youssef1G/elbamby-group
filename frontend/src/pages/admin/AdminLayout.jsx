import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar.jsx';

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg-surface-sunken">
      <AdminSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-bg-surface/80 backdrop-blur-md border-b border-bg-border h-16 flex items-center px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden btn-ghost !min-h-0 h-10 w-10 flex items-center justify-center text-bg-text-secondary"
            >
              <Menu size={18} strokeWidth={1.5} />
            </button>
            <h2 className="text-body-lg font-heading font-bold text-bg-text-primary hidden sm:block">
              El Bamby Group
            </h2>
            <span className="text-caption text-bg-text-secondary font-mono sm:hidden">BG Admin</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}