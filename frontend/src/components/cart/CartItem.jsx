import { useLocale } from '@/context/LocaleContext.jsx';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext.jsx';
import { formatPrice } from '@/lib/formatters.js';

export default function CartItem({ item }) {
  const { t, isAr } = useLocale();
  const { updateQuantity, removeItem } = useCart();
  const name = isAr ? item.nameAr : item.nameEn;
  const available = item.unlimitedStock ? Infinity : (item.stock || 0);
  const hasStock = available > 0;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="flex gap-3 py-4 border-b border-bg-border last:border-b-0"
      >
        <div className="shrink-0 w-20 h-20 rounded-md bg-bg-surface-sunken overflow-hidden">
          {item.image ? (
            <img src={item.image} alt={name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bg-text-secondary opacity-60 text-caption">
              {name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <p className="text-body-sm font-medium text-bg-text-primary truncate">{name}</p>
            <button
              onClick={() => removeItem(item.productId)}
              className="shrink-0 text-bg-text-secondary opacity-60 hover:text-bg-error transition-colors p-0.5"
              aria-label={t('common.remove')}
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="ltr-nums text-caption text-bg-text-secondary">
              {formatPrice(item.price)}
            </span>

            {hasStock ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="w-6 h-6 flex items-center justify-center rounded border border-bg-border text-bg-text-secondary hover:text-bg-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label={t('common.decrease')}
                >
                  <Minus size={12} strokeWidth={2} />
                </button>
                <span className="ltr-nums w-6 text-center text-caption font-medium text-bg-text-primary">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= available}
                  className="w-6 h-6 flex items-center justify-center rounded border border-bg-border text-bg-text-secondary hover:text-bg-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label={t('common.increase')}
                >
                  <Plus size={12} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <span className="text-bg-error text-caption">{t('shop:product.outOfStock')}</span>
            )}
          </div>
        </div>

        <div className="shrink-0 flex flex-col justify-end text-end">
          <span className="ltr-nums text-body-sm font-semibold text-bg-text-primary">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}