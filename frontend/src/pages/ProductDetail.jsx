import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import ProductCard from '@/components/shop/ProductCard.jsx';
import ProductGallery from '@/components/shop/ProductGallery.jsx';
import Badge from '@/components/ui/Badge.jsx';
import NotFound from '@/pages/NotFound.jsx';
import SEO from '@/components/common/SEO.jsx';
import { fetchProduct, fetchProducts, getSettings } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations.js';

function getDiscountPct(price, compareAt) {
  if (!compareAt || compareAt <= price) return null;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export default function ProductDetail() {
  const { slug } = useParams();
  const { t, isAr } = useLocale();
  // addItem now opens the cart drawer itself (CartContext.jsx) — no need to
  // call anything cart-drawer-related here directly.
  const { addItem } = useCart();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [allProducts, setAllProducts] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setAdded(false);
    fetchProduct(slug)
      .then((res) => { if (!cancelled) { if (!res || res.error) setNotFound(true); else setProductData(res); } })
      .catch(() => { if (!cancelled) setNotFound(true); })
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

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((data) => {
        if (cancelled) return;
        const s = data?.data || data || {};
        setWhatsappNumber(s.whatsappNumber || s.whatsapp_number || '');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { setQuantity(1); }, [slug]);

  if (loading) {
    return (
      <div className="flex justify-center py-32" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-bg-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-bg-text-secondary">{t('common:common.loading')}</span>
        </div>
      </div>
    );
  }

  if (notFound || !productData) return <NotFound />;

  const product = productData?.data || productData;
  if (!product || !product.id) return <NotFound />;

  const name = isAr ? product.nameAr || product.nameEn : product.nameEn;
  const stock = product.stockQuantity ?? 0;
  const outOfStock = stock === 0;
  const lowStock = stock > 0 && stock <= 5;
  const maxQty = stock;
  const images = product.productImages || [];
  const discountPct = getDiscountPct(product.price, product.compareAtPrice);

  const specs = [];
  if (product.capacityGb) specs.push(`${product.capacityGb}GB`);
  if (product.speedClass) specs.push(product.speedClass);
  if (product.interfaceType) specs.push(product.interfaceType);
  if (product.formFactor) specs.push(product.formFactor);

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(product, quantity); // opens the drawer itself now
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const related = (Array.isArray(allProducts) && product.category?.id)
    ? allProducts.filter((x) => x.categoryId === product.category.id && x.slug !== slug).slice(0, 4)
    : [];

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`السلام عليكم، عندي سؤال عن: ${name}`)}`
    : null;

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <SEO
        title={name}
        description={product.descriptionAr || product.descriptionEn || ''}
      />

      <motion.nav
        className="flex items-center gap-2 text-xs text-bg-text-secondary mb-8 flex-wrap"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Link to="/shop" className="hover:text-bg-primary-500">{t('nav.shop')}</Link>
        {product.category && (
          <>
            <span>/</span>
            <Link to={`/shop?category=${product.category.slug}`} className="hover:text-bg-primary-500">
              {isAr ? product.category.nameAr : product.category.nameEn}
            </Link>
          </>
        )}
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
        </motion.div>

        <motion.div
          className="flex flex-col justify-start min-w-0"
          initial={{ opacity: 0, x: isAr ? -20 : 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
        >
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {outOfStock && <Badge variant="out-of-stock">{t('shop:product.outOfStock')}</Badge>}
            {!outOfStock && lowStock && <Badge variant="low-stock">{t('shop:product.lowStock', { count: stock })}</Badge>}
            {!outOfStock && product.isNewArrival && <Badge variant="new">{t('shop:newArrivals')}</Badge>}
            {!outOfStock && product.isFeatured && !product.isNewArrival && <Badge variant="featured">{t('shop:featured')}</Badge>}
            {discountPct && <Badge variant="success">-{discountPct}%</Badge>}
          </div>

          <h1 className="text-display text-bg-text-primary break-words">{name}</h1>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-2xl font-bold text-bg-text-primary ltr-nums">{formatPrice(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-sm text-bg-error line-through ltr-nums">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

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
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(q + 1, maxQty))}
                disabled={outOfStock || quantity >= maxQty}
                className="h-11 w-11 flex items-center justify-center text-bg-text-primary hover:bg-bg-neutral-100 rounded-e-full transition-colors disabled:cursor-not-allowed disabled:opacity-40"
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

          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-full border border-bg-border text-bg-text-primary font-medium py-2.5 text-sm hover:bg-bg-neutral-100 transition-colors"
            >
              <MessageCircle size={18} className="text-green-600" />
              {t('shop:product.askAbout')}
            </a>
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