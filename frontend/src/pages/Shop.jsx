import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import ProductCard from '@/components/shop/ProductCard.jsx';
import { fetchProducts, fetchCategories } from '@/api.js';
import { fadeUp } from '@/lib/animations.js';

export default function Shop() {
  const { t, isAr } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';
  const searchQuery = searchParams.get('search') || '';

  const [productsData, setProductsData] = useState(null);
  const [categoriesData, setCategoriesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchProducts()
      .then((res) => { if (!cancelled) setProductsData(res); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((res) => { if (!cancelled) setCategoriesData(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const products = productsData?.data || productsData || [];
  const categories = categoriesData?.data || categoriesData || [];

  const status = loading ? 'loading' : error ? 'error' : 'ready';

  const catNames = categories.length
    ? ['all', ...categories.map((c) => c.slug || c.nameEn).filter(Boolean)]
    : [];

  const getCatLabel = (slug) => {
    if (slug === 'all') return t('shop:filters.allCategories');
    const cat = categories.find((c) => (c.slug || c.nameEn) === slug);
    return isAr ? (cat?.nameAr || slug) : (cat?.nameEn || slug);
  };

  const filtered = (Array.isArray(products) ? products : []).filter((p) => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    let matchSearch = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      matchSearch =
        (p.nameEn || '').toLowerCase().includes(q) ||
        (p.nameAr || '').toLowerCase().includes(q);
    }
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <motion.div className="mb-8" {...fadeUp}>
        <h1 className="text-display text-bg-text-primary mb-2">
          {t('nav.shop', { ns: 'common' })}
        </h1>
        <p className="text-sm text-bg-text-secondary">{t('brand.tagline', { ns: 'common' })}</p>
      </motion.div>

      {catNames.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {catNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setSearchParams(cat === 'all' ? {} : { category: cat })}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? 'bg-bg-primary-500 text-white shadow-sm'
                  : 'border border-bg-border text-bg-text-secondary hover:border-bg-primary-500 hover:text-bg-primary-500 bg-bg-surface'
              }`}
            >
{getCatLabel(cat)}
              </button>
          ))}
        </div>
      )}

      {status === 'loading' && (
        <div className="flex justify-center py-32" role="status" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-bg-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-bg-text-secondary">{t('common:common.loading')}</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <p className="text-sm text-bg-text-secondary">{t('common:common.error')}</p>
          <button onClick={() => setReload((v) => v + 1)} className="btn-primary text-sm">
            {t('common:common.retry')}
          </button>
        </div>
      )}

      {status === 'ready' && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-bg-text-secondary">{t('shop:filters.noResults')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
              {filtered.map((p) => (
                <ProductCard key={p.id || p.slug} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}