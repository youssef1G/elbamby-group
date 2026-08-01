import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fetchAnalyticsOverview, fetchAnalyticsSales, fetchAnalyticsTopProducts } from '@/api.js';
import StatCard from '@/components/admin/StatCard.jsx';
import DataTable from '@/components/admin/DataTable.jsx';
import Select from '@/components/ui/Select.jsx';
import { ShoppingBag, Clock, TrendingUp, AlertTriangle, PackageX } from 'lucide-react';
import { formatPrice } from '@/lib/formatters.js';

export default function AdminAnalytics() {
  const { t } = useLocale();
  const [period, setPeriod] = useState('7d');

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesError, setSalesError] = useState(false);
  const [topProductsData, setTopProductsData] = useState(null);
  const [topLoading, setTopLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchAnalyticsOverview()
      .then((res) => { if (!cancelled) setOverview(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setOverviewLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSalesLoading(true);
    setSalesError(false);
    fetchAnalyticsSales(period)
      .then((res) => { if (!cancelled) setSalesData(res); })
      .catch(() => { if (!cancelled) setSalesError(true); })
      .finally(() => { if (!cancelled) setSalesLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  useEffect(() => {
    let cancelled = false;
    setTopLoading(true);
    fetchAnalyticsTopProducts(period)
      .then((res) => { if (!cancelled) setTopProductsData(res); })
      .catch(() => { if (!cancelled) setTopProductsData(null); })
      .finally(() => { if (!cancelled) setTopLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const ov = overview?.data || {};
  const sales = salesData?.data || [];
  const topProducts = topProductsData?.data || [];

  const productColumns = [
    { key: 'name', label: t('admin:products.nameEn'), render: (r) => <span className="text-bg-text-primary">{r.name_en || r.name}</span> },
    { key: 'quantity', label: 'Sold', render: (r) => <span className="ltr-nums" dir="ltr">{r.quantity_sold ?? r.quantity ?? 0}</span> },
    { key: 'revenue', label: 'Revenue', render: (r) => <span className="ltr-nums" dir="ltr">{formatPrice(r.revenue ?? 0)}</span> },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-h2 font-semibold text-bg-text-primary">{t('admin:analytics.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('admin:dashboard.totalOrders')}
          value={ov.total_orders ?? '—'}
          icon={ShoppingBag}
          color="primary"
          loading={overviewLoading}
        />
        <StatCard
          label={t('admin:dashboard.pendingOrders')}
          value={ov.pending_orders ?? '—'}
          icon={Clock}
          color="warning"
          loading={overviewLoading}
        />
        <StatCard
          label={t('admin:dashboard.revenue')}
          value={ov.revenue != null ? `${formatPrice(ov.revenue)}` : '—'}
          icon={TrendingUp}
          color="success"
          loading={overviewLoading}
        />
        <StatCard
          label={t('admin:dashboard.lowStock')}
          value={ov.low_stock_count ?? '—'}
          icon={AlertTriangle}
          color="warning"
          loading={overviewLoading}
        />
        <StatCard
          label={t('admin:dashboard.outOfStock')}
          value={ov.out_of_stock_count ?? '—'}
          icon={PackageX}
          color="error"
          loading={overviewLoading}
        />
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-md p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:analytics.salesOverTime')}</h2>
          <Select
            value={period}
            onChange={setPeriod}
            options={[
              { value: '7d', label: `7 ${t('admin:analytics.days')}` },
              { value: '30d', label: `30 ${t('admin:analytics.days')}` },
              { value: '90d', label: `90 ${t('admin:analytics.days')}` },
            ]}
            className="min-w-[120px]"
          />
        </div>

        {salesError ? (
          <p className="text-body-sm text-bg-text-secondary py-8 text-center">
            {t('common:common.error')}
          </p>
        ) : salesLoading ? (
          <div className="h-48 bg-bg-neutral-200/60 animate-pulse rounded-md" />
        ) : sales.length === 0 ? (
          <p className="text-body-sm text-bg-text-secondary py-8 text-center">{t('common:common.nothing')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-bg-border">
                  <th className="text-start py-2 text-bg-text-secondary font-medium">{t('admin:analytics.date')}</th>
                  <th className="text-end py-2 text-bg-text-secondary font-medium">{t('admin:analytics.sales')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((row, i) => (
                  <tr key={i} className="border-b border-bg-border/50">
                    <td className="py-2 text-bg-text-primary ltr-nums" dir="ltr">{row.date}</td>
                    <td className="py-2 text-end text-bg-text-primary ltr-nums" dir="ltr">{formatPrice(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-md p-6 space-y-4">
        <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:analytics.topProducts')}</h2>
        <DataTable
          columns={productColumns}
          data={topProducts}
          isLoading={topLoading}
          emptyMessage={t('common:common.nothing')}
        />
      </div>
    </div>
  );
}
