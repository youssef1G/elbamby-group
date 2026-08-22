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
import { fetchCategories, fetchProducts } from "@/api.js";
import { fadeUp } from "@/lib/animations.js";
import ProductGrid from "@/components/shop/ProductGrid.jsx";
import SEO from "@/components/common/SEO.jsx";
import EmptyState from "@/components/ui/EmptyState.jsx";
import Skeleton from "@/components/ui/Skeleton.jsx";

/**
 * BrandStrip — slim store title band (Jumia/Amazon-style landing: products
 * come first, branding gets one compact row). Single row on desktop, stacks
 * on mobile.
 */
function BrandStrip() {
  const { t } = useLocale();

  return (
    <section className="relative overflow-hidden border-b border-bg-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 120% at 80% 0%, color-mix(in srgb, var(--bg-primary-500) 10%, transparent) 0%, transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 lg:py-8"
      >
        <div>
          <h1 className="font-heading text-h3 font-bold tracking-tight text-bg-text-primary sm:text-h2">
            {t("home.heroLine1")}{" "}
            <span className="text-bg-text-secondary">
              {t("home.heroLine2")}
            </span>
          </h1>
          <p className="mt-1 max-w-xl text-caption text-bg-text-secondary">
            {t("home.heroSubtitle")}
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex h-10 shrink-0 items-center self-start rounded-sm bg-bg-primary-500 px-6 text-body-sm font-semibold text-white transition-all duration-200 hover:bg-bg-primary-600 hover:shadow-card active:scale-[0.98] sm:self-center"
        >
          {t("home.heroCta")}
        </Link>
      </motion.div>
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
        titleRaw="El Bamby Group | البمبي جروب"
        descriptionKey="common:home.description"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "El Bamby Group",
          alternateName: t("brand.fullName"),
          url: window.location.origin,
          logo: `${window.location.origin}/logo.jpg`,
        }}
      />

      <BrandStrip />

      {/* Categories — compact tiles so the product grid stays near the fold */}
      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <motion.div {...fadeUp}>
          <div className="mb-4 flex items-end justify-between">
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
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[56px] w-full rounded-md" />
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
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {categories.map((cat, i) => {
                const CategoryIcon = CATEGORY_ICONS[cat.slug] || Package;
                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                  >
                    <Link
                      to={`/shop?category=${cat.slug}`}
                      className="group flex items-center gap-2.5 rounded-md border border-bg-border bg-bg-surface px-3 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-bg-primary-300 hover:shadow-card sm:gap-3 sm:px-4 sm:py-3"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10"
                        style={{
                          background:
                            "color-mix(in srgb, var(--bg-primary-500) 10%, transparent)",
                        }}
                      >
                        <CategoryIcon
                          size={18}
                          strokeWidth={1.5}
                          className="text-bg-primary-500"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-bg-text-primary transition-colors duration-300 group-hover:text-bg-primary-500">
                        {isAr ? cat.nameAr : cat.nameEn}
                      </span>
                      <ChevronRight
                        size={15}
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

      {/* Featured — first product grid, right below the fold line */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10">
        <motion.div {...fadeUp}>
          <div className="mb-6 flex items-end justify-between">
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

      {/* New Arrivals */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pb-16">
        <motion.div {...fadeUp}>
          <div className="mb-6 flex items-end justify-between lg:mb-8">
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
