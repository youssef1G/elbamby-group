import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/context/LocaleContext.jsx";

const EASE = [0.22, 1, 0.36, 1];

/**
 * HeroVisual — refined brand emblem.
 * A single logo presented with depth, a subtle ambient glow,
 * and clean typography beneath. No perpetual motion —
 * just a composed, premium entrance.
 */
export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();

  const titleWords = isAr ? ["البمبي", "جروب"] : ["EL", "BAMBY", "GROUP"];
  const eyebrow = isAr ? "بيت الميموري · مصر" : "MEMORY · EST. EGYPT";
  const caption = isAr ? "BG-001 · المتجر الرسمي" : "BG-001 · OFFICIAL STORE";

  return (
    <figure
      className="relative isolate flex w-full select-none flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: "min(72vh, 560px)" }}
    >
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <motion.div
          className="h-[28rem] w-[28rem] rounded-full opacity-0 blur-3xl"
          style={{ background: "var(--bg-primary-500)" }}
          initial={reduceMotion ? { opacity: 0.08 } : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 0.08, scale: 1 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
        />
      </div>

      {/* ── Subtle grid texture ── */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(var(--bg-border) 1px, transparent 1px), linear-gradient(90deg, var(--bg-border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      {/* ── Main composition ── */}
      <div className="relative z-10 flex flex-col items-center gap-8 sm:gap-10">
        {/* Logo emblem */}
        <motion.div
          className="relative"
          style={{
            width: "min(52vw, 260px)",
            height: "min(52vw, 260px)",
          }}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
        >
          {/* Soft shadow beneath */}
          <span
            aria-hidden
            className="absolute -bottom-3 left-1/2 h-8 w-3/5 -translate-x-1/2 rounded-full bg-bg-primary-500/20 blur-2xl"
          />

          {/* Outer ring */}
          <div
            className="absolute -inset-3 rounded-full border border-bg-border/60"
            aria-hidden
          />

          {/* Main circle */}
          <div className="relative h-full w-full overflow-hidden rounded-full border border-bg-border bg-bg-surface-raised shadow-card">
            {/* Top-light gradient overlay */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/2 rounded-t-full bg-gradient-to-b from-white/20 to-transparent dark:from-white/8"
            />

            {/* Logo image */}
            <img
              src="/logo.jpg"
              alt={isAr ? "البمبي جروب" : "El Bamby Group"}
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </motion.div>

        {/* Typography stack */}
        <div className="flex flex-col items-center gap-3">
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
            className={`text-[10px] uppercase tracking-[0.4em] text-bg-text-secondary ${
              isAr ? "font-arabic tracking-normal" : "font-mono"
            }`}
          >
            {eyebrow}
          </motion.p>

          {/* Brand name */}
          <h2
            className={`flex flex-wrap items-baseline justify-center ${
              isAr ? "gap-x-4" : "gap-x-3 sm:gap-x-4"
            }`}
          >
            {titleWords.map((word, i) => (
              <span
                key={word}
                className="inline-block overflow-hidden"
              >
                <motion.span
                  className={`inline-block font-heading font-bold text-bg-text-primary ${
                    isAr
                      ? "font-arabic text-4xl leading-[1.2] sm:text-5xl lg:text-6xl"
                      : "text-3xl leading-[1.02] tracking-[-0.025em] sm:text-5xl lg:text-6xl"
                  }`}
                  initial={reduceMotion ? { opacity: 0 } : { y: "110%" }}
                  animate={reduceMotion ? { opacity: 1 } : { y: "0%" }}
                  transition={{
                    duration: 0.85,
                    ease: EASE,
                    delay: 0.6 + i * 0.1,
                  }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h2>

          {/* Divider line */}
          <motion.span
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 1.0 }}
            className="block h-px w-16 origin-center bg-bg-primary-500/50"
            aria-hidden
          />

          {/* Caption */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 1.2 }}
            className={`text-[10px] uppercase tracking-[0.5em] text-bg-text-secondary/60 ${
              isAr ? "font-arabic tracking-normal" : "font-mono"
            }`}
          >
            {caption}
          </motion.p>
        </div>
      </div>

      <span className="sr-only">
        {isAr
          ? "البمبي جروب — المتجر الرسمي"
          : "El Bamby Group — official store"}
      </span>
    </figure>
  );
}
