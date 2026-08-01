import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { fetchAdminProducts, fetchAdminCategories, deleteProduct } from '@/api.js';
import DataTable from '@/components/admin/DataTable.jsx';
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx';
import Select from '@/components/ui/Select.jsx';
import { useToast } from '@/components/ui/Toast.jsx';

export default function AdminProducts() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [catData, setCatData] = useState(null);
  const [reload, setReload] = useState(0);

  const params = { page, limit: 20 };
  if (search) params.search = search;
  if (categoryFilter) params.category = categoryFilter;
  if (stockFilter) params.stock = stockFilter;
  if (sortKey) params.sort = sortKey;

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAdminProducts(params)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, categoryFilter, stockFilter, sortKey, sortDir, reload]);

  useEffect(() => {
    let cancelled = false;
    fetchAdminCategories()
      .then((res) => { if (!cancelled) setCatData(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const products = data?.data || [];
  const meta = data?.meta || {};
  const categories = catData?.data || [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteProduct(deleteTarget.id);
      toast(t('admin:products.deleted'), 'success');
      setDeleteTarget(null);
    } catch {
      toast(t('common:common.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const hasFilters = search || categoryFilter || stockFilter;
  const clearFilters = () => { setSearch(''); setCategoryFilter(''); setStockFilter(''); setPage(1); };

  const stockBadge = (row) => {
    const qty = row.stock_quantity ?? 0;
    const threshold = row.low_stock_threshold ?? 5;
    if (qty === 0) return <span className="text-caption font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5">{t('admin:common.outOfStock')}</span>;
    if (qty <= threshold) return <span className="text-caption font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5">{qty} {isAr ? 'متبقي' : 'left'}</span>;
    return <span className="text-caption text-bg-text-secondary">{qty} {isAr ? 'متوفر' : 'in stock'}</span>;
  };

  const columns = [
    {
      key: 'image',
      label: '',
      render: (row) => (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg-surface-sunken shrink-0">
          {row.images?.[0]?.url ? <img src={row.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-caption text-bg-text-secondary">—</div>}
        </div>
      ),
    },
    {
      key: 'name',
      label: t('admin:products.nameEn'),
      sortKey: 'name_en',
      render: (row) => (
        <div className="min-w-0">
          <span className="font-semibold text-bg-text-primary truncate block">
            {(isAr ? row.name_ar : row.name_en) || row.name_en || row.name_ar || (isAr ? 'بدون اسم' : 'Untitled')}
          </span>
          {row.is_featured && <span className="me-2 text-caption font-bold text-bg-primary-500 uppercase">{isAr ? 'مميز' : '★'}</span>}
          {row.is_new_arrival && <span className="me-2 text-caption font-semibold text-bg-primary-500 uppercase">{isAr ? 'جديد' : 'NEW'}</span>}
        </div>
      ),
    },
    {
      key: 'category',
      label: t('admin:products.category'),
      render: (row) => {
        const catName = isAr ? row.category?.name_ar : row.category?.name_en;
        const fallback = isAr ? row.category?.name_en : row.category?.name_ar;
        return <span className="text-bg-text-secondary">{catName || fallback || row.category_name || '—'}</span>;
      },
    },
    {
      key: 'price',
      label: t('admin:products.price'),
      sortKey: 'price',
      render: (row) => <span className="font-semibold ltr-nums" dir="ltr">{row.price} EGP</span>,
    },
    {
      key: 'stock',
      label: t('admin:products.stockQuantity'),
      sortKey: 'stock_quantity',
      render: stockBadge,
    },
    {
      key: 'actions',
      label: t('admin:common.actions'),
      render: (row) => (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => navigate(`/admin/products/${row.id}/edit`)} className="text-caption font-medium text-bg-primary-500 hover:underline">
            {t('admin:common.edit')}
          </button>
          <button onClick={() => setDeleteTarget(row)} className="text-caption font-medium text-bg-text-secondary hover:text-bg-error transition-colors">
            {t('admin:common.delete')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-heading font-bold text-bg-text-primary">{t('admin:products.title')}</h1>
          <p className="text-body-sm text-bg-text-secondary mt-0.5">{isAr ? 'إدارة منتجات المتجر' : 'Manage your product catalog'}</p>
        </div>
        <button
          onClick={() => navigate('/admin/products/new')}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-bg-primary-500 hover:bg-bg-primary-600 text-white font-semibold transition active:scale-[0.98] shadow-sm"
        >
          <Plus size={18} strokeWidth={2} />
          {t('admin:products.create')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin:common.search')}
            className="w-full text-body-sm bg-bg-surface border border-bg-border rounded-md h-9 ps-9 pe-3 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:border-bg-primary-500 focus:ring-1 focus:ring-bg-primary-500"
          />
        </div>
        <Select
          value={categoryFilter}
          onChange={(v) => { setCategoryFilter(v); setPage(1); }}
          placeholder={t('admin:products.category')}
          options={categories.map((c) => ({ value: c.id, label: isAr ? c.name_ar : c.name_en }))}
          className="min-w-[160px]"
        />
        <Select
          value={stockFilter}
          onChange={(v) => { setStockFilter(v); setPage(1); }}
          placeholder={t('admin:products.stockQuantity')}
          options={[
            { value: 'low', label: t('admin:dashboard.lowStock') },
            { value: 'out', label: t('admin:dashboard.outOfStock') },
          ]}
          className="min-w-[140px]"
        />
        {hasFilters && (
          <button onClick={clearFilters} className="text-body-sm text-bg-primary-500 hover:text-bg-primary-600 font-medium">
            {t('admin:common.clear')}
          </button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={products}
        isLoading={isLoading}
        emptyMessage={t('admin:common.noResults')}
        emptyAction={!hasFilters ? { label: t('admin:products.create'), onClick: () => navigate('/admin/products/new') } : undefined}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        rowKey="id"
      />

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30">{t('admin:common.prev')}</button>
          <span className="text-body-sm text-bg-text-secondary">{t('admin:common.page')} {meta.page} {t('admin:common.of')} {meta.totalPages}</span>
          <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30">{t('admin:common.next')}</button>
        </div>
      )}

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title={t('admin:products.deleteConfirm')} loading={deleting} />
    </div>
  );
}

