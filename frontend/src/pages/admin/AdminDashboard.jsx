import { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Clock, Package } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fetchAnalyticsOverview, fetchOrders } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { ORDER_STATUSES } from '@/lib/constants.js';

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="surface-card p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-bg-primary-500/10 flex items-center justify-center text-lg shrink-0">
        <Icon size={20} strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-bg-text-secondary truncate">{label}</p>
        <p className={`font-heading text-xl font-bold ${accent || 'text-bg-text-primary'}`}>{value}</p>
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  delivered: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

function RecentOrderRow({ order, t, isAr }) {
  const status = order.status || 'pending';
  const sl = ORDER_STATUSES[status];
  return (
    <tr className="border-t border-bg-border hover:bg-bg-surface-sunken/30 transition-colors">
      <td className="px-4 py-3 font-mono text-caption text-bg-text-secondary ltr-nums max-w-[120px] truncate" dir="ltr">
        <Link
          to={`/admin/orders?id=${order.id}`}
          className="font-mono text-caption font-medium text-bg-text-primary hover:text-bg-primary-500 ltr-nums block truncate"
          dir="ltr"
        >#{order.orderNumber}</Link>
      </td>
      <td className="px-4 py-3 text-body-sm text-bg-text-primary">{order.customerName || '—'}</td>
      <td className="px-4 py-3 text-caption text-bg-text-secondary hidden sm:table-cell ltr-nums" dir="ltr">
        {formatPrice(order.total ?? 0)}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${STATUS_BADGE[status] || ''}`}>{sl ? (isAr ? sl.ar : sl.en) : status}</span>
      </td>
    </tr>
  );
}

export default function AdminDashboard() {
  const { t, isAr } = useLocale();

  const [ov, setOv] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAnalyticsOverview(), fetchOrders({ page: 1, limit: 5 })])
      .then(([overview, orders]) => {
        if (!cancelled) {
          setOv(overview || {});
          setRecentOrders(orders?.data || []);
        }
      })
      .catch((err) => console.error('Dashboard load failed:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!ov) return [];
    return [
      { label: t('admin:dashboard.revenue'), value: ov.total_revenue != null ? formatPrice(ov.total_revenue) : '—', icon: DollarSign, accent: 'text-bg-primary-500' },
      { label: t('admin:dashboard.totalOrders'), value: ov.total_orders ?? 0, icon: ShoppingBag, accent: '' },
      { label: t('admin:dashboard.pending'), value: ov.pending_orders ?? 0, icon: Clock, accent: ov.pending_orders > 0 ? 'text-bg-warning' : 'text-bg-text-primary' },
      { label: t('admin:dashboard.products'), value: ov.total_products ?? 0, icon: Package, accent: '' },
    ];
  }, [ov, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        <h2 className="font-heading text-xl font-bold text-bg-text-primary">{t('admin:dashboard.title')}</h2>
        <p className="text-xs text-bg-text-secondary mt-1">{t('admin:dashboard.subtitle')}</p>
      </motion.div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="surface-card h-24 animate-pulse" />
            ))}
          </div>
          <div className="surface-card h-64 animate-pulse" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}>
                <StatCard label={s.label} value={s.value} icon={s.icon} accent={s.accent} />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-body-sm font-bold text-bg-text-primary">{t('admin:dashboard.recentOrders')}</h3>
                <Link to="/admin/orders" className="text-caption font-medium text-bg-primary-500 hover:underline">
                  {t('admin:dashboard.viewAll')}
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-body-sm text-bg-text-secondary py-8 text-center">{t('admin:dashboard.noOrders')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body-sm">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start">{t('admin:dashboard.id')}</th>
                        <th className="px-4 py-2 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start">{t('admin:dashboard.customer')}</th>
                        <th className="px-4 py-2 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start hidden sm:table-cell">{t('admin:dashboard.total')}</th>
                        <th className="px-4 py-2 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start hidden sm:table-cell">{t('admin:dashboard.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => <RecentOrderRow key={o.id} order={o} t={t} isAr={isAr} />)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading text-body-sm font-bold text-bg-text-primary">{t('admin:dashboard.lowStock')}</h3>
                <Link to="/admin/products" className="text-caption font-medium text-bg-primary-500 hover:underline">
                  {t('admin:dashboard.manageStock')}
                </Link>
              </div>
              <div className="text-body-sm text-bg-text-secondary py-8 text-center">
                {t('admin:dashboard.wellStocked')}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}