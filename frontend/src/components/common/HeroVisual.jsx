import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/context/LocaleContext.jsx";

/**
 * HeroVisual — logo medallion + store title (v11).
 *
 * Same concept: the logo in a perfect circle, lit by breathing brand
 * light with one slow sweeping accent, and the store name in the active
 * language revealed word-by-word. Refinements: layered bloom for depth,
 * a breathing outer hairline, a trailing glow behind the sweeping dot,
 * and em-based mask padding so Arabic descenders never clip.
 */
export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();

  const EASE = [0.22, 1, 0.36, 1];

  const title = isAr ? ["البمبي", "جروب"] : ["El", "Bamby", "Group"];

  return (
    <figure className="relative h-full min-h-[340px] w-full select-none overflow-hidden sm:min-h-[440px] lg:min-h-[540px]">
      {/* Layered ambient bloom — wide soft wash + tighter hot core */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[36%] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-primary-500/15 blur-3xl sm:h-[24rem] sm:w-[24rem]"
        animate={
          reduceMotion
            ? undefined
            : { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[36%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-primary-500/20 blur-2xl sm:h-56 sm:w-56"
        animate={
          reduceMotion
            ? undefined
            : { scale: [1, 1.2, 1], opacity: [0.5, 0.85, 0.5] }
        }
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.8,
        }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center sm:gap-10">
        {/* Logo medallion */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className="relative flex items-center justify-center"
        >
          {/* Sweeping ring with a glowing dot + soft trail */}
          <motion.div
            className="pointer-events-none absolute h-36 w-36 rounded-full border border-bg-border/80 sm:h-44 sm:w-44"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-bg-primary-500 shadow-[0_0_14px_var(--bg-primary-500)]" />
            <span className="absolute -top-7 left-1/2 h-6 w-8 -translate-x-1/2 rounded-full bg-bg-primary-500/25 blur-md" />
          </motion.div>
          {/* Static hairline — breathes slowly instead of sitting dead */}
          <motion.div
            className="pointer-events-none absolute h-32 w-32 rounded-full border border-bg-border/40 sm:h-40 sm:w-40"
            animate={
              reduceMotion
                ? undefined
                : { scale: [1, 1.035, 1], opacity: [0.6, 1, 0.6] }
            }
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />

          {/* The mark itself — gentle float */}
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="h-24 w-24 overflow-hidden rounded-full border border-bg-border bg-bg-surface ring-1 ring-bg-border/60 shadow-card shadow-[0_0_55px_-10px_var(--bg-primary-500)] sm:h-32 sm:w-32">
              <img
                src="/logo.jpg"
                alt={isAr ? "البمبي جروب" : "El Bamby Group"}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Store title — active language only */}
        <div className="flex flex-col items-center gap-3">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-bg-text-secondary"
          >
            {isAr ? "بيت الميموري" : "BG"}
          </motion.p>

          <h2 className="flex flex-wrap items-baseline justify-center gap-x-3 font-heading font-bold tracking-tight text-bg-text-primary">
            {title.map((word, i) => (
              <span
                key={word}
                className="inline-block overflow-hidden pb-[0.15em] -mb-[0.15em]"
              >
                <motion.span
                  className="inline-block text-4xl leading-[1.15] sm:text-5xl lg:text-6xl"
                  initial={
                    reduceMotion ? { opacity: 0 } : { opacity: 0, y: "110%" }
                  }
                  animate={
                    reduceMotion ? { opacity: 1 } : { opacity: 1, y: "0%" }
                  }
                  transition={{
                    duration: 0.85,
                    ease: EASE,
                    delay: 0.55 + i * 0.12,
                  }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h2>

          <motion.span
            initial={{ scaleX: reduceMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.95 }}
            className="mt-1 h-px w-14 origin-center bg-bg-primary-500/80 sm:w-20"
          />
        </div>
      </div>
    </figure>
  );
}
