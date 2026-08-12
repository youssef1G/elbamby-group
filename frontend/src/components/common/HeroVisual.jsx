import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/context/LocaleContext.jsx";

/**
 * HeroVisual — logo medallion + store title (v10).
 *
 * A single calm focal point: the logo in a perfect circle, lit by a
 * breathing magenta bloom and one slow sweeping accent. Below it, the
 * store name in the active language only (Arabic ⇄ Latin), revealed
 * word-by-word through mask rises. Quiet, symmetric, mobile-first.
 */
export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();

  const EASE = [0.22, 1, 0.36, 1];

  const title = isAr ? ["البمبي", "جروب"] : ["El", "Bamby", "Group"];

  return (
    <figure className="relative h-full min-h-[380px] w-full select-none overflow-hidden sm:min-h-[460px] lg:min-h-[540px]">
      {/* Ambient magenta bloom — slow breathing light */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[36%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-primary-500/15 blur-3xl sm:h-96 sm:w-96"
        animate={
          reduceMotion
            ? undefined
            : { scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }
        }
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 px-6 text-center sm:gap-10">
        {/* Logo medallion */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
          className="relative flex items-center justify-center"
        >
          {/* Slow sweeping ring with a single glowing dot */}
          <motion.div
            className="pointer-events-none absolute h-36 w-36 rounded-full border border-bg-border/80 sm:h-44 sm:w-44"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-bg-primary-500 shadow-[0_0_12px_var(--bg-primary-500)]" />
          </motion.div>
          {/* Faint offset hairline */}
          <div className="pointer-events-none absolute h-32 w-32 rounded-full border border-bg-border/40 sm:h-40 sm:w-40" />

          {/* The mark itself — gentle float */}
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="h-24 w-24 overflow-hidden rounded-full border border-bg-border bg-bg-surface shadow-card shadow-[0_0_50px_-10px_var(--bg-primary-500)] sm:h-32 sm:w-32">
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
          {isAr ? (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
              className="font-mono text-[11px] uppercase tracking-[0.3em] text-bg-text-secondary"
            >
              بيت الميموري
            </motion.p>
          ) : (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
              className="font-mono text-[11px] uppercase tracking-[0.3em] text-bg-text-secondary"
            >
              BG
            </motion.p>
          )}

          <h2 className="flex flex-wrap items-baseline justify-center gap-x-3 font-heading font-bold tracking-tight text-bg-text-primary">
            {title.map((word, i) => (
              <span key={word} className="inline-block overflow-hidden pb-1">
                <motion.span
                  className="inline-block text-4xl sm:text-5xl lg:text-6xl"
                  initial={{ y: reduceMotion ? 0 : "115%" }}
                  animate={{ y: 0 }}
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
            className="mt-1 h-px w-14 origin-center bg-bg-primary-500/80 sm:w-16"
          />
        </div>
      </div>
    </figure>
  );
}
