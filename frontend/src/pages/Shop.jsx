import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import ProductCard from '@/components/shop/ProductCard.jsx';
import FiltersSidebar from '@/components/shop/FiltersSidebar.jsx';
import SortDropdown from '@/components/shop/SortDropdown.jsx';
import FilterChips from '@/components/shop/FilterChips.jsx';
import { SkeletonGrid } from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import SEO from '@/components/common/SEO.jsx';
import { fetchProducts, fetchCategories } from '@/api.js';

const PAGE_SIZE = 12;

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Shop() {
  const { t, isAr } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const rawSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(rawSearch);
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    setSearchInput(rawSearch);
  }, [rawSearch]);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const pageRef = useRef(1);
  const sentinelRef = useRef(null);
  const filterKeyRef = useRef('');
  const seenIdsRef = useRef(new Set());
  // Monotonic request id — each loadPage() call claims an id; if a response
  // comes back for a *different* (older) id it means the filter changed while
  // it was in flight, so the result is discarded. Kills the search/filter race
  // where a slow page-2 response appended stale rows onto the new results.
  const requestSeqRef = useRef(0);

  const currentKey = `${category}__${sort}__${debouncedSearch}`;

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((res) => { if (!cancelled) setCategories(res?.data || res || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const loadPage = useCallback(async (page, isLoadMore = false) => {
    const seq = ++requestSeqRef.current;
    if (isLoadMore && !hasMore) return;
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = { page: String(page), limit: String(PAGE_SIZE), sort };
      if (category) params.category = category;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await fetchProducts(params);
      if (seq !== requestSeqRef.current) return; // stale response
      const rows = res?.data || res || [];
      const meta = res?.meta || {};

      if (page === 1) {
        setProducts(rows);
        seenIdsRef.current = new Set(rows.map((p) => p.id));
        setTotal(meta.total || rows.length);
        setHasMore(rows.length >= PAGE_SIZE);
      } else {
        const novel = rows.filter((p) => !seenIdsRef.current.has(p.id));
        novel.forEach((p) => seenIdsRef.current.add(p.id));
        setProducts((prev) => [...prev, ...novel]);
        setHasMore(rows.length === PAGE_SIZE);
      }
      setError(false);
    } catch {
      if (seq !== requestSeqRef.current) return;
      if (page === 1) setError(true);
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [category, sort, debouncedSearch, hasMore]);

  useEffect(() => {
    if (currentKey !== filterKeyRef.current) {
      filterKeyRef.current = currentKey;
      pageRef.current = 1;
      loadPage(1, false);
    }
  }, [currentKey]);

  useEffect(() => {
    if (loading || loadingMore) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          pageRef.current += 1;
          loadPage(pageRef.current, true);
        }
      },
      { rootMargin: '200px' },
    );
    const el = sentinelRef.current;
    if (el) obs.observe(el);
    return () => { if (el) obs.unobserve(el); };
  }, [loading, loadingMore, hasMore, loadPage]);

  const updateParam = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const activeFilters = [];
  if (category) {
    const cat = categories.find((c) => c.slug === category);
    activeFilters.push({ key: 'category', label: isAr ? cat?.nameAr || category : cat?.nameEn || category });
  }
  if (debouncedSearch) {
    activeFilters.push({ key: 'search', label: debouncedSearch });
  }

  const handleFilterRemove = (key) => {
    if (key === 'category') updateParam('category', '');
    if (key === 'search') {
      setSearchInput('');
      updateParam('search', '');
    }
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <SEO titleKey="nav.shop" />

      <motion.div className="mb-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-display text-bg-text-primary mb-2">{t('nav.shop')}</h1>
      </motion.div>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0">
          <FiltersSidebar
            categories={categories}
            selected={category}
            onSelect={(slug) => updateParam('category', slug === category ? '' : slug)}
          />
        </aside>

        <main className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchInput(val);
                  updateParam('search', val);
                }}
                placeholder={t('shop:searchPlaceholder')}
                className="w-full rounded-lg border border-bg-border bg-bg-surface px-3 py-2 pe-8 text-sm text-bg-text-primary placeholder:text-bg-text-secondary focus:outline-none focus:ring-2 focus:ring-bg-primary-500 focus:border-bg-primary-500 transition"
              />
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); updateParam('search', ''); }}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-bg-text-secondary hover:text-bg-text-primary"
                  aria-label={t('shop:searchClear')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <SortDropdown value={sort} onChange={(v) => updateParam('sort', v)} />
          </div>

          <FilterChips
            filters={activeFilters}
            onRemove={handleFilterRemove}
            onClearAll={handleClearAll}
          />

          {loading ? (
            <SkeletonGrid count={PAGE_SIZE} cols={4} />
          ) : error ? (
            <EmptyState
              message={t('common:common.error')}
              action={{ label: t('common:common.retry'), onClick: () => loadPage(1) }}
            />
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {loadingMore && (
                <div className="mt-8">
                  <SkeletonGrid count={4} cols={4} />
                </div>
              )}

              <div ref={sentinelRef} className="h-1" />

              {!hasMore && total > PAGE_SIZE && (
                <p className="text-center text-xs text-bg-text-secondary mt-8">
                  {t('shop:allLoaded', { count: total })}
                </p>
              )}

              {hasMore && !loadingMore && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => { pageRef.current += 1; loadPage(pageRef.current, true); }}
                    className="btn-primary text-sm"
                  >
                    {t('shop:loadMore')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon="package"
              message={t('shop:filters.noResults')}
              action={{ label: t('shop:filters.clearAll'), onClick: handleClearAll }}
            />
          )}

        </main>
      </div>
    </div>
  );
}