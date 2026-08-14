import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/context/LocaleContext.jsx";

/**
 * HeroVisual — logo medallion + store title (v13).
 *
 * The badge: a raised white disc carrying the mark, floating on a pink
 * under-glow with a clearly visible sweeping light arc, a glowing dot on
 * a slow ring, and a gentle idle tilt. The title reveals with a blur-rise
 * — no overflow masks anywhere, so Arabic descenders can never be cropped.
 * Store name in the active language only.
 */
export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();

  const EASE = [0.22, 1, 0.36, 1];

  const title = isAr ? ["البمبي", "جروب"] : ["El", "Bamby", "Group"];

  return (
    <figure className="relative flex w-full select-none flex-col items-center justify-center overflow-hidden px-6 py-12 text-center min-h-[340px] sm:min-h-[440px] lg:min-h-[540px]">
      {/* Ambient bloom — wide soft wash + tighter hot core */}
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

      <div className="relative z-10 flex flex-col items-center gap-8 sm:gap-10">
        {/* Badge assembly — idle tilt */}
        <motion.div
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.88 }}
          animate={
            reduceMotion
              ? { opacity: 1, scale: 1 }
              : { opacity: 1, scale: 1, rotate: [0, 2, -1.5, 0] }
          }
          transition={
            reduceMotion
              ? { duration: 0.8, ease: EASE, delay: 0.15 }
              : {
                  scale: { duration: 0.8, ease: EASE, delay: 0.15 },
                  rotate: {
                    duration: 14,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1.2,
                  },
                }
          }
          className="relative flex items-center justify-center"
        >
          {/* Dot ring — slow sweep */}
          <motion.div
            className="pointer-events-none absolute h-44 w-44 rounded-full border border-bg-border/80 sm:h-52 sm:w-52"
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-bg-primary-500 shadow-[0_0_14px_var(--bg-primary-500)]" />
            <span className="absolute -top-7 left-1/2 h-6 w-8 -translate-x-1/2 rounded-full bg-bg-primary-500/25 blur-md" />
          </motion.div>

          {/* Breathing hairline */}
          <motion.div
            className="pointer-events-none absolute h-40 w-40 rounded-full border border-bg-border/40 sm:h-48 sm:w-48"
            animate={
              reduceMotion
                ? undefined
                : { scale: [1, 1.03, 1], opacity: [0.6, 1, 0.6] }
            }
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.4,
            }}
          />

          {/* Visible sweeping light arc around the badge */}
          <motion.div
            className="pointer-events-none absolute h-32 w-32 rounded-full blur-[3px] sm:h-40 sm:w-40"
            style={{
              background:
                "conic-gradient(from 20deg, transparent 0deg, transparent 300deg, var(--bg-primary-500) 335deg, transparent 360deg)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px))",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 8px))",
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          />

          {/* The badge — raised disc, floating on a pink under-glow */}
          <motion.div
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-32 w-32 sm:h-40 sm:w-40"
          >
            <div className="absolute -bottom-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-bg-primary-500/30 blur-xl" />
            <div className="relative h-full w-full overflow-hidden rounded-full border border-bg-border bg-bg-surface-raised p-2 shadow-card">
              {/* Inner top sheen */}
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/45 to-transparent" />
              <motion.div
                className="h-full w-full overflow-hidden rounded-full"
                animate={reduceMotion ? undefined : { scale: [1, 1.025, 1] }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.6,
                }}
              >
                <img
                  src="/logo.jpg"
                  alt={isAr ? "البمبي جروب" : "El Bamby Group"}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Store title — active language only, blur-rise reveal (no masks) */}
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
              <motion.span
                key={word}
                className="inline-block text-4xl leading-[1.35] sm:text-5xl lg:text-6xl"
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, y: "0.55em", filter: "blur(8px)" }
                }
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, y: "0em", filter: "blur(0px)" }
                }
                transition={{
                  duration: 0.8,
                  ease: EASE,
                  delay: 0.55 + i * 0.12,
                }}
              >
                {word}
              </motion.span>
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
