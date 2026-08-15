import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/context/LocaleContext.jsx";

/**
 * HeroVisual — logo medallion + store title (v15, "precision dial" pass).
 *
 * Signature move: a ring of bezel ticks flies in from scattered positions
 * and snaps into a complete dial around the badge — one choreographed
 * assembly, then stillness. A single light pulse sweeps the finished dial
 * once as a "power-on" beat. No infinite loops, no ambient glow soup —
 * the only ongoing motion is a barely-there breathing backdrop and a
 * hover lift on the badge. Store name in the active language only.
 */

const CENTER = 100;
const TICK_COUNT = 16;
const R_IN = 80;
const R_OUT = 94;
const SWEEP_RADIUS = 87;

function polar(radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const angle = -90 + i * (360 / TICK_COUNT);
  const jitterAngle = ((i % 3) - 1) * 8; // deterministic scatter, not random
  const jitterRadius = 20 + (i % 4) * 6;
  return { angle, jitterAngle, jitterRadius, isAccent: i === 0 };
});

const SWEEP_STEPS = 33;
const SWEEP_PATH = Array.from({ length: SWEEP_STEPS }, (_, i) =>
  polar(SWEEP_RADIUS, -90 + (360 * i) / (SWEEP_STEPS - 1))
);

export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();

  const EASE = [0.16, 1, 0.3, 1];
  const SNAP = [0.34, 1.56, 0.64, 1]; // slight overshoot, "click into place"

  const title = isAr ? ["البمبي", "جروب"] : ["El", "Bamby", "Group"];
  const assemblyEnd = 0.35 + TICK_COUNT * 0.032 + 0.55; // ~1.4s

  return (
    <figure className="relative flex w-full select-none flex-col items-center justify-center overflow-hidden px-6 py-14 text-center min-h-[340px] sm:min-h-[440px] lg:min-h-[540px]">
      {/* Single quiet backdrop — near-static, not a pulsing blob */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-[38%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bg-primary-500/10 blur-3xl sm:h-80 sm:w-80"
        animate={reduceMotion ? undefined : { opacity: [0.55, 0.8, 0.55] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-9 sm:gap-11">
        {/* Dial assembly */}
        <div className="relative h-44 w-44 sm:h-56 sm:w-56">
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
            {TICKS.map((t, i) => {
              const final = { p1: polar(R_IN, t.angle), p2: polar(R_OUT, t.angle) };
              const scatterAngle = t.angle + t.jitterAngle;
              const scatter = {
                p1: polar(R_IN + t.jitterRadius, scatterAngle),
                p2: polar(R_OUT + t.jitterRadius, scatterAngle),
              };
              const start = reduceMotion ? final : scatter;

              return (
                <motion.line
                  key={i}
                  strokeLinecap="round"
                  strokeWidth={t.isAccent ? 3.5 : 2}
                  style={{ stroke: t.isAccent ? "var(--bg-primary-500)" : "var(--bg-border)" }}
                  initial={{ opacity: 0, x1: start.p1.x, y1: start.p1.y, x2: start.p2.x, y2: start.p2.y }}
                  animate={{ opacity: 1, x1: final.p1.x, y1: final.p1.y, x2: final.p2.x, y2: final.p2.y }}
                  transition={{
                    duration: reduceMotion ? 0.3 : 0.55,
                    delay: reduceMotion ? i * 0.02 : 0.35 + i * 0.032,
                    ease: SNAP,
                  }}
                />
              );
            })}

            {/* One-shot power-on sweep, not a loop */}
            {!reduceMotion && (
              <motion.circle
                r={2.4}
                style={{ fill: "var(--bg-primary-500)" }}
                initial={{ opacity: 0 }}
                animate={{
                  cx: SWEEP_PATH.map((p) => p.x),
                  cy: SWEEP_PATH.map((p) => p.y),
                  opacity: [0, 1, 1, 1, 0],
                }}
                transition={{ duration: 1.5, delay: assemblyEnd, ease: "linear" }}
                className="blur-[1px]"
              />
            )}
          </svg>

          {/* Badge — settles into the finished dial, then still */}
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.85, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: reduceMotion ? 0.1 : assemblyEnd - 0.3 }}
            whileHover={reduceMotion ? undefined : { scale: 1.035 }}
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 cursor-default sm:h-40 sm:w-40"
          >
            <div className="absolute -bottom-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black/20 blur-lg" />
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
        </div>

        {/* Store title */}
        <div className="flex flex-col items-center gap-3.5">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: assemblyEnd + 0.15 }}
            className="font-mono text-[11px] uppercase tracking-[0.35em] text-bg-text-secondary"
          >
            {isAr ? "بيت الميموري" : "BG"}
          </motion.p>

          <h2 className="flex flex-wrap items-baseline justify-center gap-x-3 font-heading font-bold tracking-tight text-bg-text-primary">
            {title.map((word, i) => (
              <motion.span
                key={word}
                className="inline-block text-4xl leading-[1.3] sm:text-5xl lg:text-6xl"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: "0.5em", filter: "blur(6px)" }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: "0em", filter: "blur(0px)" }}
                transition={{ duration: 0.75, ease: EASE, delay: assemblyEnd + 0.25 + i * 0.1 }}
              >
                {word}
              </motion.span>
            ))}
          </h2>

          <motion.span
            initial={{ scaleX: reduceMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, ease: EASE, delay: assemblyEnd + 0.6 }}
            className="mt-1 h-px w-14 origin-center bg-bg-primary-500/70 sm:w-20"
          />
        </div>
      </div>
    </figure>
  );
}
