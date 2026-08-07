import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ShoppingCart, Receipt, Target, Clock, Package, Download } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fetchAnalytics, fetchAnalyticsTopProducts } from '@/api.js';
import StatCard from '@/components/admin/StatCard.jsx';
import Select from '@/components/ui/Select.jsx';
import { formatPrice } from '@/lib/formatters.js';
import { downloadCsv } from '@/lib/csv.js';
import { ORDER_STATUSES } from '@/lib/constants.js';

const STATUS_META = {
  pending: { color: 'var(--bg-warning)' },
  confirmed: { color: 'var(--bg-info)' },
  shipped: { color: 'var(--bg-primary-500)' },
  delivered: { color: 'var(--bg-success)' },
  cancelled: { color: 'var(--bg-text-secondary)' },
};

const STAT_CONFIG = [
  {
    key: 'orders',
    icon: ShoppingCart,
    color: 'primary',
    labelKey: 'admin.analytics.totalOrders',
    valueKey: 'totalOrders',
    format: 'count',
  },
  {
    key: 'revenue',
    icon: TrendingUp,
    color: 'primary',
    labelKey: 'admin.analytics.revenue',
    valueKey: 'totalRevenue',
    format: 'price',
  },
  {
    key: 'average',
    icon: Receipt,
    color: 'info',
    labelKey: 'admin.analytics.avgOrder',
    valueKey: 'avgOrderValue',
    format: 'price',
  },
  {
    key: 'completion',
    icon: Target,
    color: 'success',
    labelKey: 'admin.analytics.completionRate',
    valueKey: 'completionRate',
    format: 'percent',
  },
];

function formatStatValue(format, value) {
  if (format === 'price') return value != null ? formatPrice(value) : '—';
  if (format === 'percent') return value != null ? `${value}%` : '—';
  return value || 0;
}

