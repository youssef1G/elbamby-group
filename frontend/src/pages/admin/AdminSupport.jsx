import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import {
  fetchComplaints,
  fetchReturns,
  updateSupportComplaint,
  updateSupportReturn,
  deleteSupportComplaint,
  deleteSupportReturn,
} from '@/api.js';
import Select from '@/components/ui/Select.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { formatDate } from '@/lib/formatters.js';
import { COMPLAINT_STATUSES, RETURN_STATUSES } from '@/lib/constants.js';

const STATUS_BADGE = {
  open: 'bg-bg-info/10 text-bg-info border-bg-info/30',
  in_progress: 'bg-bg-warning/10 text-bg-warning border-bg-warning/30',
  resolved: 'bg-bg-success/10 text-bg-success border-bg-success/30',
  closed: 'bg-bg-surface-sunken text-bg-text-secondary border-bg-border',
  pending: 'bg-bg-warning/10 text-bg-warning border-bg-warning/30',
  approved: 'bg-bg-info/10 text-bg-info border-bg-info/30',
  rejected: 'bg-bg-error/10 text-bg-error border-bg-error/30',
  completed: 'bg-bg-success/10 text-bg-success border-bg-success/30',
};

const DEFAULT_BADGE = 'bg-bg-surface-sunken text-bg-text-secondary border-bg-border';

function SupportCard({ item, type, t, isAr, saving, onStatusChange, onDelete }) {
  const statusMap = type === 'complaints' ? COMPLAINT_STATUSES : RETURN_STATUSES;

  const statusLabel = (status) => {
    const l = statusMap[status];
    return l ? (isAr ? l.ar : l.en) : status;
  };

  return (
    <div className="surface-card p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-caption text-bg-text-secondary ltr-nums" dir="ltr">
            {item.id}
          </span>
          <span className={`text-caption font-semibold border rounded-full px-2.5 py-0.5 ${STATUS_BADGE[item.status] || DEFAULT_BADGE}`}>
            {statusLabel(item.status)}
          </span>
        </div>
        <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
          {formatDate(item.createdAt)}
        </span>
      </div>
      <div className="text-body-sm space-y-1.5">
        {item.name && <p className="font-semibold text-bg-text-primary">{item.name}</p>}
        {item.phone && <p className="text-caption text-bg-text-secondary" dir="ltr">{item.phone}</p>}
        {item.email && <p className="text-caption text-bg-text-secondary" dir="ltr">{item.email}</p>}
        {item.orderNumber && (
          <p className="text-caption text-bg-text-secondary">
            {t('admin:support.order')}{' '}
            <span className="font-mono ltr-nums" dir="ltr">#{item.orderNumber}</span>
          </p>
        )}
        {item.reason && (
          <p className="text-caption text-bg-text-primary">
            <span className="font-semibold">{t('admin:support.reason')}</span> {item.reason}
          </p>
        )}
        {item.message && <p className="text-caption text-bg-text-secondary">{item.message}</p>}
        {item.details && <p className="text-caption text-bg-text-secondary italic">{item.details}</p>}
      </div>
      <div className="flex items-center gap-3 pt-3 border-t border-bg-border">
        <div className="flex-1 min-w-[160px]">
          <Select
            value={item.status}
            onChange={(val) => onStatusChange(item, type, val)}
            options={Object.keys(statusMap).map((k) => ({ value: k, label: statusLabel(k) }))}
          />
        </div>
        {saving && (
          <span className="text-caption text-bg-text-secondary animate-pulse whitespace-nowrap">
            {t('admin:orders.saving')}
          </span>
        )}
        <button
          onClick={() => onDelete(item, type)}
          className="text-caption text-bg-text-secondary hover:text-bg-error transition-colors"
        >
          {t('admin:common.delete')}
        </button>
      </div>
    </div>
  );
}

