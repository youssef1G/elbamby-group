import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext.jsx';
import { formatPrice } from '@/lib/formatters.js';
import { fadeUp, scaleIn, staggerContainer, staggerItem } from '@/lib/animations.js';

export default function Cart() {
  const { t, isAr } = useLocale();
  const { items, updateQuantity, removeItem } = useCart();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <motion.div className="max-w-xl mx-auto px-5 py-24 text-center" {...scaleIn}>
        <div className="w-16 h-16 rounded-full bg-bg-primary-50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-bg-primary-500">
            <circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 002 1.58h8.58a2 2 0 001.95-1.57l1.65-7.43H5.12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-heading-lg text-bg-text-primary mb-2">{t('cart.empty', { ns: 'common' })}</h1>
        <p className="text-sm text-bg-text-secondary mb-6">{t('cart.continueShopping', { ns: 'common' })}</p>
        <Link to="/shop" className="btn-primary">{t('nav.shop', { ns: 'common' })}</Link>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <motion.h1 className="text-display text-bg-text-primary mb-8" {...fadeUp}>
        {t('nav.cart', { ns: 'common' })}
      </motion.h1>

      <motion.ul
        className="space-y-6"
        variants={staggerContainer}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
      >
        {items.map((item) => {
          const name = isAr ? item.nameAr || item.nameEn : item.nameEn;
          return (
            <motion.li key={item.productId} variants={staggerItem} className="flex gap-5 border-b border-bg-border pb-6">
              <img
                src={item.image}
                alt={name}
                className="h-24 w-24 rounded-2xl object-cover bg-bg-surface-sunken shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-bg-text-primary">{name}</p>
                <p className="text-sm font-medium text-bg-text-primary mt-0.5 ltr-nums">
                  {formatPrice(item.price)}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center rounded-full border border-bg-border">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="h-9 w-9 flex items-center justify-center text-bg-text-primary hover:bg-bg-neutral-100 rounded-s-full transition-colors"
                      aria-label={t('common:common.decrease')}
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.stock && item.quantity >= item.stock}
                      className="h-9 w-9 flex items-center justify-center text-bg-text-primary hover:bg-bg-neutral-100 rounded-e-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={t('common:common.increase')}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-bg-text-secondary hover:text-bg-primary-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('common:common.delete')}
                  </button>
                </div>
              </div>
              <p className="text-[15px] font-semibold text-bg-text-primary whitespace-nowrap ltr-nums">
                {formatPrice(item.price * item.quantity)}
              </p>
            </motion.li>
          );
        })}
      </motion.ul>

      <motion.div className="mt-8 flex items-center justify-between font-heading text-lg font-semibold" {...fadeUp}>
        <span className="text-bg-text-primary">{t('checkout:summary.subtotal')}</span>
        <span className="text-bg-text-primary ltr-nums">{formatPrice(subtotal)}</span>
      </motion.div>

      <motion.div {...fadeUp}>
        <Link to="/checkout" className="btn-primary w-full py-3.5 mt-6 text-sm inline-block text-center">
          {t('nav.checkout', { ns: 'common' })}
        </Link>
      </motion.div>

      <motion.div
        className="text-center mt-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Link to="/shop" className="text-sm font-medium text-bg-primary-500 hover:underline">
          {t('cart.continueShopping', { ns: 'common' })}
        </Link>
      </motion.div>
    </div>
  );
}