import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useLocale } from "@/context/LocaleContext.jsx";
import { formatPrice } from "@/lib/formatters.js";
import { Cpu } from "lucide-react";

/**
 * HeroVisual — the hero's product statement (v4).
 *
 * One real product, photographed large: the catalog is the brand. A soft
 * rotated echo behind, a ghosted capacity numeral, a dashed accent ring —
 * geometry in service of the product, not decoration over it. The figure
 * settles in once and floats very gently; nothing else moves.
 *
 * Loading shows a quiet skeleton; empty/error shows a placeholder plate
 * with the brand mark, so the hero never breaks or fakes a product.
 */
export default function HeroVisual({ products = [], loading = false }) {
  const { t, isAr } = useLocale();

  if (loading) {
    return (
      <div
        className="relative mx-auto w-full max-w-xl lg:max-w-none"
        aria-hidden="true"
      >
        <div className="animate-pulse">
          <div className="relative">
            <div className="absolute inset-0 translate-y-3 translate-x-3 rounded-[1.5rem] bg-bg-surface-sunken" />
            <div className="relative aspect-[4/5] w-full rounded-[1.5rem] border border-bg-border bg-bg-surface-sunken sm:aspect-[5/4]" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 w-20 rounded-sm bg-bg-surface-sunken" />
            <div className="h-4 w-16 rounded-sm bg-bg-surface-sunken" />
          </div>
        </div>
      </div>
    );
  }

  const product = products[0];
  const image = product?.productImages?.[0]?.imageUrl || "";
  const name = product
    ? isAr && product.nameAr
      ? product.nameAr
      : product.nameEn
    : "";
  const numeral = product?.capacityGb
    ? `${product.capacityGb}GB`
    : product?.interfaceType || "BG";

  return (
    <figure
      className="relative mx-auto w-full max-w-xl lg:max-w-none select-none"
      aria-label={name || t("home.heroSerial")}
    >
      {/* Ghosted capacity numeral — the product's spec as background type */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -end-4 z-0 font-mono text-[6.5rem] font-medium leading-none tracking-tight text-bg-text-primary/[0.07] sm:text-[9rem] lg:-top-14 lg:text-[11rem] ltr-nums"
      >
        {numeral}
      </span>

      {/* Mono ring accent */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -start-6 z-0 h-24 w-28 rounded-full border border-dashed border-bg-border"
      />

      <div className="relative z-10">
        {/* Echo panel behind the card */}
        <div
          aria-hidden="true"
          className="absolute inset-0 translate-x-4 translate-y-4 rotate-2 rounded-[1.5rem] bg-bg-surface-sunken"
        />

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          >
            {image && product ? (
              <Link
                to={`/product/${product.slug}`}
                className="group relative block overflow-hidden rounded-[1.5rem] border border-bg-border bg-bg-surface-raised shadow-card"
              >
                <div className="aspect-[4/5] overflow-hidden sm:aspect-[5/4]">
                  <img
                    src={image}
                    alt={name}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="flex items-center justify-between gap-3 border-t border-bg-border px-5 py-4">
                  <span className="font-mono text-caption tracking-[0.18em] text-bg-text-secondary ltr-nums">
                    {t("home.heroSerial")}
                  </span>
                  <span className="min-w-0 truncate text-body-sm font-semibold text-bg-text-primary">
                    {name}
                  </span>
                  <span className="shrink-0 font-mono text-body-sm font-medium text-bg-primary-600 ltr-nums">
                    {formatPrice(product.price)}
                  </span>
                </figcaption>
              </Link>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] border border-bg-border bg-bg-surface-raised sm:aspect-[5/4]">
                <div className="flex flex-col items-center gap-4 text-bg-text-secondary">
                  <Cpu
                    size={44}
                    strokeWidth={1.25}
                    className="text-bg-primary-500"
                    aria-hidden="true"
                    focusable="false"
                  />
                  <span className="font-mono text-caption tracking-[0.2em] uppercase">
                    {numeral}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </figure>
  );
}
