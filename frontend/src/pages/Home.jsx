import { useState, useEffect, useRef } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { Truck, Clock, ShieldCheck, Plug, Smartphone, Package, ChevronRight, Cable, BatteryCharging, Headphones, MemoryStick } from 'lucide-react';
import { fetchCategories, fetchProducts, fetchBanners } from '@/api.js';
import { fadeUp } from '@/lib/animations.js';
import ProductGrid from '@/components/shop/ProductGrid.jsx';
import SEO from '@/components/common/SEO.jsx';
import HeroVisual from '@/components/common/HeroVisual.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';

/**
 * SIGNATURE ELEMENT: the capacity marquee.
 * BG sells storage — flash drives, SD/microSD cards. Instead of decorative
 * icons or stock photography clichés, the brand's visual signature is the
 * spec sheet itself: real capacity denominations, set in mono type, treated
 * as a recurring graphic motif. This is content-as-decoration, not a template.
 * Uses font-mono (JetBrains Mono — see 01-brand-design-system.md addendum).
 */
const CAPACITIES = ['8GB', '16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

const CATEGORY_ICONS = {
  chargers: Plug,
  cables: Cable,
  'power-banks': BatteryCharging,
  'screen-protectors': ShieldCheck,
  'phone-cases': Smartphone,
  cases: Smartphone,
  storage: MemoryStick,
  memmory: MemoryStick,
  earbuds: Headphones,
  headphones: Headphones,
};

function CapacityMarquee() {
  return (
    <div className="relative overflow-hidden border-y border-bg-border py-3 select-none" aria-hidden="true">
      <div className="flex w-max animate-marquee gap-8 font-mono text-caption tracking-wider text-bg-text-secondary">
        {[...CAPACITIES, ...CAPACITIES, ...CAPACITIES].map((cap, i) => (
          <span key={i} className="flex items-center gap-8">
            <span>{cap}</span>
            <span className="text-bg-primary-400">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroCarousel() {
  const { t, isAr } = useLocale();
  const isRtl = isAr;
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchBanners({ position: 'home_hero' })
      .then((res) => { if (!cancelled) setBanners(res?.data || []); })
      .catch(() => { if (!cancelled) setBanners([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(intervalRef.current);
  }, [paused, banners.length]);

  const goTo = (idx) => setCurrent(idx);
  const next = () => setCurrent((prev) => (prev + 1) % banners.length);
  const prev = () => setCurrent((prev) => (prev - 1 + banners.length) % banners.length);

  const handleDragEnd = (_, info) => {
    const threshold = 50;
    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > 0.3) {
      if (isRtl) {
        info.offset.x > 0 ? next() : prev();
      } else {
        info.offset.x > 0 ? prev() : next();
      }
    }
  };

  // --- No-banner fallback: this IS the brand hero, not a placeholder. ---
  // Split layout: headline + CTA on one side, a rendered "memory card" glyph
  // on the other — an abstracted chip/card silhouette in brand magenta,
  // built from CSS, not stock photography. This is the thesis image.
  if (!isLoading && banners.length === 0) {
    return (
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          {/* Copy side — staggered reveal, same orchestrated entrance as the visual */}
          <motion.div
            className="order-2 lg:order-1"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
          >
            <motion.p
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-4 font-mono text-caption uppercase tracking-[0.2em] text-bg-primary-400"
            >
              {t('home.heroEyebrow')}
            </motion.p>
            <h1 className="text-display font-bold leading-[1.05] text-bg-text-primary">
              <motion.span
                className="block overflow-hidden"
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {t('home.heroLine1')}
              </motion.span>
              <motion.span
                className="block text-bg-primary-500"
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {t('home.heroLine2')}
              </motion.span>
            </h1>
            <motion.p
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 max-w-md text-body-lg text-bg-text-secondary"
            >
              {t('home.heroSubtitle')}
            </motion.p>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 rounded-md bg-bg-primary-500 px-7 py-3.5 text-body-sm font-semibold text-white transition hover:bg-bg-primary-400 active:scale-[0.98]"
              >
                {t('home.heroCta')}
              </Link>
              <Link
                to="/shop?category=storage"
                className="text-body-sm font-medium text-bg-text-secondary underline decoration-bg-text-secondary/40 underline-offset-4 transition hover:text-bg-text-primary hover:decoration-bg-text-primary"
              >
                {t('home.heroCtaSecondary')}
              </Link>
            </motion.div>
          </motion.div>

          {/* Animated device cluster — the signature visual */}
          <div className="order-1 flex items-center justify-center lg:order-2">
            <HeroVisual />
          </div>
        </div>
        <CapacityMarquee />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="relative overflow-hidden">
        <div className="h-[60vh] sm:h-[70vh] animate-pulse bg-bg-surface-sunken" />
        <CapacityMarquee />
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 3000)}
    >
      <div className="relative h-[60vh] sm:h-[70vh]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <img
              src={banners[current].imageUrl}
              alt={isRtl && banners[current].titleAr ? banners[current].titleAr : banners[current].titleEn}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6 sm:p-12 text-white">
              {banners[current].titleEn && (
                <h2 className="text-h1 sm:text-display font-bold mb-2">
                  {isRtl && banners[current].titleAr ? banners[current].titleAr : banners[current].titleEn}
                </h2>
              )}
              {banners[current].subtitleEn && (
                <p className="text-body-lg sm:text-h3 opacity-90 max-w-xl">
                  {isRtl && banners[current].subtitleAr ? banners[current].subtitleAr : banners[current].subtitleEn}
                </p>
              )}
              {banners[current].linkUrl && (
                <Link to={banners[current].linkUrl} className="mt-4 inline-block btn-primary">
                  {t('common.seeMore')}
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {banners.length > 1 && (
          <>
            <button
              onClick={prev}
              className="hidden sm:flex absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white items-center justify-center hover:bg-white/30 transition"
              aria-label={t('hero.prevSlide')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              onClick={next}
              className="hidden sm:flex absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white items-center justify-center hover:bg-white/30 transition"
              aria-label={t('hero.nextSlide')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="rtl:rotate-180"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
            <div className="absolute bottom-4 inset-x-0 flex justify-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-2.5 rounded-full transition-all ${i === current ? 'w-8 bg-white' : 'w-2.5 bg-white/50'}`}
                  aria-label={t('hero.slide', { n: i + 1 })}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <CapacityMarquee />
    </section>
  );
}

function SecondaryBanners() {
  const { t, isAr } = useLocale();
  const [banners, setBanners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    fetchBanners({ position: 'home_secondary' })
      .then((res) => { if (!cancelled) setBanners(res?.data || []); })
      .catch(() => { if (!cancelled) setIsError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-48 rounded-xl animate-pulse bg-bg-surface-sunken" />
      </section>
    );
  }
  if (isError) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          message={t('common.common.error')}
          action={{ label: t('common.common.retry'), onClick: () => setReload((v) => v + 1) }}
        />
      </section>
    );
  }
  if (banners.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
        {banners.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link
              to={b.linkUrl || '#'}
              className={`group relative block aspect-[2/1] overflow-hidden rounded-xl ${b.linkUrl ? '' : 'pointer-events-none'}`}
            >
              <img
                src={b.imageUrl}
                alt={isAr && b.titleAr ? b.titleAr : b.titleEn}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              {(b.titleEn || b.subtitleEn) && (
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 to-transparent p-4 text-white sm:p-6">
                  {b.titleEn && (
                    <h3 className="text-h3 font-bold">
                      {isAr && b.titleAr ? b.titleAr : b.titleEn}
                    </h3>
                  )}
                  {b.subtitleEn && (
                    <p className="mt-1 text-body-sm opacity-90">
                      {isAr && b.subtitleAr ? b.subtitleAr : b.subtitleEn}
                    </p>
                  )}
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { t, isAr } = useLocale();

  const [catData, setCatData] = useState(null);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(false);
  const [catReload, setCatReload] = useState(0);

  const [featuredData, setFeaturedData] = useState(null);
  const [featLoading, setFeatLoading] = useState(true);
  const [featError, setFeatError] = useState(false);
  const [featReload, setFeatReload] = useState(0);

  const [newData, setNewData] = useState(null);
  const [newLoading, setNewLoading] = useState(true);
  const [newError, setNewError] = useState(false);
  const [newReload, setNewReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatLoading(true);
    setCatError(false);
    fetchCategories()
      .then((res) => { if (!cancelled) setCatData(res); })
      .catch(() => { if (!cancelled) setCatError(true); })
      .finally(() => { if (!cancelled) setCatLoading(false); });
    return () => { cancelled = true; };
  }, [catReload]);

  useEffect(() => {
    let cancelled = false;
    setFeatLoading(true);
    setFeatError(false);
    fetchProducts({ featured: 'true', limit: 8 })
      .then((res) => { if (!cancelled) setFeaturedData(res); })
      .catch(() => { if (!cancelled) setFeatError(true); })
      .finally(() => { if (!cancelled) setFeatLoading(false); });
    return () => { cancelled = true; };
  }, [featReload]);

  useEffect(() => {
    let cancelled = false;
    setNewLoading(true);
    setNewError(false);
    fetchProducts({ new: 'true', limit: 8 })
      .then((res) => { if (!cancelled) setNewData(res); })
      .catch(() => { if (!cancelled) setNewError(true); })
      .finally(() => { if (!cancelled) setNewLoading(false); });
    return () => { cancelled = true; };
  }, [newReload]);

  const categories = catData?.data || [];
  const featured = featuredData?.data || [];
  const newArrivals = newData?.data || [];

  return (
    <>
      <SEO titleKey="nav.home" />

      <HeroCarousel />

      {/* Categories — tiled cards: tinted icon tile, name, slide-in chevron on hover */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <motion.div {...fadeUp}>
          <div className="mb-5 flex items-end justify-between">
            <p className="font-mono text-caption uppercase tracking-[0.2em] text-bg-text-secondary">
              {t('home.shopByCategory')}
            </p>
            <Link to="/shop" className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 transition">
              {t('common.viewAll')}
            </Link>
          </div>
          {catLoading && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px] w-full rounded-md" />
              ))}
            </div>
          )}
          {catError && !catLoading && (
            <EmptyState
              message={t('common.common.error')}
              action={{ label: t('common.common.retry'), onClick: () => setCatReload((v) => v + 1) }}
            />
          )}
          {!catLoading && !catError && categories.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
              {categories.map((cat, i) => {
                const CategoryIcon = CATEGORY_ICONS[cat.slug] || Package;
                const isHiddenOnMobile = i >= 4;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={isHiddenOnMobile ? 'hidden sm:block' : ''}
                  >
                    <Link
                      to={`/shop?category=${cat.slug}`}
                      className="group flex items-center gap-4 rounded-md border border-bg-border bg-bg-surface px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-bg-primary-300 hover:shadow-card"
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
                        style={{ background: 'color-mix(in srgb, var(--bg-primary-500) 10%, transparent)' }}
                      >
                        <CategoryIcon size={20} strokeWidth={1.5} className="text-bg-primary-500" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm font-medium text-bg-text-primary transition-colors duration-300 group-hover:text-bg-primary-500">
                          {isAr ? cat.nameAr : cat.nameEn}
                        </span>
                      </span>
                      <ChevronRight
                        size={16}
                        strokeWidth={2}
                        className="hidden shrink-0 -translate-x-2 text-bg-primary-500 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 rtl:rotate-180 rtl:translate-x-2 rtl:group-hover:translate-x-0 sm:block"
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16">
        <motion.div {...fadeUp}>
          <div className="flex items-end justify-between mb-6 lg:mb-8">
            <div>
              <p className="mb-1 font-mono text-caption uppercase tracking-[0.2em] text-bg-primary-500">{t('home.featuredEyebrow')}</p>
              <h2 className="text-h2 font-semibold text-bg-text-primary">{t('shop:featured')}</h2>
            </div>
            <Link to="/shop?sort=featured" className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 transition">
              {t('common.viewAll')}
            </Link>
          </div>
          <ProductGrid
            products={featured}
            isLoading={featLoading}
            isError={featError}
            onRetry={() => setFeatReload((v) => v + 1)}
            emptyMessage={t('shop:noProducts')}
          />
        </motion.div>
      </section>

      <SecondaryBanners />

      {/* New Arrivals */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16">
        <motion.div {...fadeUp}>
          <div className="flex items-end justify-between mb-6 lg:mb-8">
            <div>
              <p className="mb-1 font-mono text-caption uppercase tracking-[0.2em] text-bg-primary-500">{t('home.newEyebrow')}</p>
              <h2 className="text-h2 font-semibold text-bg-text-primary">{t('shop:newArrivals')}</h2>
            </div>
            <Link to="/shop?sort=newest" className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 transition">
              {t('common.viewAll')}
            </Link>
          </div>
          <ProductGrid
            products={newArrivals}
            isLoading={newLoading}
            isError={newError}
            onRetry={() => setNewReload((v) => v + 1)}
            emptyMessage={t('shop:noProducts')}
          />
        </motion.div>
      </section>

      {/* Trust strip — light spec-sheet band, hardware icon chips, hairline dividers */}
      <section className="border-y border-bg-border bg-bg-surface-sunken/50">
        <motion.div {...fadeUp} className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div className="grid grid-cols-1 divide-y divide-bg-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse">
            {[
              { Icon: Truck, labelKey: 'footer.cod', descKey: 'home.codDesc' },
              { Icon: Clock, labelKey: 'home.deliveryDays', descKey: 'home.deliveryDesc' },
              { Icon: ShieldCheck, labelKey: 'home.quality', descKey: 'home.qualityDesc' },
            ].map(({ Icon, labelKey, descKey }, i) => (
              <div key={i} className="flex items-center gap-4 py-6 sm:justify-center sm:py-0 sm:px-8">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-bg-border bg-bg-surface shadow-card">
                  <Icon size={20} strokeWidth={1.5} className="text-bg-primary-500" />
                </span>
                <div>
                  <h3 className="text-body-sm font-semibold text-bg-text-primary">{t(labelKey)}</h3>
                  <p className="mt-0.5 text-caption text-bg-text-secondary">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </>
  );
}