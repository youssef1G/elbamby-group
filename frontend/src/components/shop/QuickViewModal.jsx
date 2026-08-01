import { useState } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Eye } from 'lucide-react';
import Modal from '@/components/ui/Modal.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { formatPrice } from '@/lib/formatters.js';
import { useCart } from '@/context/CartContext.jsx';

function getStockBadge(stock) {
  if (stock <= 0) return { variant: 'out-of-stock', labelKey: 'shop:product.outOfStock' };
  if (stock <= 5) return { variant: 'low-stock', labelKey: 'shop:product.lowStock', count: stock };
  return null;
}

function getCompareRatio(price, compare) {
  if (!compare || compare <= price) return null;
  return Math.round(((compare - price) / compare) * 100);
}

export default function QuickViewModal({ product, isOpen, onClose }) {
  const { t, isAr } = useLocale();
  const { addItem, setIsCartOpen: openCartDrawer } = useCart();

  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const name = isAr ? product.nameAr : product.nameEn;
  const image = product.productImages?.[0];
  const stockBadge = getStockBadge(product.stockQuantity);
  const discountPct = getCompareRatio(product.price, product.compareAtPrice);
  const outOfStock = product.stockQuantity <= 0;

  const handleAdd = () => {
    addItem(product, quantity);
    openCartDrawer();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="aspect-square bg-bg-surface-sunken">
          {image ? (
            <img
              src={image.imageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-h2 font-bold text-bg-text-secondary/20">
                {name?.charAt(0) || '?'}
              </span>
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {stockBadge && (
              <Badge variant={stockBadge.variant}>
                {stockBadge.labelKey === 'shop:product.lowStock'
                  ? t(stockBadge.labelKey, { count: stockBadge.count })
                  : t(stockBadge.labelKey)}
              </Badge>
            )}
            {discountPct && (
              <Badge variant="new">-{discountPct}%</Badge>
            )}
          </div>

          <h2 className="text-h3 font-semibold text-bg-text-primary">{name}</h2>

          <div className="flex items-baseline gap-2">
            <span className="text-h3 font-bold text-bg-text-primary">
              <span className="ltr-nums">{formatPrice(product.price)}</span>
            </span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-body text-bg-text-secondary line-through">
                <span className="ltr-nums">{formatPrice(product.compareAtPrice)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-body-sm text-bg-text-secondary">{t('shop:product.quantity')}</span>
            <div className="flex items-center border border-bg-border rounded-lg">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary disabled:opacity-30 transition-colors"
                aria-label={t('common.decrease')}
              >
                <Minus size={14} />
              </button>
              <span className="w-10 text-center text-body-sm font-medium text-bg-text-primary ltr-nums" dir="ltr">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                disabled={quantity >= product.stockQuantity}
                className="w-8 h-8 flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary disabled:opacity-30 transition-colors"
                aria-label={t('common.increase')}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-auto pt-4">
            <button
              onClick={handleAdd}
              disabled={outOfStock}
              className="btn-primary flex items-center justify-center gap-2 w-full"
            >
              <ShoppingCart size={16} />
              {t('shop:product.addToCart')}
            </button>

            <Link
              to={`/product/${product.slug}`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-bg-border text-bg-text-secondary hover:text-bg-text-primary hover:border-bg-primary-300 transition text-body-sm"
            >
              <Eye size={16} />
              {t('shop:product.viewDetails')}
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  );
}
