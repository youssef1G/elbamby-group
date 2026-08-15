import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/context/LocaleContext.jsx";

/**
 * HeroVisual — logo medallion + store title (v14, "quiet premium" pass).
 *
 * One orchestrated entrance, then stillness. A single static glow instead
 * of layered pulsing blobs, no rotating ring/arc, no idle tilt or bob —
 * the badge earns its weight from shadow depth and a crisp edge, not motion.
 * A subtle hover lift is the only ongoing interactivity. Title still reveals
 * with a blur-rise on load. Store name in the active language only.
 */
export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();

  const EASE = [0.16, 1, 0.3, 1];

  const title = isAr ? ["البمبي", "جروب"] : ["El", "Bamby", "Group"];

  return (
    <figure className="relative flex w-full select-none flex-col items-center justify-center overflow-hidden px-6 py-14 text-center min-h-[340px] sm:min-h-[440px] lg:min-h-[540px]">
      {/* Single quiet ambient glow — mostly static, near-imperceptible breathing */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[38%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-primary-500/10 blur-3xl sm:h-80 sm:w-80"
        animate={reduceMotion ? undefined : { opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-9 sm:gap-11">
        {/* Badge — one confident entrance, then still. Hover is the only ongoing motion. */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9, y: reduceMotion ? 0 : 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
          whileHover={reduceMotion ? undefined : { scale: 1.035 }}
          className="relative h-32 w-32 sm:h-40 sm:w-40 cursor-default"
        >
          {/* Grounding shadow — depth instead of glow */}
          <div className="absolute -bottom-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black/20 blur-lg" />

          {/* Thin static ring for structure, no rotation */}
          <div className="pointer-events-none absolute -inset-3 rounded-full border border-bg-border/60" />

          <div className="relative h-full w-full overflow-hidden rounded-full border border-bg-border bg-bg-surface-raised p-2 shadow-card">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/40 to-transparent" />
            <div className="h-full w-full overflow-hidden rounded-full">
              <img
                src="/logo.jpg"
                alt={isAr ? "البمبي جروب" : "El Bamby Group"}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </div>
        </motion.div>

        {/* Store title — active language only, blur-rise reveal */}
        <div className="flex flex-col items-center gap-3.5">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
            className="font-mono text-[11px] uppercase tracking-[0.35em] text-bg-text-secondary"
          >
            {isAr ? "بيت الميموري" : "BG"}
          </motion.p>

          <h2 className="flex flex-wrap items-baseline justify-center gap-x-3 font-heading font-bold tracking-tight text-bg-text-primary">
            {title.map((word, i) => (
              <motion.span
                key={word}
                className="inline-block text-4xl leading-[1.3] sm:text-5xl lg:text-6xl"
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: "0.5em", filter: "blur(6px)" }
                }
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: "0em", filter: "blur(0px)" }
                }
                transition={{
                  duration: 0.75,
                  ease: EASE,
                  delay: 0.5 + i * 0.1,
                }}
              >
                {word}
              </motion.span>
            ))}
          </h2>

          <motion.span
            initial={{ scaleX: reduceMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.85 }}
            className="mt-1 h-px w-14 origin-center bg-bg-primary-500/70 sm:w-20"
          />
        </div>
      </div>
    </figure>
  );
}