function AnimatedBar({ label, value, max, color, display }) {
  const [fill, setFill] = useState(false);
  const pct = max > 0 ? (Number(value) / max) * 100 : 0;

  useEffect(() => {
    const id = requestAnimationFrame(() => setFill(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex items-center gap-3 py-0.5">
      <span className="text-caption text-bg-text-secondary w-24 shrink-0 truncate font-medium">{label}</span>
      <div className="flex-1 relative">
        <div className="h-8 rounded-md bg-bg-neutral-200/60 overflow-hidden dark:bg-bg-neutral-800/60">
          <div
            className="h-full rounded-md transition-all duration-700 ease-out"
            style={{
              width: fill ? `${Math.max(pct, 2)}%` : '0%',
              background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 80%, transparent))`,
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2 min-w-[5rem] justify-end">
        <span className="text-body-sm font-semibold text-bg-text-primary tabular-nums ltr-nums" dir="ltr">{display ?? value}</span>
        <span className="text-caption text-bg-text-secondary font-medium tabular-nums w-8 text-end ltr-nums" dir="ltr">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { t, isAr } = useLocale();
  const [data, setData] = useState(null);
  const [top, setTop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30d');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAnalytics(days)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    fetchAnalyticsTopProducts(days)
      .then((res) => { if (!cancelled) setTop(res?.data || []); })
      .catch(() => { if (!cancelled) setTop([]); });
    return () => { cancelled = true; };
  }, [days]);

  const summary = data?.data || {};
  const maxStatus = Math.max(1, ...(summary.ordersByStatus || []).map((s) => s.count));
  const maxCat = Math.max(1, ...(summary.ordersByCategory || []).map((c) => c.count));

  const dayOptions = [
    { value: '7d', label: t('admin:analytics.last7') },
    { value: '30d', label: t('admin:analytics.last30') },
    { value: '90d', label: t('admin:analytics.last90') },
  ];

  const pageHeader = (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 className="font-heading text-xl font-bold text-bg-text-primary">{t('admin:analytics.title')}</h2>
        <p className="text-xs text-bg-text-secondary mt-1">{t('admin:analytics.subtitle')}</p>
      </div>
      <div className="w-full sm:w-[180px]">
        <Select value={days} onChange={setDays} options={dayOptions} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="h-6 w-40 bg-bg-neutral-200/60 animate-pulse rounded-md mb-2" />
            <div className="h-3 w-56 bg-bg-neutral-200/60 animate-pulse rounded-md" />
          </div>
          <div className="w-full sm:w-[180px] h-11 rounded-lg bg-bg-neutral-200/60 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-5 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-bg-neutral-200/60 mb-3" />
              <div className="h-3 w-20 bg-bg-neutral-200/60 rounded-md mb-2" />
              <div className="h-7 w-24 bg-bg-neutral-200/60 rounded-md" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="surface-card p-5">
              <div className="h-4 w-36 bg-bg-neutral-200/60 rounded-md animate-pulse mb-5" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 animate-pulse">
                    <div className="h-3 w-20 bg-bg-neutral-200/60 rounded-md" />
                    <div className="flex-1 h-8 rounded-md bg-bg-neutral-200/60" />
                    <div className="h-3 w-20 bg-bg-neutral-200/60 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div className="surface-card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={22} className="text-bg-primary-500" strokeWidth={1.5} />
          </div>
          <p className="text-body-sm font-medium text-bg-text-primary">{t('admin:analytics.noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CONFIG.map((cfg, i) => {
          const Icon = cfg.icon;
          return (
            <motion.div
              key={cfg.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <StatCard
                label={t(cfg.labelKey)}
                value={formatStatValue(cfg.format, summary[cfg.valueKey])}
                icon={Icon}
                valueClass="text-2xl tracking-tight"
              />
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-2 mb-5">
            <h3 className="font-heading text-body-sm font-bold text-bg-text-primary">
              {t('admin:analytics.ordersByStatus')}
            </h3>
            <button
              type="button"
              onClick={() =>
                downloadCsv(`bg-orders-by-status-${days}.csv`, [t('admin:analytics.exportStatus'), t('admin:analytics.exportCount')],
                  (summary.ordersByStatus || []).map((s) => [
                    ORDER_STATUSES[s.status] ? (isAr ? ORDER_STATUSES[s.status].ar : ORDER_STATUSES[s.status].en) : s.status,
                    s.count,
                  ]))
              }
              disabled={!summary.ordersByStatus?.length}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption font-medium text-bg-text-secondary hover:text-bg-primary-500 hover:bg-bg-surface-sunken transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('admin:analytics.export')}
            >
              <Download size={14} />
              <span className="hidden sm:inline">{t('admin:analytics.export')}</span>
            </button>
          </div>
          {summary.ordersByStatus?.length > 0 ? (
            <div className="space-y-1">
              {summary.ordersByStatus.map((s) => {
                const meta = STATUS_META[s.status] || { color: 'var(--bg-primary-500)' };
                const sl = ORDER_STATUSES[s.status];
                return (
                  <AnimatedBar
                    key={s.status}
                    label={sl ? (isAr ? sl.ar : sl.en) : s.status}
                    value={s.count}
                    max={maxStatus}
                    color={meta.color}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center gap-2">
              <Clock size={20} className="text-bg-text-secondary/40" strokeWidth={1.5} />
              <p className="text-body-sm text-bg-text-secondary">{t('admin:analytics.noOrders')}</p>
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-2 mb-5">
            <h3 className="font-heading text-body-sm font-bold text-bg-text-primary">
              {t('admin:analytics.ordersByCategory')}
            </h3>
            <button
              type="button"
              onClick={() =>
                downloadCsv(`bg-orders-by-category-${days}.csv`, [t('admin:analytics.exportCategory'), t('admin:analytics.exportCount')],
                  (summary.ordersByCategory || []).map((c) => [t(`cat.${c.category}`, { defaultValue: c.category }), c.count]))
              }
              disabled={!summary.ordersByCategory?.length}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption font-medium text-bg-text-secondary hover:text-bg-primary-500 hover:bg-bg-surface-sunken transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('admin:analytics.export')}
            >
              <Download size={14} />
              <span className="hidden sm:inline">{t('admin:analytics.export')}</span>
            </button>
          </div>
          {summary.ordersByCategory?.length > 0 ? (
            <div className="space-y-1">
              {summary.ordersByCategory.map((c) => (
                <AnimatedBar
                  key={c.category}
                  label={t(`cat.${c.category}`, { defaultValue: c.category })}
                  value={c.count}
                  max={maxCat}
                  color="var(--bg-accent)"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center gap-2">
              <Package size={20} className="text-bg-text-secondary/40" strokeWidth={1.5} />
              <p className="text-body-sm text-bg-text-secondary">{t('admin:analytics.noCatData')}</p>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h3 className="font-heading text-body-sm font-bold text-bg-text-primary">
              {t('admin:analytics.topProducts')}
            </h3>
            <button
              type="button"
              onClick={() =>
                downloadCsv(`bg-top-products-${days}.csv`, [t('admin:analytics.exportProduct'), t('admin:analytics.exportSold'), t('admin:analytics.exportViews')],
                  top.map((p) => [isAr ? (p.nameAr || p.nameEn) : (p.nameEn || p.nameAr), Number(p.quantitySold ?? 0), Number(p.viewCount ?? 0)]))
              }
              disabled={top.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-caption font-medium text-bg-text-secondary hover:text-bg-primary-500 hover:bg-bg-surface-sunken transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={t('admin:analytics.export')}
            >
              <Download size={14} />
              <span className="hidden sm:inline">{t('admin:analytics.export')}</span>
            </button>
          </div>
          {top.length > 0 ? (
            <div className="divide-y divide-bg-border">
              {top.map((p) => (
                <div key={p.productId} className="flex items-center justify-between gap-4 py-2.5">
                  <span className="text-body-sm font-medium text-bg-text-primary truncate min-w-0">
                    {isAr ? (p.nameAr || p.nameEn) : p.nameEn}
                  </span>
                  <div className="flex items-center gap-6 shrink-0">
                    <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                      {t('admin:analytics.sold')} {Number(p.quantitySold ?? 0).toLocaleString('en-US')}
                    </span>
                    <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                      {t('admin:analytics.views')} {Number(p.viewCount ?? 0).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 text-center gap-2">
              <Package size={20} className="text-bg-text-secondary/40" strokeWidth={1.5} />
              <p className="text-body-sm text-bg-text-secondary">{t('admin:analytics.noTopData')}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}