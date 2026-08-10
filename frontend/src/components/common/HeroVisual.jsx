import { useEffect, useState } from "react";
import { motion, animate, useMotionValue } from "motion/react";
import { Link } from "react-router-dom";
import { useLocale } from "@/context/LocaleContext.jsx";
import { formatPrice } from "@/lib/formatters.js";
import { Cpu } from "lucide-react";

/**
 * HeroVisual — the flagship product as a printed poster (v6).
 *
 * No card, no frame, no stickers: the product photo fills the whole visual
 * area edge-to-edge, cropped macro-scale. Two motions keep it alive —
 * a spec counter that counts up to the real capacity on load, and a very
 * slow breathing zoom on the photo. A slim ink strip carries the specs and
 * price. The image drifts; nothing else moves.
 */
export default function HeroVisual({ products = [], loading = false }) {
  const { t, isAr } = useLocale();

  if (loading) {
    return (
      <div
        className="relative h-full min-h-[340px] w-full sm:min-h-[440px]"
        aria-hidden="true"
      >
        <div className="h-full min-h-[340px] w-full animate-pulse bg-bg-surface-sunken sm:min-h-[440px]" />
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
  const capacity = product?.capacityGb;
  const specs = [product?.interfaceType, product?.speedClass]
    .filter(Boolean)
    .join(" · ");
  const fallbackLabel = capacity
    ? `${capacity}GB`
    : product?.interfaceType || "BG";

  // The spec counter: counts up to the real capacity once the page loads.
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(fallbackLabel);
  useEffect(() => {
    if (!capacity) {
      setDisplay(fallbackLabel);
      return undefined;
    }
    setDisplay("0");
    const controls = animate(count, capacity, {
      duration: 1.8,
      delay: 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(String(Math.round(v))),
    });
    return () => controls.stop();
  }, [capacity, fallbackLabel, count]);

  return (
    <figure
      className="relative h-full min-h-[340px] w-full overflow-hidden border border-bg-border sm:min-h-[440px] lg:min-h-[520px]"
      aria-label={name || t("brand.fullName")}
    >
      {image && product ? (
        <Link
          to={`/product/${product.slug}`}
          className="group relative block h-full w-full"
        >
          <motion.img
            src={image}
            alt={name}
            initial={{ scale: 1.14, opacity: 0 }}
            animate={{ scale: [1.09, 1.03, 1.06], opacity: 1 }}
            transition={{
              opacity: { duration: 0.8, ease: "easeOut" },
              scale: { duration: 16, repeat: Infinity, ease: "easeInOut" },
            }}
            className="h-full w-full object-cover"
          />

          {/* Ink strip — specs and price, on the image */}
          <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-bg-ink/85 px-5 py-4 backdrop-blur-sm sm:px-6">
            <div className="min-w-0">
              <p className="font-mono text-caption tracking-[0.14em] text-bg-ink-text/70 ltr-nums">
                {capacity ? `${display} GB` : fallbackLabel}
                {specs ? ` · ${specs}` : ""}
              </p>
              <p className="mt-0.5 truncate text-body-sm font-semibold text-bg-ink-text">
                {name}
              </p>
            </div>
            <span className="shrink-0 font-mono text-body-sm font-semibold text-bg-ink-text ltr-nums">
              {formatPrice(product.price)}
            </span>
          </figcaption>
        </Link>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-bg-surface-sunken">
          <div className="flex flex-col items-center gap-4 text-bg-text-secondary">
            <Cpu
              size={44}
              strokeWidth={1.25}
              className="text-bg-primary-500"
              aria-hidden="true"
              focusable="false"
            />
            <span className="font-mono text-caption tracking-[0.2em] uppercase ltr-nums">
              {fallbackLabel}
            </span>
          </div>
        </div>
      )}
    </figure>
  );
}
