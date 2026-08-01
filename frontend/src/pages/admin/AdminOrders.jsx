import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search } from 'lucide-react';
import { fetchOrders, updateOrderStatus } from '@/api.js';
import Select from '@/components/ui/Select.jsx';
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { formatDate, formatPrice } from '@/lib/formatters.js';
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

const ALL_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];

export default function AdminOrders() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusPending, setStatusPending] = useState(false);

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const params = { page, limit: 20 };
  if (search) params.search = search;
  if (statusFilter !== 'all') params.status = statusFilter;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchOrders(params)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, statusFilter, reload]);

  const orders = data?.data || [];
  const meta = data?.meta || {};

  const handleQuickStatus = (order, status) => {
    setStatusTarget({ order, status });
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    try {
      setStatusPending(true);
      await updateOrderStatus(statusTarget.order.id, { status: statusTarget.status });
      toast(t('admin:orders.statusUpdated'), 'success');
      setStatusTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setStatusPending(false);
    }
  };

  const applyStatus = async (order, status) => {
    try {
      await updateOrderStatus(order.id, { status });
      toast(t('admin:orders.statusUpdated'), 'success');
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-neutral-200/60 animate-pulse rounded-md" />
        <div className="h-10 w-80 bg-bg-neutral-200/60 animate-pulse rounded-md" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-36 bg-bg-neutral-200/60 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2 font-heading font-bold text-bg-text-primary">{t('admin:orders.title')}</h1>
        <p className="text-body-sm text-bg-text-secondary mt-0.5">
          {isAr ? 'إدارة جميع طلبات المتجر' : 'Manage all incoming orders'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter('all')}
          className={`text-body-sm font-semibold border rounded-full px-3 py-1 transition-colors ${
            statusFilter === 'all' ? 'bg-bg-primary-500 text-white border-bg-primary-500' : 'text-bg-text-secondary border-bg-border hover:border-bg-primary-500'
          }`}>
          {isAr ? 'الكل' : 'All'} · {meta.total || orders.length}
        </button>
        {ALL_STATUSES.map((sk) => {
          const count = orders.filter((o) => o.status === sk).length;
          if (!count && statusFilter !== sk) return null;
          const sl = ORDER_STATUSES[sk];
          return (
            <button key={sk} onClick={() => setStatusFilter(statusFilter === sk ? 'all' : sk)}
              className={`text-body-sm font-semibold border rounded-full px-4 py-1 transition-colors ${
                statusFilter === sk ? 'bg-bg-primary-500 text-white border-bg-primary-500' : statusStyles[sk] || 'text-bg-text-secondary border-bg-border'
              }`}>
              {sl ? (isAr ? sl.ar : sl.en) : sk} · {count}
            </button>
          );
        })}
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none" />
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={isAr ? 'بحث باسم العميل أو رقم الطلب...' : 'Search by name or order number...'}
          className="w-full text-body-sm bg-bg-surface border border-bg-border rounded-md h-9 ps-9 pe-4 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:border-bg-primary-500" />
      </div>

      {orders.length === 0 ? (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-12 text-center">
          <p className="text-body-sm text-bg-text-secondary">{isAr ? 'لا توجد طلبات' : 'No orders yet'}</p>
        </div>
      ) : (
        orders.map((order, idx) => {
          const sk = order.status || 'pending';
          const sl = ORDER_STATUSES[sk];
          return (
            <motion.div key={order.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.04 }}
              className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-bg-surface-sunken/50 border-b border-bg-border">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-body-sm font-medium text-bg-text-primary cursor-pointer hover:text-bg-primary-500 ltr-nums" dir="ltr" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                    #{order.order_number}
                  </span>
                  <span className={`text-caption font-semibold border rounded-full px-2.5 py-0.5 ${statusStyles[sk] || ''}`}>
                    {sl ? (isAr ? sl.ar : sl.en) : sk}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-body-sm font-semibold text-bg-text-primary ltr-nums" dir="ltr">{formatPrice(order.total)}</span>
                  <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">{formatDate(order.created_at)}</span>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-2">
                      {isAr ? 'العميل' : 'Customer'}
                    </p>
                    <p className="text-body-sm font-semibold text-bg-text-primary">{order.customer_name}</p>
                    <p className="text-body-sm text-bg-text-secondary" dir="ltr">{order.phone}</p>
                    {order.email && <p className="text-caption text-bg-text-secondary">{order.email}</p>}
                  </div>
                  <div>
                    <p className="text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-2">
                      {isAr ? 'العنوان' : 'Address'}
                    </p>
                    <p className="text-body-sm text-bg-text-primary">{order.delivery_address}</p>
                    <p className="text-body-sm text-bg-text-secondary">{order.governorate}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-bg-border">
                  <label className="text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary">
                    {t('admin:orders.changeStatus')}
                  </label>
                  <Select
                    value={sk}
                    onChange={(val) => {
                      if (val === sk) return;
                      if (['delivered', 'cancelled'].includes(val)) {
                        handleQuickStatus(order, val);
                      } else {
                        applyStatus(order, val);
                      }
                    }}
                    options={ALL_STATUSES.map((k) => {
                      const l = ORDER_STATUSES[k];
                      return { value: k, label: l ? (isAr ? l.ar : l.en) : k };
                    })}
                  />
                  <div className="flex-1" />
                  <button onClick={() => navigate(`/admin/orders/${order.id}`)}
                    className="text-body-s text-bg-primary-500 hover:underline font-medium">
                    {isAr ? 'عرض التفاصيل' : 'View details'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })
      )}

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30">
            {t('admin:common.prev')}
          </button>
          <span className="text-body-sm text-bg-text-secondary">{t('admin:common.page')} {meta.page} {t('admin:common.of')} {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30">
            {t('admin:common.next')}
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={confirmStatusChange}
        title={isAr ? 'تغيير حالة الطلب' : 'Change order status'}
        description={statusTarget ? (isAr ? `تغيير الطلب #${statusTarget.order.order_number} إلى الحالة المحددة؟` : `Change order #${statusTarget.order.order_number} status?`) : ''}
        confirmLabel={t('admin:common.confirm')}
        loading={statusPending}
      />
    </div>
  );
}