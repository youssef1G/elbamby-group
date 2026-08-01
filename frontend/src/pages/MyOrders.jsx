import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { lookupOrders, cancelOrder, submitReturn } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations.js';
import { useToast } from '@/components/ui/Toast.jsx';

const STATUS_STYLE = {
  pending: 'bg-bg-warning/10 text-bg-warning border-bg-warning/30',
  confirmed: 'bg-bg-info/10 text-bg-info border-bg-info/30',
  shipped: 'bg-bg-info/10 text-bg-info border-bg-info/30',
  delivered: 'bg-bg-success/10 text-bg-success border-bg-success/30',
  cancelled: 'bg-bg-neutral-100 dark:bg-bg-neutral-800 text-bg-text-secondary border-bg-border',
};

function ReturnForm({ orderId, onClose }) {
  const { t } = useLocale();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState('');

  const reasons = [
    { value: 'damaged', label: t('support:return.damaged') },
    { value: 'wrong', label: t('support:return.wrong') },
    { value: 'not_as_described', label: t('support:return.notAsDescribed') },
    { value: 'changed_mind', label: t('support:return.changedMind') },
    { value: 'other', label: t('support:return.other') },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitReturn({ order_id: orderId, reason, details });
      setOk(true);
    } catch (err) {
      setError(err.message || t('common:common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (ok) return (
    <div className="mt-4 surface-card p-5 text-center">
      <p className="text-2xl mb-2">✓</p>
      <p className="text-sm font-semibold text-bg-success">{t('support:return.success')}</p>
    </div>
  );

  return (
    <div className="mt-4 surface-card p-5 space-y-4">
      <p className="text-sm font-heading font-semibold text-bg-text-primary">{t('support:return.requestReturn')}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <select value={reason} onChange={e => setReason(e.target.value)} className="w-full rounded-xl border border-bg-border px-4 py-3 text-sm bg-bg-surface text-bg-text-primary focus:outline-none focus:ring-2 focus:ring-bg-primary-500">
          <option value="">{t('support:return.selectReason')}</option>
          {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder={t('support:return.details')} className="w-full rounded-xl border border-bg-border px-4 py-3 text-sm bg-bg-surface text-bg-text-primary focus:outline-none focus:ring-2 focus:ring-bg-primary-500 resize-none" />
        {error && <p className="text-xs text-bg-error">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={loading || !reason} className="btn-primary flex-1 text-sm disabled:opacity-50">{loading ? t('common:common.loading') : t('support:return.submit')}</button>
          <button type="button" onClick={onClose} className="btn-secondary text-sm">{t('support:return.cancel')}</button>
        </div>
      </form>
    </div>
  );
}

function OrderCard({ order }) {
  const { t, isAr } = useLocale();
  const { toast } = useToast();
  const [returning, setReturning] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!window.confirm(t('tracking.cancelConfirm', { ns: 'common' }))) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id, order.customer?.phone || '');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  }

  function formatDate(str) {
    if (!str) return '—';
    try { return new Date(str).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return '—'; }
  }

  const eStatus = (s) => {
    if (s === 'pending') return t('tracking.status_pending', { ns: 'common' });
    if (s === 'confirmed') return t('tracking.status_confirmed', { ns: 'common' });
    if (s === 'shipped') return t('tracking.status_shipped', { ns: 'common' });
    if (s === 'delivered') return t('tracking.status_delivered', { ns: 'common' });
    if (s === 'cancelled') return t('tracking.status_cancelled', { ns: 'common' });
    return order.status;
  };

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-bg-text-secondary mb-1">{order.order_number || order.id}</p>
          <p className="text-xs text-bg-text-secondary">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 ${STATUS_STYLE[order.status] || STATUS_STYLE.pending}`}>
            {eStatus(order.status)}
          </span>
          <span className="font-semibold text-sm text-bg-text-primary ltr-nums">{formatPrice(order.total)}</span>
        </div>
      </div>

      <ul className="text-xs text-bg-text-secondary space-y-1 border-t border-bg-border pt-3">
        {(order.items || []).slice(0, 3).map((item, i) => (
          <li key={i} className="flex justify-between">
            <span>{item.quantity} × {isAr ? (item.nameAr || item.nameEn || '—') : (item.nameEn || item.nameAr || '—')}</span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link to={`/track-order?order=${order.order_number || order.id}&phone=${order.customer?.phone || ''}`} className="text-xs font-semibold text-bg-primary-500 border border-bg-primary-500/30 rounded-full px-4 py-1.5 hover:bg-bg-primary-50 transition-colors">
          {t('myOrders.track', { ns: 'common' })}
        </Link>
        {order.status === 'pending' && (
          <button onClick={handleCancel} disabled={cancelling} className="text-xs font-medium text-bg-error border border-bg-error/20 rounded-full px-4 py-1.5 hover:bg-bg-neutral-100 transition-colors disabled:opacity-50">
            {t('tracking.cancelTitle', { ns: 'common' })}
          </button>
        )}
        {order.status === 'delivered' && (
          <button onClick={() => setReturning((v) => !v)} className="text-xs font-medium border rounded-full px-4 py-1.5 transition-colors border-bg-border text-bg-text-secondary hover:border-bg-primary-500/30">
            {t('myOrders.requestReturn', { ns: 'common' })}
          </button>
        )}
      </div>

      {returning && <ReturnForm orderId={order.id} onClose={() => setReturning(false)} />}
    </div>
  );
}

export default function MyOrders() {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('idle');

  async function handleLookup(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setStatus('loading');
    try {
      const data = await lookupOrders(q);
      setOrders(data.data || data || []);
      setStatus('done');
    } catch {
      setOrders([]);
      setStatus('done');
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <motion.div className="text-center mb-10" {...fadeUp}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-primary-50 border border-bg-primary-500/10 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bg-primary-500">
            {t('myOrders.title', { ns: 'common' })}
          </span>
        </div>
        <h1 className="text-display text-bg-text-primary mb-2">{t('myOrders.title', { ns: 'common' })}</h1>
        <p className="text-sm text-bg-text-secondary">{t('myOrders.formTitle', { ns: 'common' })}</p>
      </motion.div>

      <motion.div
        className="surface-card p-5 sm:p-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      >
        <form onSubmit={handleLookup} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('myOrders.phone', { ns: 'common' })}
              required
              className="flex-1 rounded-full border border-bg-border px-5 py-3 text-sm bg-bg-surface text-bg-text-primary focus:outline-none focus:ring-2 focus:ring-bg-primary-500"
            />
            <button type="submit" disabled={status === 'loading'} className="btn-primary text-sm disabled:opacity-50 whitespace-nowrap">
              {status === 'loading' ? t('common:common.loading') : t('myOrders.submit', { ns: 'common' })}
            </button>
          </div>
        </form>
      </motion.div>

      {status === 'done' && (
        orders.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <p className="text-sm text-bg-text-secondary">{t('myOrders.noOrders', { ns: 'common' })}</p>
            <Link to="/shop" className="btn-primary text-sm">{t('nav.shop', { ns: 'common' })}</Link>
          </div>
        ) : (
          <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.05 }}>
            {orders.map((order) => (
              <motion.div key={order.id} variants={staggerItem}>
                <OrderCard order={order} />
              </motion.div>
            ))}
          </motion.div>
        )
      )}
    </div>
  );
}