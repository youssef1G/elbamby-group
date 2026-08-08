import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchOrder, updateOrderStatus, updateOrderNote } from '@/api.js';
import Badge from '@/components/ui/Badge.jsx';
import Button from '@/components/ui/Button.jsx';
import Select from '@/components/ui/Select.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { formatDate, formatPrice, formatPhone } from '@/lib/formatters.js';
import { ORDER_STATUSES } from '@/lib/constants.js';

const statusBadge = {
  pending: 'info',
  confirmed: 'info',
  processing: 'info',
  shipped: 'info',
  delivered: 'in-stock',
  cancelled: 'out-of-stock',
  returned: 'out-of-stock',
};

export default function AdminOrderDetail() {
  const { t, isAr } = useLocale();
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [statusPending, setStatusPending] = useState(false);
  const [notePending, setNotePending] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState('');
  const [note, setNote] = useState('');
  const [noteDirty, setNoteDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchOrder(id)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          // seed the note editor once the order loads (api returns camelCase)
          if (res) setNote(res.adminNote || '');
        }
      })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id, reload]);

  const order = data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-bg-text-secondary">{t('common:common.error')}</p>
        <Button variant="ghost" onClick={() => navigate('/admin/orders')} className="mt-4">
          {t('admin:common.back')}
        </Button>
      </div>
    );
  }

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    try {
      setStatusPending(true);
      await updateOrderStatus(order.id, { status: selectedStatus });
      toast(t('admin:orders.statusUpdated'), 'success');
      setSelectedStatus('');
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setStatusPending(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      setNotePending(true);
      await updateOrderNote(order.id, note);
      toast(t('admin:orders.noteSaved'), 'success');
      setNoteDirty(false);
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setNotePending(false);
    }
  };

  const statusKey = order.status || 'pending';
  const statusLabel = ORDER_STATUSES[statusKey];
  const statusHistory = order.orderStatusHistory || order.statusHistory || [];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/orders')} className="btn-ghost !min-h-0 h-8 w-8 flex items-center justify-center text-bg-text-secondary" aria-label={t('admin:common.back')}>
          <svg className="rtl:-scale-x-100" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <h1 className="text-h2 font-semibold text-bg-text-primary">
          {t('admin:orders.detail')} <span className="font-mono ltr-nums" dir="ltr">#{order.orderNumber}</span>
        </h1>
        <Badge variant={statusBadge[statusKey] || 'info'}>
          {statusLabel ? (isAr ? statusLabel.ar : statusLabel.en) : statusKey}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-bg-surface border border-bg-border rounded-md p-5 space-y-3">
          <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:orders.customerInfo')}</h2>
          <div className="space-y-1.5">
            <p className="text-body-sm text-bg-text-primary">{order.customerName}</p>
            <p className="text-body-sm text-bg-text-secondary" dir="ltr">{formatPhone(order.phone)}</p>
            {order.email && <p className="text-body-sm text-bg-text-secondary">{order.email}</p>}
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-md p-5 space-y-3">
          <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:orders.deliveryAddress')}</h2>
          <div className="space-y-1.5">
            <p className="text-body-sm text-bg-text-primary">{order.addressLine}</p>
          </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-md p-5 space-y-4">
        <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:orders.items')}</h2>
        <div className="divide-y divide-bg-border">
          {(order.orderItems || order.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="w-12 h-12 rounded overflow-hidden bg-bg-surface-sunken flex-shrink-0">
                {item.productImageSnapshot ? (
                  <img src={item.productImageSnapshot} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-caption text-bg-text-secondary">—</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-bg-text-primary truncate">
                  {item.productNameSnapshot}
                </p>
                <p className="text-caption text-bg-text-secondary">
                  {item.quantity} × {formatPrice(item.unitPriceSnapshot)}
                </p>
              </div>
              <p className="text-body-sm font-medium text-bg-text-primary ltr-nums" dir="ltr">
                {formatPrice(item.lineTotal ?? (item.unitPriceSnapshot * item.quantity))}
              </p>
            </div>
          ))}
        </div>
        <div className="border-t border-bg-border pt-3 space-y-1">
          <div className="flex justify-between text-body-sm text-bg-text-secondary">
            <span>{t('admin:orders.subtotal')}</span>
            <span className="ltr-nums" dir="ltr">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-body-sm text-bg-text-secondary">
            <span>{t('admin:orders.shipping')}</span>
            <span className="ltr-nums" dir="ltr">{formatPrice(order.shippingFee)}</span>
          </div>
          <div className="flex justify-between text-body font-semibold text-bg-text-primary">
            <span>{t('admin:orders.total')}</span>
            <span className="ltr-nums" dir="ltr">{formatPrice(order.total)}</span>
          </div>
          <p className="text-caption text-bg-text-secondary pt-1">{t('admin:orders.paymentMethod')}</p>
        </div>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-md p-5 space-y-4">
        <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:orders.changeStatus')}</h2>
        <div className="flex items-center gap-3">
          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
            placeholder={t('admin:common.select')}
            options={Object.entries(ORDER_STATUSES).map(([key, val]) => ({
              value: key,
              label: isAr ? val.ar : val.en,
              disabled: key === order.status,
            }))}
            className="min-w-[180px]"
          />
          <Button
            size="sm"
            onClick={handleStatusChange}
            loading={statusPending}
            disabled={!selectedStatus || statusPending}
          >
            {t('admin:orders.changeStatus')}
          </Button>
        </div>

        {order.notes && (
          <div>
            <p className="text-body-sm text-bg-text-secondary">{t('admin:orders.notes')}</p>
            <p className="text-body-sm text-bg-text-primary mt-1">{order.notes}</p>
          </div>
        )}
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-md p-5 space-y-4">
        <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:orders.adminNote')}</h2>
        <textarea
          value={note}
          onChange={(e) => { setNote(e.target.value); setNoteDirty(true); }}
          placeholder={t('admin:orders.adminNotePlaceholder')}
          rows={3}
          className="input-base w-full bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/50 resize-y"
        />
        <Button
          size="sm"
          onClick={handleSaveNote}
          loading={notePending}
          disabled={!noteDirty || notePending}
        >
          {t('admin:orders.saveNote')}
        </Button>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-md p-5 space-y-4">
        <h2 className="text-body font-semibold text-bg-text-primary">{t('admin:orders.statusTimeline')}</h2>
        {statusHistory.length === 0 ? (
          <p className="text-body-sm text-bg-text-secondary">{t('common:common.nothing')}</p>
        ) : (
          <div className="space-y-3">
            {statusHistory.map((entry, i) => {
              const es = ORDER_STATUSES[entry.status] || { en: entry.status, ar: entry.status };
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-bg-primary-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-body-sm font-medium text-bg-text-primary">
                      {isAr ? es.ar : es.en}
                    </p>
                    <p className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                      {formatDate(entry.createdAt)}
                    </p>
                    {entry.note && (
                      <p className="text-body-sm text-bg-text-secondary mt-0.5">{entry.note}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
