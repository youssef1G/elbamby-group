import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fetchOrders, updateOrderStatus } from '@/api.js';
import Select from '@/components/ui/Select.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { formatDate, formatPrice } from '@/lib/formatters.js';
import { ORDER_STATUSES } from '@/lib/constants.js';

const STATUS_BADGE = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  delivered: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  cancelled: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

export default function AdminOrders() {
  const { t, isAr } = useLocale();
  const { toast } = useToast();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    fetchOrders()
      .then((res) => { if (!cancelled) setOrders(res?.data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleUpdate(id, fields) {
    setSaving((s) => ({ ...s, [id]: true }));
    try {
      const updated = await updateOrderStatus(id, fields);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast(
        fields.estimated_delivery !== undefined
          ? t('admin:orders.estDeliverySaved')
          : t('admin:orders.statusUpdated'),
        'success'
      );
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  }

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = orders.filter(
    (o) =>
      (filter === 'all' || o.status === filter) &&
      (!search ||
        (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (o.phone || '').toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-3 w-64 mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-full max-w-xs" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-bg-border">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="pt-4 border-t border-bg-border">
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!orders.length && filter === 'all' && !search) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-bg-text-primary">{t('admin:orders.title')}</h1>
          <p className="text-xs text-bg-text-secondary mt-1">{t('admin:orders.subtitle')}</p>
        </div>
        <div className="surface-card p-12 text-center">
          <p className="text-body-sm text-bg-text-secondary">{t('admin:orders.noOrders')}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      <div>
        <h1 className="font-heading text-xl font-bold text-bg-text-primary">{t('admin:orders.title')}</h1>
        <p className="text-xs text-bg-text-secondary mt-1">{t('admin:orders.subtitle')}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="flex flex-wrap gap-2"
      >
        <button
          onClick={() => setFilter('all')}
          className={`text-caption font-semibold border rounded-full px-3 py-1 transition-colors ${
            filter === 'all'
              ? 'bg-bg-primary-500 text-white border-bg-primary-500'
              : 'text-bg-text-secondary border-bg-border hover:border-bg-primary-500'
          }`}
        >
          {t('admin:orders.allOrders')} · {orders.length}
        </button>
        {Object.entries(counts).map(([status, count]) => {
          const sl = ORDER_STATUSES[status];
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? 'all' : status)}
              className={`text-caption font-semibold border rounded-full px-3 py-1 transition-colors ${
                filter === status
                  ? 'bg-bg-primary-500 text-white border-bg-primary-500'
                  : STATUS_BADGE[status] || 'text-bg-text-secondary border-bg-border'
              }`}
            >
              {sl ? (isAr ? sl.ar : sl.en) : status} · {count}
            </button>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="relative max-w-xs"
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin:orders.searchPlaceholder')}
          className="w-full text-body-sm surface-card h-9 px-4 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:border-bg-primary-500"
        />
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="text-caption text-bg-text-secondary"
      >
        {t('admin:orders.showing', { filtered: filtered.length, total: orders.length, s: orders.length !== 1 ? 's' : '' })}
      </motion.p>

      {filtered.length === 0 ? (
        <p className="text-body-sm text-bg-text-secondary text-center py-10">{t('admin:orders.noMatch')}</p>
      ) : (
        filtered.map((order, idx) => {
          const sk = order.status || 'pending';
          const sl = ORDER_STATUSES[sk];
          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.06 }}
              className="surface-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-bg-surface-sunken/50 border-b border-bg-border rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-caption font-medium text-bg-text-primary ltr-nums" dir="ltr">
                    #{order.orderNumber}
                  </span>
                  <span className={`text-caption font-semibold border rounded-full px-2.5 py-0.5 ${STATUS_BADGE[sk] || 'text-bg-text-secondary border-bg-border'}`}>
                    {sl ? (isAr ? sl.ar : sl.en) : sk}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-body-sm font-semibold text-bg-text-primary ltr-nums" dir="ltr">
                    {formatPrice(order.total ?? 0)}
                  </span>
                  <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-2">
                      {t('admin:orders.customer')}
                    </p>
                    <p className="text-body-sm font-semibold text-bg-text-primary">{order.customerName}</p>
                    <p className="text-body-sm text-bg-text-secondary" dir="ltr">{order.phone}</p>
                    {order.email && <p className="text-caption text-bg-text-secondary">{order.email}</p>}
                    <p className="text-body-sm text-bg-text-secondary">
                      {order.addressLine}{order.city ? `, ${order.city}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-2">
                      {t('admin:orders.items')}
                    </p>
                    <ul className="space-y-1">
                      {(order.orderItems || []).map((item, i) => (
                        <li key={item.id || i} className="flex justify-between gap-3 text-body-sm text-bg-text-secondary">
                          <span>{item.productNameSnapshot} × {item.quantity}</span>
                          <span className="ltr-nums shrink-0" dir="ltr">
                            {formatPrice(item.lineTotal ?? (item.unitPriceSnapshot * item.quantity || 0))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-bg-border sm:items-end">
                  <div className="w-full sm:flex-1 sm:min-w-[160px]">
                    <label className="block text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-1.5">
                      {t('admin:orders.status')}
                    </label>
                    <Select
                      value={sk}
                      onChange={(val) => { if (val !== sk) handleUpdate(order.id, { status: val }); }}
                      options={Object.keys(ORDER_STATUSES).map((k) => {
                        const l = ORDER_STATUSES[k];
                        return { value: k, label: l ? (isAr ? l.ar : l.en) : k };
                      })}
                    />
                  </div>

                  <div className="w-full sm:flex-1 sm:min-w-[180px]">
                    <label className="block text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-1.5">
                      {t('admin:orders.estDelivery')}
                    </label>
                    <input
                      type="date"
                      defaultValue={order.estimatedDelivery || ''}
                      min={new Date().toISOString().split('T')[0]}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      onBlur={(e) => {
                        const value = e.target.value || null;
                        if (value !== (order.estimatedDelivery || null))
                          handleUpdate(order.id, { status: sk, estimated_delivery: value });
                      }}
                      className="w-full rounded-lg border border-bg-border px-3.5 h-10 text-body-sm bg-bg-surface text-bg-text-primary focus:outline-none focus:border-bg-primary-500 focus:ring-1 focus:ring-bg-primary-500"
                    />
                    {order.estimatedDelivery && (
                      <p className="text-caption text-bg-primary-500 mt-1 ltr-nums" dir="ltr">
                        {formatDate(order.estimatedDelivery)}
                      </p>
                    )}
                  </div>

                  {saving[order.id] && (
                    <p className="text-body-sm text-bg-text-secondary animate-pulse">
                      {t('admin:orders.saving')}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}