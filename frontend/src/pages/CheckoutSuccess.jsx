import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { trackOrder } from '@/api.js';
import { scaleIn } from '@/lib/animations.js';
import { formatPrice } from '@/lib/formatters.js';
import SEO from '@/components/common/SEO.jsx';

export default function CheckoutSuccess() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { clearCart } = useCart();
  const orderId = params.get('orderId');
  const phone = params.get('phone') || '';
  const redeemed = Number(params.get('redeemed') || 0);
  const discount = Number(params.get('discount') || 0);
  const earn = Number(params.get('earn') || 0);

  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState(null);

  useEffect(() => {
    if (!orderId) {
      navigate('/', { replace: true });
      return;
    }
    clearCart();
  }, [orderId]);

  useEffect(() => {
    if (!orderId || !phone) return;
    let cancelled = false;
    setOrderLoading(true);
    trackOrder(orderId, phone)
      .then((res) => { if (!cancelled) setOrder(res); })
      .catch(() => { if (!cancelled) setOrderError(true); })
      .finally(() => { if (!cancelled) setOrderLoading(false); });
    return () => { cancelled = true; };
  }, [orderId, phone]);

  const items = order?.orderItems || order?.order_items || [];

  return (
    <motion.div className="max-w-lg mx-auto px-5 py-24 text-center" {...scaleIn}>
      <SEO titleKey="checkout.success.title" />

      <div className="w-16 h-16 rounded-full bg-bg-success/10 border border-bg-success/30 flex items-center justify-center mx-auto mb-5">
        <motion.svg
          width="28" height="28" viewBox="0 0 24 24" fill="none"           stroke="var(--bg-success)" strokeWidth="2.5" aria-hidden="true"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
          <motion.polyline
            points="22 4 12 14.01 9 11.01"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.7 }}
          />
        </motion.svg>
      </div>
      <h1 className="text-display text-bg-text-primary mb-3">{t('checkout:success.title')}</h1>
      <p className="text-sm text-bg-text-secondary mb-2">{t('checkout:success.subtitle')}</p>
      <p className="text-xs text-bg-text-secondary mb-1">{t('checkout:success.estimatedDelivery')}</p>
      <p className="text-xs font-mono text-bg-text-secondary mb-8">
        {t('admin.orders.orderNumber')}: <span className="ltr-nums">{orderId}</span>
      </p>
      {(earn > 0 || redeemed > 0) && (
        <div className="max-w-sm mx-auto text-start bg-bg-primary-500/10 border border-bg-primary-500/30 rounded-2xl px-5 py-4 mb-8 space-y-1.5">
          {earn > 0 && (
            <p className="text-xs font-semibold text-bg-text-primary">
              {t('checkout:success.pointsEarned', { points: earn.toLocaleString('en-US') })}
            </p>
          )}
          {redeemed > 0 && (
            <p className="text-xs text-bg-text-secondary">
              {t('checkout:success.pointsRedeemed', {
                points: redeemed.toLocaleString('en-US'),
                amount: formatPrice(discount),
              })}
            </p>
          )}
        </div>
      )}
      {items.length > 0 && (
        <div className="max-w-sm mx-auto text-start bg-bg-neutral-50 border border-bg-neutral-200 rounded-2xl px-5 py-4 mb-8">
          <p className="text-xs font-semibold text-bg-text-primary mb-3">
            {t('checkout:success.orderSummary')}
          </p>
          <ul className="space-y-2">
            {items.map((item, idx) => {
              const name = item.productNameSnapshot || item.product_name_snapshot || '';
              const variantLabel = isAr ? (item.variantLabelAr || item.variant_label_ar) : (item.variantLabelEn || item.variant_label_en);
              return (
                <li key={item.productId || item.product_id || idx} className="flex justify-between text-xs text-bg-text-secondary">
                  <span className="flex-1 min-w-0">
                    <span className="text-bg-text-primary font-medium">{name || '—'}</span>
                    {variantLabel && (
                      <span className="ms-1 text-bg-text-secondary">
                        {isAr ? `— ${variantLabel}` : `— ${variantLabel}`}
                      </span>
                    )}
                    <span className="ms-1 text-bg-text-tertiary">× {item.quantity}</span>
                  </span>
                  <span className="ms-3 shrink-0 text-bg-text-primary font-medium tabular-nums">
                    {formatPrice(item.lineTotal ?? item.line_total ?? (item.unitPriceSnapshot ?? item.unit_price_snapshot) * item.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-between text-xs font-semibold text-bg-text-primary mt-3 pt-2 border-t border-bg-neutral-200">
            <span>{t('checkout:summary.total')}</span>
            <span className="tabular-nums">
              {formatPrice(
                items.reduce((sum, i) => sum + (i.lineTotal ?? i.line_total ?? (i.unitPriceSnapshot ?? i.unit_price_snapshot) * i.quantity), 0),
              )}
            </span>
          </div>
        </div>
      )}
      {orderLoading && (
        <div className="max-w-sm mx-auto mb-8">
          <div className="h-4 w-32 bg-bg-neutral-100 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-3 w-48 bg-bg-neutral-100 rounded mx-auto animate-pulse" />
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to={phone ? { pathname: '/my-orders', search: `?order=${orderId}&phone=${phone}` } : '/my-orders'} className="btn-primary text-sm">
          {t('checkout:success.trackOrder')}
        </Link>
        <Link to="/shop" className="btn-secondary text-sm">
          {t('checkout:success.continueShopping')}
        </Link>
      </div>
    </motion.div>
  );
}