export default function AdminSupport() {
  const { t, isAr } = useLocale();
  const { toast } = useToast();

  const [tab, setTab] = useState('complaints');
  const [savingStatus, setSavingStatus] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [complaints, setComplaints] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchComplaints(), fetchReturns()])
      .then(([c, r]) => {
        if (!cancelled) {
          setComplaints(c?.data || []);
          setReturns(r?.data || []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [reload]);

  const pendingComplaints = complaints.filter((c) => ['open', 'in_progress'].includes(c.status)).length;
  const pendingReturns = returns.filter((r) => r.status === 'pending').length;

  const handleStatusChange = async (item, type, status) => {
    if (status === item.status) return;
    setSavingStatus((s) => ({ ...s, [item.id]: true }));
    try {
      if (type === 'complaints') {
        await updateSupportComplaint(item.id, { status });
      } else {
        await updateSupportReturn(item.id, { status });
      }
      toast(t('admin:support.statusUpdated'), 'success');
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setSavingStatus((s) => ({ ...s, [item.id]: false }));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'complaints') {
        await deleteSupportComplaint(deleteTarget.id);
      } else {
        await deleteSupportReturn(deleteTarget.id);
      }
      toast(t('admin:support.deleted'), 'success');
      setDeleteTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const deleteTypeLabel = deleteTarget
    ? deleteTarget.type === 'complaints'
      ? t('admin:support.complaints')
      : t('admin:support.returns')
    : '';

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
        <h1 className="font-heading text-xl font-bold text-bg-text-primary">{t('admin:support.title')}</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="flex gap-2"
      >
        <button
          onClick={() => setTab('complaints')}
          className={`px-4 py-2 rounded-full text-body-sm font-medium transition-colors ${
            tab === 'complaints'
              ? 'bg-bg-primary-500 text-white'
              : 'text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-surface-sunken'
          }`}
        >
          {t('admin:support.complaints')}
          {pendingComplaints > 0 && (
            <span className="ms-1.5 bg-white text-bg-primary-500 text-caption rounded-full px-1.5 py-0.5">
              {pendingComplaints}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('returns')}
          className={`px-4 py-2 rounded-full text-body-sm font-medium transition-colors ${
            tab === 'returns'
              ? 'bg-bg-primary-500 text-white'
              : 'text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-surface-sunken'
          }`}
        >
          {t('admin:support.returns')}
          {pendingReturns > 0 && (
            <span className="ms-1.5 bg-white text-bg-primary-500 text-caption rounded-full px-1.5 py-0.5">
              {pendingReturns}
            </span>
          )}
        </button>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="pt-3 border-t border-bg-border">
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {tab === 'complaints'
            ? complaints.length === 0 ? (
                <p className="text-body-sm text-bg-text-secondary text-center py-10">{t('admin:support.noComplaints')}</p>
              ) : (
                complaints.map((c, idx) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                  >
                    <SupportCard
                      item={c}
                      type="complaints"
                      t={t}
                      isAr={isAr}
                      saving={savingStatus[c.id]}
                      onStatusChange={handleStatusChange}
                      onDelete={(item, type) => setDeleteTarget({ id: item.id, type })}
                    />
                  </motion.div>
                ))
              )
            : returns.length === 0 ? (
                <p className="text-body-sm text-bg-text-secondary text-center py-10">{t('admin:support.noReturns')}</p>
              ) : (
                returns.map((r, idx) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.05 }}
                  >
                    <SupportCard
                      item={r}
                      type="returns"
                      t={t}
                      isAr={isAr}
                      saving={savingStatus[r.id]}
                      onStatusChange={handleStatusChange}
                      onDelete={(item, type) => setDeleteTarget({ id: item.id, type })}
                    />
                  </motion.div>
                ))
              )}
        </motion.div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={t('admin:common.delete')}
        description={t('admin:support.deleteConfirm', { type: deleteTypeLabel })}
        confirmLabel={t('admin:common.delete')}
        loading={deleting}
      />
    </motion.div>
  );
}