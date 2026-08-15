import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Loader2, RotateCcw } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { lookupOrders, cancelOrder, submitReturn, fetchProducts } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { AUTO_REFRESH_MS } from '@/lib/constants.js';
import { ORDER_STATUSES } from '@/lib/constants.js';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations.js';
import { useToast } from '@/components/ui/Toast.jsx';
import Select from '@/components/ui/Select.jsx';

const STATUS_STYLE = {
  pending: 'bg-bg-warning/10 text-bg-warning border-bg-warning/30',
  confirmed: 'bg-bg-info/10 text-bg-info border-bg-info/30',
  shipped: 'bg-bg-info/10 text-bg-info border-bg-info/30',
  delivered: 'bg-bg-success/10 text-bg-success border-bg-success/30',
  cancelled: 'bg-bg-neutral-100 dark:bg-bg-neutral-800 text-bg-text-secondary border-bg-border',
};

const STEPS = [
  { key: 'pending' },
  { key: 'confirmed' },
  { key: 'shipped' },
  { key: 'delivered' },
];
const STATUS_IDX = { pending: 0, confirmed: 1, shipped: 2, delivered: 3 };

function ReturnForm({ order, onClose }) {
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
      // Server expects { order_number, phone, reason }; there is no separate
      // `details` column, so the free-text note is appended to the reason.
      const orderNumber = order?.orderNumber || order?.order_number || order?.id || '';
      const payload = {
        order_number: orderNumber,
        phone: order?.phone || '',
        reason: details.trim() ? `${reason}: ${details.trim()}` : reason,
      };
      if (!orderNumber || !order?.phone) throw new Error(t('support:return.missingInfo'));
      await submitReturn(payload);
      setOk(true);
    } catch (err) {
      setError(
        err.code === 'NOT_FOUND'
          ? t('support:return.notFound')
          : err.code === 'RATE_LIMITED'
          ? t('auth:errors.rateLimited')
          : err.code === 'VALIDATION_ERROR'
            ? t('support:return.validationFailed')
            : err.message || t('common.error'),
      );
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
        <Select value={reason} onChange={setReason} options={reasons} placeholder={t('support:return.selectReason')} />
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

export function OrderCard({ order, onRefresh, autoOpen }) {
  const { t, isAr } = useLocale();
  const { toast } = useToast();
  const { reorderItems } = useCart();
  const [trackingOpen, setTrackingOpen] = useState(Boolean(autoOpen));
  const [returning, setReturning] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  async function handleReorder() {
    if (reordering) return;
    setReordering(true);
    try {
      const items = order.orderItems || order.items || [];
      const ids = items.map((i) => i.productId).filter(Boolean);
      const liveMap = new Map();
      if (ids.length > 0) {
        const res = await fetchProducts({ limit: 100, is_active: 'true' });
        const list = res?.data || res || [];
        for (const p of list) liveMap.set(p.id, p);
      }
      const toAdd = items
        .map((i) => {
          const live = i.productId ? liveMap.get(i.productId) : null;
          const image = live?.productImages?.[0]?.imageUrl || i.productImage || i.productImageSnapshot || '';
          const stock = live ? (live.unlimitedStock ? 0 : live.stockQuantity ?? 0) : 0;
          const unlimited = live ? Boolean(live.unlimitedStock) : false;
          return {
            productId: i.productId,
            nameEn: live?.nameEn || i.productNameSnapshot || '',
            nameAr: live?.nameAr || i.productNameSnapshot || '',
            image,
            price: live?.price ?? (i.lineTotal && i.quantity ? i.lineTotal / i.quantity : 0),
            quantity: i.quantity,
            stock,
            unlimitedStock: unlimited,
            variantId: i.variantId || null,
            variantLabelEn: i.variantLabelEn || '',
            variantLabelAr: i.variantLabelAr || '',
            skip: !live || (!unlimited && stock <= 0),
          };
        })
        .filter((i) => i.productId);
      const added = reorderItems(toAdd);
      if (added > 0) toast(t('common:myOrders.reorderAdded'), 'success');
      else toast(t('common:myOrders.reorderEmpty'), 'error');
    } catch (err) {
      toast(err?.message || t('common:common.error'), 'error');
    } finally {
      setReordering(false);
    }
  }

  async function handleCancel() {
    if (cancelling) return;
    if (!window.confirm(t('tracking.cancelConfirm', { ns: 'common' }))) return;
    setCancelling(true);
    try {
      await cancelOrder(order.id, order.phone || '');
      setTrackingOpen(false);
      if (onRefresh) onRefresh();
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

  function formatLongDate(str) {
    if (!str) return '—';
    try { return new Date(str).toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return '—'; }
  }

  const eStatus = (s) => {
    const known = ORDER_STATUSES[s];
    if (known) return isAr ? known.ar : known.en;
    return s;
  };

  const currentIdx = STATUS_IDX[order.status] ?? 0;
  const cancelled = order.status === 'cancelled';
  const itemName = (item) => {
    const base = isAr
      ? item.nameAr || item.nameEn || item.productNameSnapshot || '—'
      : item.nameEn || item.nameAr || item.productNameSnapshot || '—';
    const v = isAr ? item.variantLabelAr : item.variantLabelEn;
    return v ? `${base} — ${v}` : base;
  };
  const itemTotal = (item) => item.lineTotal ?? item.price * item.quantity;

  return (
    <div className="surface-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-bg-text-secondary mb-1">{order.orderNumber || order.order_number || order.id}</p>
          <p className="text-xs text-bg-text-secondary">{formatDate(order.createdAt || order.created_at)}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 ${STATUS_STYLE[order.status] || STATUS_STYLE.pending}`}>
            {eStatus(order.status)}
          </span>
          <span className="font-semibold text-sm text-bg-text-primary ltr-nums">{formatPrice(order.total)}</span>
        </div>
      </div>

      <ul className="text-xs text-bg-text-secondary space-y-1 border-t border-bg-border pt-3">
        {(order.orderItems || order.items || []).slice(0, 3).map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="min-w-0">{item.quantity} × {itemName(item)}</span>
            <span className="ltr-nums shrink-0">{formatPrice(itemTotal(item))}</span>
          </li>
        ))}
        {(order.orderItems || order.items || []).length > 3 && (
          <li className="text-bg-text-secondary/60">+{(order.orderItems || order.items || []).length - 3} more</li>
        )}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => setTrackingOpen((v) => !v)}
          className={`text-xs font-semibold border rounded-full px-4 py-1.5 transition-colors ${
            trackingOpen
              ? 'border-bg-primary-500 text-bg-primary-500 bg-bg-primary-50'
              : 'border-bg-primary-500/30 text-bg-primary-500 hover:bg-bg-primary-50'
          }`}
        >
          {t('myOrders.track', { ns: 'common' })}
        </button>
        <button
          onClick={handleReorder}
          disabled={reordering}
          aria-busy={reordering}
          aria-disabled={reordering}
          className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-4 py-1.5 transition-colors border-bg-border text-bg-text-primary hover:bg-bg-neutral-100 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {reordering ? (
            <Loader2 size={12} className="animate-spin" aria-hidden="true" focusable="false" />
          ) : (
            <RotateCcw size={12} aria-hidden="true" focusable="false" />
          )}
          {t('myOrders.reorder', { ns: 'common' })}
        </button>
        {order.status === 'pending' && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            aria-busy={cancelling}
            aria-disabled={cancelling}
            className="text-xs font-medium text-bg-error border border-bg-error/20 rounded-full px-4 py-1.5 hover:bg-bg-neutral-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {cancelling ? (
              <>
                <Loader2 size={12} className="animate-spin" aria-hidden="true" focusable="false" />
                {t('tracking.cancelling', { ns: 'common' })}
              </>
            ) : (
              t('tracking.cancelTitle', { ns: 'common' })
            )}
          </button>
        )}
        {order.status === 'delivered' && (
          <button onClick={() => setReturning((v) => !v)} className="text-xs font-medium border rounded-full px-4 py-1.5 transition-colors border-bg-border text-bg-text-secondary hover:border-bg-primary-500/30">
            {t('myOrders.requestReturn', { ns: 'common' })}
          </button>
        )}
      </div>

      {returning && <ReturnForm order={order} onClose={() => setReturning(false)} />}

      {trackingOpen && (
        <div className="border-t border-bg-border pt-4 space-y-5">
          {!cancelled ? (
            <div className="relative">
              <div className="absolute top-5 start-5 end-5 h-0.5 bg-bg-border" />
              <div className="absolute top-5 start-5 h-0.5 bg-bg-primary-500 transition-all duration-700" style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }} />
              <div className="relative flex justify-between">
                {STEPS.map((step, i) => {
                  const done = i <= currentIdx;
                  const active = i === currentIdx;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 w-16">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                        done ? 'bg-bg-primary-500 border-bg-primary-500 text-white' : 'bg-bg-surface border-bg-border text-bg-text-secondary'
                      }`}>
                        {i + 1}
                      </div>
                      <p className={`text-[11px] text-center leading-tight ${
                        active ? 'text-bg-primary-500 font-semibold' : done ? 'text-bg-text-primary' : 'text-bg-text-secondary'
                      }`}>{t(`tracking.status_${step.key}`, { ns: 'common' })}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-semibold text-bg-text-primary">{t('tracking.status_cancelled', { ns: 'common' })}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-bg-text-secondary mb-0.5">{t('tracking.details.placed', { ns: 'common' })}</p>
              <p className="text-bg-text-primary">{formatLongDate(order.createdAt || order.created_at)}</p>
            </div>
            <div>
              <p className="text-bg-text-secondary mb-0.5">{t('tracking.details.payment', { ns: 'common' })}</p>
              <p className="text-bg-text-primary">{t('tracking.details.cod', { ns: 'common' })}</p>
            </div>
            {(order.address_line || order.city) && (
              <div className="sm:col-span-2">
                <p className="text-bg-text-secondary mb-0.5">{t('tracking.details.address', { ns: 'common' })}</p>
                <p className="text-bg-text-primary">{[order.address_line, order.city].filter(Boolean).join(', ')}</p>
              </div>
            )}
          </div>

          <div className="border-t border-bg-border pt-3 space-y-2">
            {(order.orderItems || order.items || []).map((item, i) => (
              <div key={i} className="flex justify-between gap-3 text-xs">
                <span className="text-bg-text-secondary min-w-0">{item.quantity} × {itemName(item)}</span>
                <span className="text-bg-text-primary font-medium ltr-nums shrink-0">{formatPrice(itemTotal(item))}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold text-bg-text-primary pt-2 border-t border-bg-border">
              <span>{t('tracking.details.total', { ns: 'common' })}</span>
              <span className="ltr-nums">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyOrders() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const autoOrder = searchParams.get('order') || '';
  const autoPhone = searchParams.get('phone') || '';
  const [query, setQuery] = useState(autoPhone);
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState(autoPhone ? 'loading' : 'idle');
  const [currentPhone, setCurrentPhone] = useState(autoPhone);

  useEffect(() => {
    if (!autoPhone) return;
    let cancelled = false;
    setCurrentPhone(autoPhone);
    setStatus('loading');
    lookupOrders(autoPhone)
      .then((data) => {
        if (cancelled) return;
        setOrders(data.data || data || []);
        setStatus('done');
      })
      .catch(() => {
        if (cancelled) return;
        setOrders([]);
        setStatus('done');
      });
    return () => { cancelled = true; };
  }, [autoPhone]);

  // Silent refresh: order status updates live (pending → confirmed → shipped
  // → delivered) without reloading the page. Existing cards stay on screen —
  // no spinner flicker. Pauses while the tab is hidden.
  useEffect(() => {
    if (status !== 'done' || !currentPhone) return undefined;
    const id = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await lookupOrders(currentPhone);
        setOrders(data.data || data || []);
      } catch {
        // transient poll errors keep the last known orders
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [status, currentPhone]);

  async function handleLookup(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setCurrentPhone(q);
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

  const isAuto = (order) =>
    autoOrder &&
    (order.orderNumber === autoOrder || order.order_number === autoOrder || order.id === autoOrder);

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
                <OrderCard order={order} onRefresh={handleLookup} autoOpen={isAuto(order)} />
              </motion.div>
            ))}
          </motion.div>
        )
      )}
    </div>
  );
}
