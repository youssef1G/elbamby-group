import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fetchComplaints, fetchReturns, updateSupportComplaint, updateSupportReturn } from '@/api.js';
import DataTable from '@/components/admin/DataTable.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { formatDate } from '@/lib/formatters.js';

const statusBadge = {
  pending: 'info',
  resolved: 'in-stock',
  closed: 'out-of-stock',
};

export default function AdminSupport() {
  const { t, isAr } = useLocale();
  const { toast } = useToast();

  const [tab, setTab] = useState('complaints');
  const [detailTarget, setDetailTarget] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);

  const [complaintsData, setComplaintsData] = useState(null);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [returnsData, setReturnsData] = useState(null);
  const [returnsLoading, setReturnsLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setComplaintsLoading(true);
    fetchComplaints()
      .then((res) => { if (!cancelled) setComplaintsData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setComplaintsLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    setReturnsLoading(true);
    fetchReturns()
      .then((res) => { if (!cancelled) setReturnsData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReturnsLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const complaints = complaintsData?.data || [];
  const returns = returnsData?.data || [];

  const openDetail = (item) => {
    setDetailTarget(item);
    setResponseText(item.admin_response || '');
  };

  const handleResponse = async () => {
    if (!detailTarget) return;
    try {
      setSaving(true);
      if (tab === 'complaints') {
        await updateSupportComplaint(detailTarget.id, { admin_response: responseText, status: 'resolved' });
        toast(t('admin:support.responseSaved'), 'success');
      } else {
        await updateSupportReturn(detailTarget.id, { admin_response: responseText, status: 'resolved' });
        toast(t('admin:support.responseSaved'), 'success');
      }
      setDetailTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const complaintColumns = [
    { key: 'name', label: t('common:contact.name'), render: (r) => <span className="text-bg-text-primary">{r.name}</span> },
    { key: 'phone', label: t('common:contact.phone'), render: (r) => <span className="text-bg-text-secondary" dir="ltr">{r.phone}</span> },
    { key: 'message', label: t('admin:support.message'), render: (r) => <span className="text-bg-text-secondary truncate max-w-[200px] block">{r.message}</span> },
    {
      key: 'status',
      label: t('admin:support.status'),
      render: (r) => <Badge variant={statusBadge[r.status] || 'info'}>{r.status}</Badge>,
    },
    {
      key: 'date',
      label: t('admin:support.date'),
      render: (r) => <span className="text-bg-text-secondary ltr-nums" dir="ltr">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button onClick={() => openDetail(r)} className="text-body-sm text-bg-primary-500 hover:text-bg-primary-600">
          {t('admin:support.saveResponse')}
        </button>
      ),
    },
  ];

  const returnColumns = [
    { key: 'orderNumber', label: t('admin:orders.orderNumber'), render: (r) => <span className="font-mono text-bg-text-primary" dir="ltr">#{r.order_number}</span> },
    { key: 'reason', label: t('admin:support.reason'), render: (r) => <span className="text-bg-text-secondary truncate max-w-[200px] block">{r.reason}</span> },
    {
      key: 'status',
      label: t('admin:support.status'),
      render: (r) => <Badge variant={statusBadge[r.status] || 'info'}>{r.status}</Badge>,
    },
    {
      key: 'date',
      label: t('admin:support.date'),
      render: (r) => <span className="text-bg-text-secondary ltr-nums" dir="ltr">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <button onClick={() => openDetail(r)} className="text-body-sm text-bg-primary-500 hover:text-bg-primary-600">
          {t('admin:support.saveResponse')}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-h2 font-semibold text-bg-text-primary">{t('admin:support.title')}</h1>

      <div className="flex gap-1 border-b border-bg-border">
        <button
          onClick={() => setTab('complaints')}
          className={`px-4 py-2 text-body-sm font-medium transition-colors border-b-2 -mb-[1px] ${
            tab === 'complaints' ? 'border-bg-primary-500 text-bg-primary-500' : 'border-transparent text-bg-text-secondary hover:text-bg-text-primary'
          }`}
        >
          {t('admin:support.complaints')}
        </button>
        <button
          onClick={() => setTab('returns')}
          className={`px-4 py-2 text-body-sm font-medium transition-colors border-b-2 -mb-[1px] ${
            tab === 'returns' ? 'border-bg-primary-500 text-bg-primary-500' : 'border-transparent text-bg-text-secondary hover:text-bg-text-primary'
          }`}
        >
          {t('admin:support.returns')}
        </button>
      </div>

      {tab === 'complaints' ? (
        <DataTable
          columns={complaintColumns}
          data={complaints}
          isLoading={complaintsLoading}
          emptyMessage={t('admin:common.noResults')}
        />
      ) : (
        <DataTable
          columns={returnColumns}
          data={returns}
          isLoading={returnsLoading}
          emptyMessage={t('admin:common.noResults')}
        />
      )}

      <Modal isOpen={!!detailTarget} onClose={() => setDetailTarget(null)} size="md">
        <div className="p-6 space-y-4">
          <h3 className="text-body font-semibold text-bg-text-primary">
            {tab === 'complaints' ? t('admin:support.complaints') : t('admin:support.returns')}
          </h3>

          {detailTarget && (
            <>
              <div className="space-y-2">
                {tab === 'complaints' && (
                  <>
                    <p className="text-body-sm"><span className="text-bg-text-secondary">{t('common:contact.name')}:</span> {detailTarget.name}</p>
                    <p className="text-body-sm"><span className="text-bg-text-secondary">{t('common:contact.phone')}:</span> {detailTarget.phone}</p>
                    {detailTarget.email && <p className="text-body-sm"><span className="text-bg-text-secondary">{t('common:contact.email')}:</span> {detailTarget.email}</p>}
                    <p className="text-body-sm text-bg-text-secondary">{t('admin:support.message')}:</p>
                    <p className="text-body-sm text-bg-text-primary bg-bg-surface-sunken rounded-md p-3">{detailTarget.message}</p>
                  </>
                )}
                {tab === 'returns' && (
                  <>
                    <p className="text-body-sm"><span className="text-bg-text-secondary">{t('admin:orders.orderNumber')}:</span> #{detailTarget.order_number}</p>
                    <p className="text-body-sm"><span className="text-bg-text-secondary">{t('admin:support.reason')}:</span></p>
                    <p className="text-body-sm text-bg-text-primary bg-bg-surface-sunken rounded-md p-3">{detailTarget.reason}</p>
                  </>
                )}
              </div>

              <div>
                <label className="text-body-sm font-medium text-bg-text-primary ps-0.5 block mb-1">
                  {t('admin:support.adminResponse')}
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                  className="input-base w-full bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/50 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setDetailTarget(null)}>
                  {t('admin:common.cancel')}
                </Button>
                <Button
                  onClick={handleResponse}
                  loading={saving}
                  disabled={!responseText}
                >
                  {t('admin:support.saveResponse')}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
