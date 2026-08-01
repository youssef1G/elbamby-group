import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, Clock, TrendingUp, AlertTriangle, PackageX } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fetchAnalyticsOverview, fetchOrders, fetchAdminProducts } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { ORDER_STATUSES } from '@/lib/constants.js';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  processing: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  delivered: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  returned: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

export default function AdminDashboard() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();

  const [ovData, setOvData] = useState(null);
  const [ovLoading, setOvLoading] = useState(true);
  const [ordersData, setOrdersData] = useState(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [prodData, setProdData] = useState(null);
  const [prodLoading, setProdLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAnalyticsOverview()
      .then((res) => { if (!cancelled) setOvData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setOvLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchOrders({ page: 1, limit: 5 })
      .then((res) => { if (!cancelled) setOrdersData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setOrdersLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminProducts({ stock: 'low', page: 1, limit: 5 })
      .then((res) => { if (!cancelled) setProdData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setProdLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const ov = ovData?.data || {};
  const recentOrders = ordersData?.data || [];
  const lowStockProducts = prodData?.data || [];

  const stats = [
    { key: 'revenue', label: t('admin:dashboard.revenue'), value: ov.revenue != null ? formatPrice(ov.revenue) : null, icon: TrendingUp, accent: 'text-bg-primary-500' },
    { key: 'orders', label: t('admin:dashboard.totalOrders'), value: ov.total_orders, icon: ShoppingBag, accent: '' },
    { key: 'pending', label: t('admin:dashboard.pendingOrders'), value: ov.pending_orders, icon: Clock, accent: ov.pending_orders > 0 ? 'text-amber-500' : '' },
    { key: 'lowStock', label: t('admin:dashboard.lowStock'), value: ov.low_stock_count, icon: AlertTriangle, accent: ov.low_stock_count > 0 ? 'text-amber-500' : '' },
    { key: 'outOfStock', label: t('admin:dashboard.outOfStock'), value: ov.out_of_stock_count, icon: PackageX, accent: ov.out_of_stock_count > 0 ? 'text-bg-error' : '' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-h2 font-heading font-bold text-bg-text-primary">
          {t('admin:dashboard.title')}
        </h1>
        <p className="text-body-sm text-bg-text-secondary mt-0.5">
          {isAr ? 'نظرة سريعة على متجرك' : 'Quick overview of your store'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
          >
            <StatCard label={stat.label} value={stat.value} icon={stat.icon} accent={stat.accent} loading={ovLoading} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-bg-surface border border-bg-border rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-body-sm font-heading font-bold text-bg-text-primary">
              {t('admin:dashboard.recentOrders')}
            </h2>
            <button onClick={() => navigate('/admin/orders')} className="text-caption text-bg-primary-500 hover:underline font-medium">
              {isAr ? 'عرض الكل' : 'View all'}
            </button>
          </div>
          {ordersLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-bg-neutral-200/60 animate-pulse rounded-md" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <p className="text-body-sm text-bg-text-secondary py-8 text-center">{t('admin:common.noResults')}</p>
          ) : (
            <div className="space-y-1">
              {recentOrders.map((order) => {
                const sk = order.status || 'pending';
                const sl = ORDER_STATUSES[sk];
                return (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                    className="w-full flex items-center justify-between gap-3 py-2.5 px-3 rounded-md hover:bg-bg-surface-sunken transition text-start"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-medium text-bg-text-primary font-mono ltr-nums truncate" dir="ltr">
                        #{order.order_number}
                      </p>
                      <p className="text-caption text-bg-text-secondary truncate">{order.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-body-sm font-semibold text-bg-text-primary ltr-nums" dir="ltr">
                        {formatPrice(order.total)}
                      </span>
                      <span className={`text-caption font-semibold border rounded-full px-2 py-0.5 ${statusStyles[sk] || ''}`}>
                        {sl ? (isAr ? sl.ar : sl.en) : sk}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="bg-bg-surface border border-bg-border rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-body-sm font-heading font-bold text-bg-text-primary">
              {t('admin:dashboard.lowStockProducts')}
            </h2>
            <button onClick={() => navigate('/admin/products')} className="text-caption text-bg-primary-500 hover:underline font-medium">
              {isAr ? 'إدارة المخزون' : 'Manage stock'}
            </button>
          </div>
          {prodLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-bg-neutral-200/60 animate-pulse rounded-md" />
              ))}
            </div>
          ) : lowStockProducts.length === 0 ? (
            <p className="text-body-sm text-bg-text-secondary py-8 text-center">
              {isAr ? 'كل المنتجات مخزونها جيد ✓' : 'Well stocked ✓'}
            </p>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-md bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-bg-surface-sunken shrink-0">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-caption text-bg-text-secondary">—</div>
                    )}
                  </div>
                  <span className="text-body-sm font-medium text-bg-text-primary truncate flex-1">
                    {isAr ? p.name_ar : p.name_en}
                  </span>
                  <span className={`text-caption font-semibold shrink-0 ${p.stock_quantity === 0 ? 'text-bg-error' : 'text-amber-600 dark:text-amber-400'}`}>
                    {p.stock_quantity === 0
                      ? (isAr ? 'نفذ' : 'Out')
                      : `${p.stock_quantity} ${isAr ? 'متبقي' : 'left'}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent = '', loading = false }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-4 sm:p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-bg-primary-500/10 flex items-center justify-center shrink-0">
        {loading ? (
          <div className="w-5 h-5 rounded-full border-2 border-bg-border border-t-bg-primary-500 animate-spin" />
        ) : (
          <Icon size={18} strokeWidth={1.5} className="text-bg-primary-500" />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary truncate">
          {label}
        </p>
        <p className={`text-h3 font-heading font-bold ${accent || 'text-bg-text-primary'} ltr-nums`} dir="ltr">
          {loading ? '—' : (value ?? 0)}
        </p>
      </div>
    </div>
  );
}