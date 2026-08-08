import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { fetchCustomer, fetchCustomerPointsHistory } from '@/api.js';
import Skeleton from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import AddPointsModal from '@/components/admin/AddPointsModal.jsx';
import { formatDate } from '@/lib/formatters.js';
import { ArrowRight, Plus, Minus, Mail } from 'lucide-react';

const TYPE_KEYS = {
  earn: 'admin:customerDetail.typeEarn',
  redeem: 'admin:customerDetail.typeRedeem',
  refund_reversal: 'admin:customerDetail.typeRefundReversal',
  manual_grant: 'admin:customerDetail.typeManualGrant',
  manual_deduct: 'admin:customerDetail.typeManualDeduct',
  signup_bonus: 'admin:customerDetail.typeSignupBonus',
};

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const { t } = useLocale();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [customer, setCustomer] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);

  const loadHistory = useCallback(
    (p) => {
      fetchCustomerPointsHistory(id, { page: p, limit: 15 })
        .then(setHistory)
        .catch(() => {});
    },
    [id],
  );

  useEffect(() => {
    setCustomer(null);
    setNotFound(false);
    setHistory(null);
    setPage(1);
    fetchCustomer(id)
      .then(setCustomer)
      .catch(() => setNotFound(true));
    loadHistory(1);
  }, [id, loadHistory]);

  const rows = history?.data || [];
  const meta = history?.meta || {};

  if (notFound) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/admin/customers')}
          className="btn-ghost !min-h-0 h-9 px-4 text-body-sm"
        >
          <ArrowRight size={15} className="rtl:-scale-x-100" aria-hidden="true" />
          {t('admin:customerDetail.back')}
        </button>
        <EmptyState message={t('admin:customerDetail.loadError')} />
      </div>
    );
  }

  const typeLabel = (type) => t(TYPE_KEYS[type] || 'admin:customerDetail.typeEarn');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <button
        onClick={() => navigate('/admin/customers')}
        className="btn-ghost !min-h-0 h-9 px-4 text-body-sm"
      >
        <ArrowRight size={15} className="rtl:-scale-x-100" aria-hidden="true" focusable="false" />
        {t('admin:customerDetail.back')}
      </button>

      <div className="surface-card p-6">
        {!customer ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-full bg-bg-primary-500/10 flex items-center justify-center shrink-0">
                <span className="font-heading text-lg font-bold text-bg-primary-500">
                  {(customer.name || '?').trim().charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="font-heading text-xl font-bold text-bg-text-primary truncate">
                  {customer.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-bg-text-secondary mt-0.5">
                  <span dir="ltr">{customer.phone}</span>
                  <span className="inline-flex items-center gap-1" title={t('admin:customerDetail.email')}>
                    <Mail size={12} aria-hidden="true" />
                    {customer.email || t('admin:customerDetail.noEmail')}
                  </span>
                  <span>{t('admin:customerDetail.memberSince', { date: formatDate(customer.createdAt) })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-end">
                <p className="text-caption text-bg-text-secondary">
                  {t('admin:customerDetail.pointsBalance')}
                </p>
                <p
                  className="font-heading text-2xl font-bold text-bg-primary-500 ltr-nums leading-tight"
                  dir="ltr"
                >
                  {Number(customer.pointsBalance ?? 0).toLocaleString('en-US')}
                </p>
              </div>
              <button
                onClick={() => setAddOpen(true)}
                className="btn-primary !min-h-0 h-10 px-4 text-body-sm"
              >
                <Plus size={15} aria-hidden="true" focusable="false" />
                {t('admin:customerDetail.addPoints')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-heading text-body-sm font-bold text-bg-text-primary mb-3">
          {t('admin:customerDetail.history')}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-bg-border bg-bg-surface">
          <table className="w-full">
            <thead className="bg-bg-surface-sunken/50">
              <tr>
                {[
                  { key: 'date', label: t('admin:customerDetail.date') },
                  { key: 'type', label: t('admin:customerDetail.type') },
                  { key: 'points', label: t('admin:customerDetail.points') },
                  { key: 'balanceAfter', label: t('admin:customerDetail.balanceAfter') },
                  { key: 'note', label: t('admin:customerDetail.note'), responsive: 'hidden md:table-cell' },
                ].map((col) => (
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
              {!history ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-t border-bg-border">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[100px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState message={t('admin:customerDetail.noHistory')} />
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-bg-border hover:bg-bg-surface-sunken/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                        {formatDate(r.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-caption text-bg-text-primary">{typeLabel(r.type)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-0.5 text-caption font-bold ltr-nums ${
                          r.points > 0 ? 'text-bg-success' : 'text-bg-error'
                        }`}
                        dir="ltr"
                      >
                        {r.points > 0 ? (
                          <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                        ) : (
                          <Minus size={12} strokeWidth={2.5} aria-hidden="true" />
                        )}
                        {Math.abs(r.points).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                        {Number(r.balanceAfter ?? 0).toLocaleString('en-US')}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-caption text-bg-text-secondary max-w-[280px] block truncate">
                        {r.note || '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => {
                setPage((p) => p - 1);
                loadHistory(page - 1);
              }}
              className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
            >
              {t('admin:common.prev')}
            </button>
            <span className="text-body-sm text-bg-text-secondary">
              {t('admin:common.page')} {meta.page} {t('admin:common.of')} {meta.totalPages}
            </span>
            <button
              disabled={page >= meta.totalPages}
              onClick={() => {
                setPage((p) => p + 1);
                loadHistory(page + 1);
              }}
              className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
            >
              {t('admin:common.next')}
            </button>
          </div>
        )}
      </div>

      <AddPointsModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        initialCustomer={customer}
        onAdjustApplied={(updated, mode) => {
          setCustomer(updated);
          setPage(1);
          loadHistory(1);
          const points = Number(updated.pointsBalance).toLocaleString('en-US');
          toast(
            t(mode === 'deduct' ? 'admin:addPoints.successDeduct' : 'admin:addPoints.successGrant', {
              points,
              name: updated.name,
            }),
            'success',
          );
        }}
      />
    </motion.div>
  );
}
