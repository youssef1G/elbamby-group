import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '@/context/LocaleContext.jsx';
import { X, Trash2 } from 'lucide-react';
import { useCart } from '@/context/CartContext.jsx';
import { formatPrice } from '@/lib/formatters.js';
import useFocusTrap from '@/hooks/useFocusTrap.js';

export default function CartDrawer() {
  const { t, isAr } = useLocale();
  const { items, updateQuantity, removeItem, isCartOpen: isOpen, closeCart } = useCart();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const panelRef = useRef(null);
  // Pass the real closer (a function that calls setIsCartOpen(false)), not
  // the raw context setter — useFocusTrap calls onClose() with no arguments
  // on Escape, which happened to work by accident before, but closeCart is
  // explicit and safe regardless of how it's invoked.
  useFocusTrap({ isOpen, ref: panelRef, onClose: closeCart });

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 backdrop-blur-sm ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeCart}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        className={`fixed top-0 h-full w-full sm:w-[420px] bg-bg-surface z-[51] shadow-xl transition-transform duration-300 flex flex-col end-0 ${
          isOpen ? '' : 'invisible pointer-events-none'
        }`}
        style={{
          // end-0 already anchors the panel to the correct physical side per
          // direction (right in LTR, left in RTL). The slide-out direction on
          // close still needs isAr explicitly, since transform/translateX is
          // a JS value, not a CSS logical property — it doesn't auto-flip.
          transform: isOpen ? 'translateX(0)' : `translateX(${isAr ? '-100%' : '100%'})`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.cart', { ns: 'common' })}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
          <h2 className="font-heading text-lg font-semibold text-bg-text-primary">
            {t('nav.cart', { ns: 'common' })}
          </h2>
          <button
            onClick={closeCart}
            className="p-2 rounded-full hover:bg-bg-border/40 transition-colors text-bg-text-secondary"
            aria-label={t('common:common.close')}
          >
            <X className="w-5 h-5" aria-hidden="true" focusable="false" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3">
              <p className="font-heading font-semibold text-bg-text-primary">
                {t('cart.empty', { ns: 'common' })}
              </p>
              <p className="text-sm text-bg-text-secondary">
                {t('cart.continueShopping', { ns: 'common' })}
              </p>
              <Link to="/shop" onClick={closeCart} className="btn-primary mt-2 text-sm">
                {t('nav.shop', { ns: 'common' })}
              </Link>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map((item) => {
                const name = isAr ? item.nameAr || item.nameEn : item.nameEn;
                return (
                  <li key={item.productId} className="flex gap-4">
                    <img
                      src={item.image}
                      alt={name}
                      loading="lazy"
                      className="h-20 w-20 rounded-xl object-cover bg-bg-surface-sunken shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-bg-text-primary truncate">
                        {name}
                      </p>
                      <p className="text-sm font-medium text-bg-text-primary mt-0.5 ltr-nums">
                        {formatPrice(item.price)}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex items-center rounded-full border border-bg-border">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="h-8 w-8 flex items-center justify-center text-bg-text-primary hover:bg-bg-neutral-100 rounded-s-full transition-colors text-sm"
                            aria-label={t('common:common.decrease')}
                          >
                            <span aria-hidden="true">−</span>
                          </button>
                          <span className="w-8 text-center text-xs font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.stock && item.quantity >= item.stock}
                            className="h-8 w-8 flex items-center justify-center text-bg-text-primary hover:bg-bg-neutral-100 rounded-e-full transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={t('common:common.increase')}
                          >
                            <span aria-hidden="true">+</span>
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-bg-text-secondary hover:text-bg-primary-500 transition-colors ms-auto"
                          aria-label={t('common:common.remove')}
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-bg-text-primary whitespace-nowrap ltr-nums">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-bg-border px-5 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-bg-text-secondary">
                {t('checkout:summary.subtotal')}
              </span>
              <span className="font-heading text-lg font-semibold text-bg-text-primary ltr-nums">
                {formatPrice(subtotal)}
              </span>
            </div>
            <Link to="/cart" onClick={closeCart} className="btn-primary w-full py-3 text-sm">
              {t('nav.cart', { ns: 'common' })}
            </Link>
            <Link to="/checkout" onClick={closeCart} className="btn-secondary w-full py-3 text-sm">
              {t('nav.checkout', { ns: 'common' })}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}