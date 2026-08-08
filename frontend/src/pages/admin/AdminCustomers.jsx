import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fetchCustomers, deleteAdminCustomer } from '@/api.js';
import Skeleton from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import AddPointsModal from '@/components/admin/AddPointsModal.jsx';
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx';
import { formatDate, formatPrice } from '@/lib/formatters.js';
import { useToast } from '@/components/ui/Toast.jsx';
import { Search, Plus, ChevronRight, Trash2 } from 'lucide-react';

export default function AdminCustomers() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const reload = () => {
    fetchCustomers({ page, limit: 20, search }).then(setData).catch(() => {});
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchCustomers({ page, limit: 20, search })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteAdminCustomer(deleteTarget.id);
      toast(t('admin:customers.deleted'), 'success');
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const customers = data?.data || [];
  const meta = data?.meta || {};

  const columns = [
    { key: 'name', label: t('admin:customers.name') },
    { key: 'phone', label: t('admin:customers.phone') },
    { key: 'pointsBalance', label: t('admin:customers.pointsBalance') },
    { key: 'orders', label: t('admin:customers.orders'), responsive: 'hidden sm:table-cell' },
    { key: 'total', label: t('admin:customers.totalSpent'), responsive: 'hidden sm:table-cell' },
    { key: 'lastOrder', label: t('admin:customers.lastOrder'), responsive: 'hidden sm:table-cell' },
    { key: 'joined', label: t('admin:customers.joined'), responsive: 'hidden md:table-cell' },
  ];

  const cell = (key, c) => {
    switch (key) {
      case 'name':
        return (
          <span className="text-body-sm font-medium text-bg-text-primary">{c.name || '—'}</span>
        );
      case 'phone':
        return (
          <span className="text-caption text-bg-text-secondary" dir="ltr">
            {c.phone}
          </span>
        );
      case 'pointsBalance':
        return (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-bg-primary-500/10 px-2.5 py-0.5 text-caption font-semibold text-bg-primary-500 ltr-nums"
            dir="ltr"
          >
            {Number(c.pointsBalance ?? 0).toLocaleString('en-US')}
          </span>
        );
      case 'orders':
        return (
          <span className="text-caption font-semibold text-bg-text-primary ltr-nums" dir="ltr">
            {c.orderCount || 0}
          </span>
        );
      case 'total':
        return (
          <span className="text-caption font-semibold text-bg-text-primary ltr-nums" dir="ltr">
            {formatPrice(c.totalSpent ?? 0)}
          </span>
        );
      case 'lastOrder':
        return (
          <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
            {formatDate(c.lastOrderDate)}
          </span>
        );
      case 'joined':
        return (
          <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
            {formatDate(c.joinedDate)}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
        >
          <h1 className="font-heading text-xl font-bold text-bg-text-primary">
            {t('admin:customers.title')}
          </h1>
          <p className="text-xs text-bg-text-secondary mt-1">
            {t('admin:customers.subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary !min-h-0 h-9 px-4 text-body-sm"
          >
            <Plus size={15} aria-hidden="true" focusable="false" />
            {t('admin:customers.addPoints')}
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="relative max-w-xs"
      >
        <Search
          size={14}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t('admin:customers.searchPlaceholder')}
          className="w-full text-body-sm surface-card h-9 ps-9 pe-4 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:border-bg-primary-500"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="overflow-x-auto rounded-lg border border-bg-border bg-bg-surface"
      >
        <table className="w-full">
          <thead className="bg-bg-surface-sunken/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary whitespace-nowrap text-start ${col.responsive || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t border-bg-border">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState message={t('admin:customers.noCustomers')} />
                </td>
              </tr>
            ) : (
              customers.map((c, idx) => (
                <motion.tr
                  key={c.id || c.phone}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  onClick={c.id ? () => navigate(`/admin/customers/${c.id}`) : undefined}
                  className={`border-t border-bg-border transition-colors ${
                    c.id ? 'hover:bg-bg-surface-sunken/30 cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 whitespace-nowrap ${col.responsive || ''}`}
                    >
                      {cell(col.key, c)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-end w-10">
                    {c.id ? (
                      <button
                        aria-label={t('admin:customers.removeLabel')}
                        className="text-bg-text-secondary/50 hover:text-bg-error transition-colors p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(c);
                        }}
                      >
                        <Trash2 size={16} aria-hidden="true" focusable="false" />
                      </button>
                    ) : (
                      <ChevronRight
                        size={16}
                        className="text-bg-text-secondary/50 inline-block rtl:-scale-x-100"
                        aria-hidden="true"
                        focusable="false"
                      />
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
          >
            {t('admin:common.prev')}
          </button>
          <span className="text-body-sm text-bg-text-secondary">
            {t('admin:common.page')} {meta.page} {t('admin:common.of')} {meta.totalPages}
          </span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
          >
            {t('admin:common.next')}
          </button>
        </div>
      )}

      <AddPointsModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAdjustApplied={reload}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title={t('admin:customers.removeTitle')}
        description={t('admin:customers.removeDesc', { name: deleteTarget?.name || '' })}
        confirmLabel={t('admin:customers.removeConfirm')}
      />
    </motion.div>
  );
}
