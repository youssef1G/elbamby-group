import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { getSettings } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { DEFAULT_SHIPPING_FEE } from '@/lib/constants.js';

export default function CartSummary({ checkoutCta }) {
  const { t } = useLocale();
  const { items } = useCart();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((res) => { if (!cancelled) setSettings(res?.data || res || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const shippingFee = settings?.defaultShippingFee ?? DEFAULT_SHIPPING_FEE;
  const freeThreshold = settings?.freeShippingThreshold ?? null;
  const shipping = freeThreshold && subtotal >= Number(freeThreshold) ? 0 : Number(shippingFee);
  const total = subtotal + shipping;
  const isFree = shipping === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-body-sm text-bg-text-secondary">
        <span>{t('checkout:summary.subtotal')}</span>
        <span className="ltr-nums">{formatPrice(subtotal)}</span>
      </div>

      <div className="flex items-center justify-between text-body-sm text-bg-text-secondary">
        <span>{t('checkout:summary.shipping')}</span>
        <span className="ltr-nums">
          {isFree ? t('checkout:summary.free') : formatPrice(shipping)}
        </span>
      </div>

      {!isFree && freeThreshold && subtotal < Number(freeThreshold) && (
        <p className="text-caption text-bg-text-secondary opacity-60 text-balance">
          {t('checkout:summary.freeShippingHint', {
            amount: formatPrice(Number(freeThreshold) - subtotal),
          })}
        </p>
      )}

      <div className="border-t border-bg-border pt-3 flex items-center justify-between text-body-sm font-semibold text-bg-text-primary">
        <span>{t('checkout:summary.total')}</span>
        <span className="ltr-nums text-body">{formatPrice(total)}</span>
      </div>

      {checkoutCta}
    </div>
  );
}
