import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { trackOrder, cancelOrder } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { fadeUp } from '@/lib/animations.js';
import { useToast } from '@/components/ui/Toast.jsx';

const STEPS = [
  { key: 'pending' },
  { key: 'confirmed' },
  { key: 'shipped' },
  { key: 'delivered' },
];
const STATUS_IDX = { pending: 0, confirmed: 1, shipped: 2, delivered: 3 };

function formatDate(str) {
  if (!str) return null;
  try { return new Date(str).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return null; }
}

export default function OrderTracking() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('order') || '';
  const phone = searchParams.get('phone') || '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    setLoading(true);
    trackOrder(id, phone)
      .then((data) => setOrder(data.data || data))
      .catch(() => setError(t('tracking.notFound', { ns: 'common' })))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (id) load(); }, [id, phone]);

  async function handleCancel() {
    if (!window.confirm(t('tracking.cancelConfirm', { ns: 'common' }))) return;
    setCancelling(true);
    try { await cancelOrder(order.id, phone); await load(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setCancelling(false); }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-5 h-5 border-2 border-bg-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !order) return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <p className="text-sm text-bg-text-secondary mb-4">{error || t('tracking.notFound', { ns: 'common' })}</p>
      <Link to="/my-orders" className="text-xs font-medium text-bg-primary-500 hover:underline">{t('myOrders.title', { ns: 'common' })}</Link>
    </div>
  );

  const currentIdx = STATUS_IDX[order.status] ?? 0;
  const cancelled = order.status === 'cancelled';

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-8">
      <motion.div {...fadeUp}>
        <p className="text-xs font-mono text-bg-text-secondary mb-1">{order.order_number || order.id}</p>
        <h1 className="text-heading-lg text-bg-text-primary">{t('tracking.title', { ns: 'common' })}</h1>
      </motion.div>

      {!cancelled ? (
        <motion.div
          className="surface-card p-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
        >
          <div className="relative">
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-bg-border" />
            <div className="absolute top-5 left-5 h-0.5 bg-bg-primary-500 transition-all duration-700" style={{ width: `${(currentIdx / (STEPS.length - 1)) * 100}%` }} />
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
        </motion.div>
      ) : (
        <motion.div
          className="surface-card p-5 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <p className="font-semibold text-bg-text-primary">{t('tracking.status_cancelled', { ns: 'common' })}</p>
        </motion.div>
      )}

      <motion.div
        className="surface-card p-5 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.3 }}
      >
        <h2 className="font-heading text-base font-semibold text-bg-text-primary">{t('tracking.formTitle', { ns: 'common' })}</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-bg-text-secondary mb-0.5">{t('tracking.details.placed', { ns: 'common' })}</p>
            <p className="text-bg-text-primary">{formatDate(order.created_at)}</p>
          </div>
          <div>
            <p className="text-bg-text-secondary mb-0.5">{t('tracking.details.payment', { ns: 'common' })}</p>
            <p className="text-bg-text-primary">{t('tracking.details.cod', { ns: 'common' })}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-bg-text-secondary mb-0.5">{t('tracking.details.address', { ns: 'common' })}</p>
            <p className="text-bg-text-primary">{order.customer?.address}, {order.customer?.city}</p>
          </div>
        </div>
        <div className="border-t border-bg-border pt-4 space-y-2">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-bg-text-secondary">{(item.nameEn || item.nameAr || '—')} × {item.quantity}</span>
              <span className="text-bg-text-primary font-medium ltr-nums">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-bold text-bg-text-primary pt-2 border-t border-bg-border">
            <span>{t('tracking.details.total', { ns: 'common' })}</span>
            <span className="ltr-nums">{formatPrice(order.total)}</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Link to="/my-orders" className="text-xs font-medium text-bg-text-secondary border border-bg-border rounded-full px-4 py-2 hover:text-bg-text-primary transition-colors">
          {t('myOrders.title', { ns: 'common' })}
        </Link>
        {order.status === 'pending' && (
          <button onClick={handleCancel} disabled={cancelling} className="text-xs font-medium text-bg-error border border-bg-error/20 rounded-full px-4 py-2 hover:bg-bg-neutral-100 transition-colors disabled:opacity-50">
            {cancelling ? '...' : t('tracking.cancelTitle', { ns: 'common' })}
          </button>
        )}
      </motion.div>
    </div>
  );
}