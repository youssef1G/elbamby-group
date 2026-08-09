import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { Link } from "react-router-dom";
import { useLocale } from "@/context/LocaleContext.jsx";
import { formatPrice } from "@/lib/formatters.js";
import { Cpu } from "lucide-react";

/**
 * HeroVisual — the flagship product as a showcase piece (v5).
 *
 * One product, presented like an object in a lit display: a slow-spinning
 * dashed orbit, an echo sheet behind, and the product card itself reacting
 * to the cursor with a soft spring tilt. Real spec data (capacity, write
 * speed, interface) floats around it as mono chips — each on its own gentle
 * bob. The card settles in with a spring pop on mount.
 *
 * Loading shows a quiet skeleton; empty/error shows the brand plate, so the
 * hero never breaks or fakes a product.
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
            <div className="h-3 w-32 rounded-sm bg-bg-surface-sunken" />
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
  const chips = product
    ? [
        product.capacityGb && `${product.capacityGb}GB`,
        product.interfaceType,
        product.speedClass,
      ]
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const cardRef = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 140, damping: 18 });
  const sry = useSpring(ry, { stiffness: 140, damping: 18 });

  const handleMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 10);
    rx.set(-py * 10);
  };
  const resetTilt = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <figure
      className="relative mx-auto w-full max-w-xl select-none lg:max-w-none"
      aria-label={name || t("brand.fullName")}
    >
      {/* Ambient light — blurred solid color, no gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -end-12 h-72 w-72 rounded-full bg-bg-primary-500/[0.12] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -start-12 h-64 w-64 rounded-full bg-bg-primary-400/[0.1] blur-3xl"
      />

      {/* Slowly orbiting ring with a single luminous marker */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
          className="relative aspect-square w-[94%] rounded-full border border-dashed border-bg-border"
        >
          <span className="absolute -top-1 start-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-bg-primary-500" />
        </motion.div>
      </div>

      {/* Ghosted capacity numeral — the spec as background type */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -end-4 z-0 font-mono text-[6rem] font-medium leading-none tracking-tight text-bg-text-primary/[0.07] ltr-nums sm:text-[9rem] lg:-top-12 lg:text-[11rem]"
      >
        {numeral}
      </span>

      {/* Floating spec chips — real product data, on slow bobs */}
      {chips[0] && (
        <motion.span
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
          className="absolute -top-4 -end-3 z-20 rounded-md border border-bg-border bg-bg-surface-raised px-3 py-1.5 font-mono text-caption tracking-wider text-bg-text-primary shadow-card ltr-nums"
        >
          {chips[0]}
        </motion.span>
      )}
      {chips[1] && (
        <motion.span
          animate={{ y: [0, 9, 0] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.4,
          }}
          className="absolute top-1/4 -start-5 z-20 rounded-md border border-bg-border bg-bg-surface-raised px-3 py-1.5 font-mono text-caption tracking-wider text-bg-text-primary shadow-card ltr-nums"
        >
          {chips[1]}
        </motion.span>
      )}

      {/* Echo sheet behind the card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 translate-x-4 translate-y-4 rotate-2 rounded-[1.5rem] bg-bg-surface-sunken"
      />

      <div
        className="relative z-10"
        style={{ perspective: 1200 }}
        onMouseMove={handleMove}
        onMouseLeave={resetTilt}
      >
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 44, scale: 0.94, rotate: -2 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
          style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
          className="will-change-transform"
        >
          {/* Gentle continuous float on the whole card */}
          <motion.div
            animate={{ y: [0, -7, 0] }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.2,
            }}
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
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                  />
                </div>

                {/* Brand token tag */}
                <span className="absolute top-4 start-4 rounded-full bg-bg-ink/80 px-3 py-1 text-[11px] font-semibold tracking-wide text-bg-ink-text backdrop-blur-sm">
                  {t("home.heroToken")}
                </span>

                <figcaption className="flex items-center justify-between gap-3 border-t border-bg-border bg-bg-surface-raised px-5 py-4">
                  <span className="min-w-0 truncate text-body-sm font-semibold text-bg-text-primary">
                    {name}
                  </span>
                  <span className="shrink-0 font-mono text-body-sm font-semibold text-bg-primary-600 ltr-nums">
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
                  <span className="font-mono text-caption tracking-[0.2em] uppercase ltr-nums">
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
