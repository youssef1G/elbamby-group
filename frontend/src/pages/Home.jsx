import { useState, useEffect } from "react";
import { useLocale } from "@/context/LocaleContext.jsx";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  Truck,
  Clock,
  ShieldCheck,
  Plug,
  Smartphone,
  Package,
  ChevronRight,
  Cable,
  BatteryCharging,
  Headphones,
  MemoryStick,
} from "lucide-react";
import { fetchCategories, fetchProducts, fetchBanners } from "@/api.js";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/animations.js";
import ProductGrid from "@/components/shop/ProductGrid.jsx";
import SEO from "@/components/common/SEO.jsx";
import HeroVisual from "@/components/common/HeroVisual.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";

/**
 * HeroLine — line-based reveal for the headline.
 * Each line sits in an overflow mask and slides up into place once; the
 * headline reads as type on a page, not as an FX demo. Works identically
 * in Arabic (no mono, no uppercase applied).
 */
function HeroLine({ children, delay = 0 }) {
  return (
    <span className="block overflow-hidden">
      <motion.span
        className="block"
        initial={{ y: "115%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/**
 * Hero — "the product is the poster" (v4).
 * No decorative chrome: a type statement on one side, the flagship product
 * photographed large on the other, and the capacity spec ghosted behind it
 * as background type. The catalog does the selling.
 *
 * Loading/empty states live inside HeroVisual so the hero never fakes a
 * product or breaks while the featured query is in flight.
 */
function Hero({ products, loading }) {
  const { t, isAr } = useLocale();

  return (
    <section className="relative overflow-hidden border-b border-bg-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 py-14 sm:py-16 lg:grid-cols-12 lg:gap-12 lg:py-24">
          <motion.div
            className="lg:col-span-5 xl:col-span-6"
            initial="hidden"
            animate="show"
            variants={staggerContainer}
          >
            <h1 className="font-heading text-display font-bold leading-[1.08] tracking-tight text-bg-text-primary">
              <HeroLine delay={0.05}>{t("home.heroLine1")}</HeroLine>
              <HeroLine delay={0.18}>
                <span className="text-bg-text-secondary">
                  {t("home.heroLine2")}
                </span>
              </HeroLine>
            </h1>

            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.55,
              }}
              className="mt-6 block h-px w-16 origin-start bg-bg-primary-500/80"
              style={{ transformOrigin: isAr ? "right" : "left" }}
              aria-hidden="true"
            />

            <motion.p
              variants={staggerItem}
              className="mt-6 max-w-md text-body-lg text-bg-text-secondary"
            >
              {t("home.heroSubtitle")}
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Link
                to="/shop"
                className="rounded-md bg-bg-primary-500 px-8 py-3.5 text-body-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-bg-primary-600 hover:shadow-card active:translate-y-0"
              >
                {t("home.heroCta")}
              </Link>
              <Link
                to="/shop?category=storage"
                className="text-body-sm font-medium text-bg-text-secondary underline decoration-bg-border underline-offset-4 transition hover:text-bg-text-primary hover:decoration-bg-primary-500"
              >
                {t("home.heroCtaSecondary")}
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-7 xl:col-span-6 lg:-me-8"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.3,
            }}
          >
            <HeroVisual products={products} loading={loading} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const CATEGORY_ICONS = {
  chargers: Plug,
  cables: Cable,
  "power-banks": BatteryCharging,
  "screen-protectors": ShieldCheck,
  "phone-cases": Smartphone,
  cases: Smartphone,
  storage: MemoryStick,
  memmory: MemoryStick,
  earbuds: Headphones,
  headphones: Headphones,
};

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
    fetchBanners({ position: "home_secondary" })
      .then((res) => {
        if (!cancelled) setBanners(res?.data || []);
      })
      .catch(() => {
        if (!cancelled) setIsError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
          message={t("common.common.error")}
          action={{
            label: t("common.common.retry"),
            onClick: () => setReload((v) => v + 1),
          }}
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
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <Link
              to={b.linkUrl || "#"}
              className={`group relative block aspect-[2/1] overflow-hidden rounded-xl ${b.linkUrl ? "" : "pointer-events-none"}`}
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
      .then((res) => {
        if (!cancelled) setCatData(res);
      })
      .catch(() => {
        if (!cancelled) setCatError(true);
      })
      .finally(() => {
        if (!cancelled) setCatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [catReload]);

  useEffect(() => {
    let cancelled = false;
    setFeatLoading(true);
    setFeatError(false);
    fetchProducts({ featured: "true", limit: 8 })
      .then((res) => {
        if (!cancelled) setFeaturedData(res);
      })
      .catch(() => {
        if (!cancelled) setFeatError(true);
      })
      .finally(() => {
        if (!cancelled) setFeatLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [featReload]);

  useEffect(() => {
    let cancelled = false;
    setNewLoading(true);
    setNewError(false);
    fetchProducts({ new: "true", limit: 8 })
      .then((res) => {
        if (!cancelled) setNewData(res);
      })
      .catch(() => {
        if (!cancelled) setNewError(true);
      })
      .finally(() => {
        if (!cancelled) setNewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [newReload]);

  const categories = catData?.data || [];
  const featured = featuredData?.data || [];
  const newArrivals = newData?.data || [];

  return (
    <>
      <SEO
        titleKey="nav.home"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: t("brand.fullName"),
          url: window.location.origin,
          logo: `${window.location.origin}/logo.png`,
        }}
      />

      <Hero products={featured} loading={featLoading} />

      {/* Categories — tiled cards: tinted icon tile, name, slide-in chevron on hover */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        <motion.div {...fadeUp}>
          <div className="mb-5 flex items-end justify-between">
            <p className="font-mono text-caption uppercase tracking-[0.2em] text-bg-text-secondary">
              {t("home.shopByCategory")}
            </p>
            <Link
              to="/shop"
              className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 transition"
            >
              {t("common.viewAll")}
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
              message={t("common.common.error")}
              action={{
                label: t("common.common.retry"),
                onClick: () => setCatReload((v) => v + 1),
              }}
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
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={isHiddenOnMobile ? "hidden sm:block" : ""}
                  >
                    <Link
                      to={`/shop?category=${cat.slug}`}
                      className="group flex items-center gap-4 rounded-md border border-bg-border bg-bg-surface px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-bg-primary-300 hover:shadow-card"
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md"
                        style={{
                          background:
                            "color-mix(in srgb, var(--bg-primary-500) 10%, transparent)",
                        }}
                      >
                        <CategoryIcon
                          size={20}
                          strokeWidth={1.5}
                          className="text-bg-primary-500"
                        />
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
              <p className="mb-1 font-mono text-caption uppercase tracking-[0.2em] text-bg-primary-500">
                {t("home.featuredEyebrow")}
              </p>
              <h2 className="text-h2 font-semibold text-bg-text-primary">
                {t("shop:featured")}
              </h2>
            </div>
            <Link
              to="/shop?sort=featured"
              className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 transition"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <ProductGrid
            products={featured}
            isLoading={featLoading}
            isError={featError}
            onRetry={() => setFeatReload((v) => v + 1)}
            emptyMessage={t("shop:noProducts")}
          />
        </motion.div>
      </section>

      <SecondaryBanners />

      {/* New Arrivals */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 lg:pb-16">
        <motion.div {...fadeUp}>
          <div className="flex items-end justify-between mb-6 lg:mb-8">
            <div>
              <p className="mb-1 font-mono text-caption uppercase tracking-[0.2em] text-bg-primary-500">
                {t("home.newEyebrow")}
              </p>
              <h2 className="text-h2 font-semibold text-bg-text-primary">
                {t("shop:newArrivals")}
              </h2>
            </div>
            <Link
              to="/shop?sort=newest"
              className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 transition"
            >
              {t("common.viewAll")}
            </Link>
          </div>
          <ProductGrid
            products={newArrivals}
            isLoading={newLoading}
            isError={newError}
            onRetry={() => setNewReload((v) => v + 1)}
            emptyMessage={t("shop:noProducts")}
          />
        </motion.div>
      </section>

      {/* Trust strip — light spec-sheet band, hardware icon chips, hairline dividers */}
      <section className="border-y border-bg-border bg-bg-surface-sunken/50">
        <motion.div
          {...fadeUp}
          className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12"
        >
          <div className="grid grid-cols-1 divide-y divide-bg-border sm:grid-cols-3 sm:divide-y-0 sm:divide-x rtl:sm:divide-x-reverse">
            {[
              { Icon: Truck, labelKey: "footer.cod", descKey: "home.codDesc" },
              {
                Icon: Clock,
                labelKey: "home.deliveryDays",
                descKey: "home.deliveryDesc",
              },
              {
                Icon: ShieldCheck,
                labelKey: "home.quality",
                descKey: "home.qualityDesc",
              },
            ].map(({ Icon, labelKey, descKey }, i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-6 sm:justify-center sm:py-0 sm:px-8"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-bg-border bg-bg-surface shadow-card">
                  <Icon
                    size={20}
                    strokeWidth={1.5}
                    className="text-bg-primary-500"
                  />
                </span>
                <div>
                  <h3 className="text-body-sm font-semibold text-bg-text-primary">
                    {t(labelKey)}
                  </h3>
                  <p className="mt-0.5 text-caption text-bg-text-secondary">
                    {t(descKey)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </>
  );
}
