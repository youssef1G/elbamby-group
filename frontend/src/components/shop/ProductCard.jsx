import { Link } from 'react-router-dom';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { Plus } from 'lucide-react';
import { formatPrice } from '@/lib/formatters.js';

export default function ProductCard({ product }) {
  const { t, isAr } = useLocale();
  const { addItem, openCartDrawer } = useCart();

  const name = isAr ? product.nameAr || product.nameEn : product.nameEn;
  const image = (product.productImages?.[0]?.imageUrl) || '';
  const imgAlt = product.productImages?.[0]?.altText || product.nameEn || '';
  const stock = product.stockQuantity ?? 0;
  const outOfStock = stock === 0;
  const isFeatured = product.isFeatured;
  const isNew = product.isNewArrival;

  const specs = [];
  if (product.capacityGb) specs.push(`${product.capacityGb}GB`);
  if (product.speedClass) specs.push(product.speedClass);
  if (product.interfaceType) specs.push(product.interfaceType);

  function handleAdd(e) {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    addItem(product, 1);
    openCartDrawer();
  }

  return (
    <div className="group flex flex-col">
      <Link
        to={`/product/${product.slug}`}
        className={`relative block overflow-hidden rounded-2xl bg-bg-surface-sunken aspect-square ${
          outOfStock ? '' : 'cursor-pointer'
        }`}
      >
        <img
          src={image}
          alt={imgAlt}
          loading="lazy"
          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04] ${
            outOfStock ? 'opacity-50 grayscale' : ''
          }`}
        />

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] bg-bg-ink/80 text-bg-ink-text px-4 py-1.5 rounded-full">
              {t('shop:product.outOfStock')}
            </span>
          </div>
        )}

        {!outOfStock && (isFeatured || isNew) && (
          <span className="absolute top-3 start-3 text-[10px] font-semibold uppercase tracking-[0.08em] bg-bg-primary-500 text-white px-2.5 py-1 rounded-md">
            {isNew
              ? t('shop:newArrivals')
              : t('shop:featured')}
          </span>
        )}

        {!outOfStock && (
          <div className="absolute bottom-3 end-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleAdd}
              className="h-9 w-9 rounded-full bg-bg-surface border border-bg-border shadow-lg flex items-center justify-center text-bg-text-primary hover:bg-bg-primary-500 hover:text-white hover:border-bg-primary-500 transition-all duration-200"
              aria-label={t('shop:product.addToCart')}
            >
              <Plus className="w-4 h-4" strokeWidth={2.2} />
            </button>
          </div>
        )}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/product/${product.slug}`}
            className="text-sm font-semibold text-bg-text-primary hover:text-bg-primary-500 transition-colors line-clamp-1 block"
          >
            {name}
          </Link>
          {specs.length > 0 && (
            <p className="text-[11px] text-bg-text-secondary mt-0.5 font-mono ltr-nums truncate">
              {specs.join(' · ')}
            </p>
          )}
        </div>
        <span className="text-sm font-semibold text-bg-text-primary whitespace-nowrap ltr-nums">
          {formatPrice(product.price)}
        </span>
      </div>
    </div>
  );
}
