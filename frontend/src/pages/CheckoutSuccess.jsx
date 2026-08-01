import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { scaleIn } from '@/lib/animations.js';

export default function CheckoutSuccess() {
  const { t } = useLocale();
  const [params] = useSearchParams();
  const { clearCart } = useCart();
  const orderId = params.get('orderId');

  useEffect(() => { clearCart(); }, []);

  return (
    <motion.div className="max-w-lg mx-auto px-5 py-24 text-center" {...scaleIn}>
      <div className="w-16 h-16 rounded-full bg-bg-success/10 border border-bg-success/30 flex items-center justify-center mx-auto mb-5">
        <motion.svg
          width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bg-success)" strokeWidth="2.5" aria-hidden="true"
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
      {orderId && (
        <p className="text-xs font-mono text-bg-text-secondary mb-8">
          Order #<span className="ltr-nums">{orderId}</span>
        </p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/track-order" className="btn-primary text-sm">
          {t('checkout:success.trackOrder')}
        </Link>
        <Link to="/shop" className="btn-secondary text-sm">
          {t('checkout:success.continueShopping')}
        </Link>
      </div>
    </motion.div>
  );
}