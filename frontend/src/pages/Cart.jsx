import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import CartItem from '@/components/cart/CartItem.jsx';
import CartSummary from '@/components/cart/CartSummary.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import SEO from '@/components/common/SEO.jsx';
import { fetchProducts } from '@/api.js';
import { fadeUp } from '@/lib/animations.js';

export default function Cart() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { items } = useCart();

  const [stockMap, setStockMap] = useState(null);
  const [stockLoading, setStockLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setStockLoading(true);
    (async () => {
      const map = {};
      const limit = 100;
      try {
        let page = 1;
        for (;;) {
          const res = await fetchProducts({ page, limit });
          if (cancelled) return;
          const rows = res?.data || res || [];
          rows.forEach((p) => {
            map[p.id] = p.unlimitedStock ? Infinity : (p.stockQuantity ?? 0);
          });
          // Progressive update: cart head-updates as each page lands.
          setStockMap({ ...map });
          const total = res?.meta?.total;
          if (!total || rows.length === 0 || rows.length < limit) break;
          if (page >= Math.ceil(total / limit)) break;
          page += 1;
        }
      } catch {
        // keep whatever already landed
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const itemsWithLiveStock = items.map((item) => ({
    ...item,
    stock: stockMap != null ? (stockMap[item.productId] ?? 0) : item.stock,
  }));

  const stockExceeded = itemsWithLiveStock.some((i) => i.quantity > i.stock);

  if (items.length === 0 && !stockLoading) {
    return (
      <EmptyState
        message={t('cart.empty')}
        action={{ label: t('cart.continueShopping'), onClick: () => navigate('/shop') }}
      />
    );
  }

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <SEO titleKey="nav.cart" />

      <motion.h1 className="text-display text-bg-text-primary mb-8" {...fadeUp}>
        {t('nav.cart', { ns: 'common' })}
      </motion.h1>

      {stockExceeded && (
        <motion.div
          className="mb-6 p-3 rounded-lg border border-bg-warning/25 bg-bg-warning/10 text-bg-warning text-sm"
          {...fadeUp}
        >
          {t('cart.stockChanged')}
        </motion.div>
      )}

      <div className="flex flex-col gap-0">
        {itemsWithLiveStock.map((item) => (
          <CartItem key={item.productId} item={item} />
        ))}
      </div>

      <motion.div className="mt-8 flex flex-col gap-4" {...fadeUp}>
        <CartSummary checkoutCta={
          <button
            onClick={handleCheckout}
            disabled={items.length === 0 || stockExceeded}
            className="btn-primary w-full py-3.5 text-sm text-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('nav.checkout')}
          </button>
        } />
      </motion.div>
    </div>
  );
}