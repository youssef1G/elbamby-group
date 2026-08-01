import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import ProductCard from '@/components/shop/ProductCard.jsx';
import ProductGallery from '@/components/shop/ProductGallery.jsx';
import { fetchProduct, fetchProducts } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations.js';

export default function ProductDetail() {
  const { slug } = useParams();
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const { addItem, setIsCartOpen: openCartDrawer } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [allProducts, setAllProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchProduct(slug)
      .then((res) => { if (!cancelled) setProductData(res); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    fetchProducts()
      .then((res) => {
        if (cancelled) return;
        const list = res?.data || res || [];
        setAllProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const product = productData?.data || productData || null;

  const related = (Array.isArray(allProducts) && product?.category)
    ? allProducts.filter((x) => x.category === product.category && x.slug !== slug).slice(0, 4)
    : [];

  const status = loading ? 'loading' : error ? 'error' : 'ready';

  useEffect(() => { setQuantity(1); }, [slug]);

  if (status === 'error' || (!product && status === 'ready')) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-sm text-bg-text-secondary">{t('tracking.notFound', { ns: 'common' })}</p>
        <Link to="/shop" className="btn-primary text-sm">{t('nav.shop', { ns: 'common' })}</Link>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-32" role="status" aria-live="polite" aria-busy="true">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-bg-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-bg-text-secondary">{t('common:common.loading')}</span>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const name = isAr ? product.nameAr || product.nameEn : product.nameEn;
  const stock = product.stockQuantity ?? 0;
  const outOfStock = stock === 0;
  const lowStock = stock > 0 && stock <= 5;
  const maxQty = stock;
  const images = product.productImages || [];

  const specs = [];
  if (product.capacityGb) specs.push(`${product.capacityGb}GB`);
  if (product.speedClass) specs.push(product.speedClass);
  if (product.interfaceType) specs.push(product.interfaceType);
  if (product.formFactor) specs.push(product.formFactor);

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <motion.nav
        className="flex items-center gap-2 text-xs text-bg-text-secondary mb-8 flex-wrap"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Link to="/shop" className="hover:text-bg-primary-500">{t('nav.shop', { ns: 'common' })}</Link>
        <span>/</span>
        <span className="text-bg-text-primary">{name}</span>
      </motion.nav>

      <div className="grid md:grid-cols-2 gap-10 sm:gap-16">
        <motion.div
          className="relative min-w-0"
          initial={{ opacity: 0, x: isAr ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
        >
          <ProductGallery images={images} name={name} />
          {outOfStock && (
            <div className="absolute top-4 start-4 bg-bg-ink/80 text-bg-ink-text text-xs font-semibold uppercase tracking-[0.08em] px-4 py-1.5 rounded-full backdrop-blur-sm">
              {t('shop:product.outOfStock')}
            </div>
          )}
          {!outOfStock && (product.isFeatured || product.isNewArrival) && (
            <span className="absolute top-4 start-4 bg-bg-primary-500 text-white text-xs font-semibold uppercase tracking-[0.08em] px-3 py-1 rounded-lg">
              {product.isNewArrival ? t('shop:newArrivals') : t('shop:featured')}
            </span>
          )}
        </motion.div>

        <motion.div
          className="flex flex-col justify-start min-w-0"
          initial={{ opacity: 0, x: isAr ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
        >
          <h1 className="text-display text-bg-text-primary break-words">{name}</h1>
          <p className="text-2xl font-bold text-bg-text-primary mt-3 ltr-nums">
            {formatPrice(product.price)}
          </p>

          {product.compareAtPrice && product.compareAtPrice > product.price && (
            <p className="text-sm text-bg-error ltr-nums line-through mt-1">
              {formatPrice(product.compareAtPrice)}
            </p>
          )}

          {lowStock && !outOfStock && (
            <p className="mt-2 text-xs font-medium text-amber-600">
              {t('shop:product.lowStock', { count: stock })}
            </p>
          )}
          {outOfStock && (
            <p className="mt-2 text-xs font-medium text-bg-text-secondary">{t('shop:product.outOfStock')}</p>
          )}

          {specs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {specs.map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] font-mono font-medium bg-bg-spec-bg border border-bg-spec-border text-bg-spec-text rounded-lg px-2.5 py-1"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          <p className="mt-5 text-sm text-bg-text-secondary leading-relaxed">
            {isAr ? product.descriptionAr || product.descriptionEn : product.descriptionEn}
          </p>

          <div className="mt-8 flex items-center gap-4 flex-wrap">
            <div
              className={`flex items-center rounded-full border ${
                outOfStock ? 'border-bg-border opacity-40' : 'border-bg-border'
              }`}
            >
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={outOfStock}
                className="h-11 w-11 flex items-center justify-center text-bg-text-primary hover:bg-bg-neutral-100 rounded-s-full transition-colors disabled:cursor-not-allowed"
                aria-label={t('common:common.decrease')}
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(q + 1, maxQty))}
                disabled={outOfStock || quantity >= maxQty}
                className="h-11 w-11 flex items-center justify-center text-bg-text-primary hover:bg-bg-neutral-100 rounded-e-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t('common:common.increase')}
              >
                +
              </button>
            </div>
            <button
              onClick={handleAdd}
              disabled={outOfStock}
              className={`flex-1 rounded-full font-semibold py-3 text-sm transition-all ${
                outOfStock
                  ? 'bg-bg-neutral-200 text-bg-text-secondary cursor-not-allowed'
                  : 'btn-primary py-3'
              }`}
            >
              {outOfStock
                ? t('shop:product.outOfStock')
                : added
                ? t('shop:product.added')
                : t('shop:product.addToCart')}
            </button>
          </div>

          {!outOfStock && (
            <button
              onClick={() => {
                handleAdd();
                openCartDrawer();
              }}
              className="mt-3 w-full rounded-full border border-bg-primary-500 text-bg-primary-500 font-semibold py-3 text-sm hover:bg-bg-primary-50 transition-colors"
            >
              {t('nav.cart', { ns: 'common' })}
            </button>
          )}
        </motion.div>
      </div>

      {related.length > 0 && (
        <motion.section className="mt-20 sm:mt-28" {...fadeUp}>
          <div className="flex items-end justify-between mb-8">
            <h2 className="text-heading-lg text-bg-text-primary">
              {t('shop:product.relatedProducts')}
            </h2>
          </div>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 gap-5 sm:gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
          >
            {related.map((p) => (
              <motion.div key={p.id || p.slug} variants={staggerItem}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}
    </div>
  );
}