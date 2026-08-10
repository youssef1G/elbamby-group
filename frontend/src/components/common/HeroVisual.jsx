import { motion } from "motion/react";

const ROWS = [
  { label: "64GB", cls: "text-2xl sm:text-3xl" },
  { label: "128GB", cls: "text-4xl sm:text-5xl" },
  { label: "256GB", cls: "text-6xl sm:text-8xl lg:text-[9rem]", accent: true },
  { label: "512GB", cls: "text-4xl sm:text-5xl" },
  { label: "1TB", cls: "text-2xl sm:text-3xl" },
];

const BARS = [
  { h: "h-7", dur: 2.2, delay: 0 },
  { h: "h-12", dur: 2.8, delay: 0.25 },
  { h: "h-9", dur: 2.4, delay: 0.45 },
  { h: "h-14", dur: 3.1, delay: 0.6 },
  { h: "h-8", dur: 2.6, delay: 0.8 },
];

/**
 * HeroVisual — the capacity scale as typography (v7).
 *
 * No photography, no illustration: the brand's own vocabulary — storage
 * capacities set in mono — stacked as a giant type pyramid, the middle line
 * in brand color. An equalizer of solid bars underneath reads as data moving.
 * The stack settles once; the bars keep transferring.
 */
export default function HeroVisual() {
  return (
    <figure
      className="relative flex h-full min-h-[340px] w-full select-none flex-col items-center justify-center overflow-hidden sm:min-h-[440px] lg:min-h-[520px]"
      aria-hidden="true"
    >
      {/* Soft light behind the type */}
      <div
        className="pointer-events-none absolute top-1/3 h-80 w-80 rounded-full bg-bg-primary-500/[0.08] blur-3xl"
        aria-hidden="true"
      />

      {/* Capacity pyramid */}
      <div className="relative flex flex-col items-center font-mono leading-none tracking-tight ltr-nums">
        {ROWS.map((row, i) => (
          <motion.span
            key={row.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.15 + i * 0.09,
            }}
            className={`${row.cls} ${row.accent ? "font-semibold text-bg-primary-600" : "font-medium text-bg-text-secondary/70"}`}
          >
            {row.label}
          </motion.span>
        ))}
      </div>

      {/* Equalizer — data in motion */}
      <div className="relative mt-12 flex items-end gap-2" aria-hidden="true">
        {BARS.map((bar, i) => (
          <motion.span
            key={i}
            animate={{ scaleY: [0.3, 1, 0.45, 0.85, 0.3] }}
            transition={{
              duration: bar.dur,
              repeat: Infinity,
              ease: "easeInOut",
              delay: bar.delay,
            }}
            className={`${bar.h} w-1.5 origin-bottom rounded-full bg-bg-primary-500`}
          />
        ))}
      </div>

      {/* Caption line */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="relative mt-6 font-mono text-caption uppercase tracking-[0.3em] text-bg-text-secondary ltr-nums"
      >
        USB 3.2 · U3 V30 · CLASS 10
      </motion.p>
    </figure>
  );
}
