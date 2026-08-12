import { motion } from "motion/react";

/**
 * HeroVisual — logo + store title (v9).
 *
 * A quiet, centered brand focal point: a rounded logo badge with a slow
 * breathing halo and a single orbiting accent, sitting above the store
 * name (Arabic primary + Latin caption). Motion stays gentle and
 * continuous; on phones the composition scales down but keeps its life.
 *
 * Visible text is intentional (not aria-hidden): the bilingual brand name
 * strengthens on-page brand relevance for both Arabic and Latin searches.
 */
export default function HeroVisual() {
  return (
    <figure className="relative h-full min-h-[340px] w-full select-none overflow-hidden sm:min-h-[440px] lg:min-h-[520px]">
      {/* Soft drifting light blobs — atmosphere, not centerpiece */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/4 h-56 w-56 -translate-x-1/2 rounded-full bg-bg-primary-500/[0.14] blur-3xl sm:h-72 sm:w-72"
        animate={{ y: [0, 18, 0], x: [0, -14, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -end-8 bottom-10 h-44 w-44 rounded-full bg-bg-primary-400/[0.12] blur-3xl sm:h-56 sm:w-56"
        animate={{ y: [0, -14, 0] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.2,
        }}
      />

      {/* Centered assembly — settles in once, then lives */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center sm:gap-8"
      >
        {/* Logo badge with breathing halo + orbiting accent */}
        <div className="relative flex items-center justify-center">
          {/* Breathing halo */}
          <motion.span
            className="absolute h-32 w-32 rounded-full bg-bg-primary-500/20 blur-md sm:h-40 sm:w-40"
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.25, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Slow rotating ring with a single accent dot */}
          <motion.div
            className="absolute h-28 w-28 rounded-full border border-bg-border sm:h-36 sm:w-36"
            animate={{ rotate: 360 }}
            transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-bg-primary-500" />
          </motion.div>
          {/* Counter-rotating dashed inner ring */}
          <motion.div
            className="absolute h-24 w-24 rounded-full border border-dashed border-bg-primary-400/50 sm:h-32 sm:w-32"
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          {/* The logo itself — gentle float */}
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="relative h-20 w-20 overflow-hidden rounded-2xl border border-bg-border shadow-card sm:h-24 sm:w-24"
          >
            <img
              src="/logo.jpg"
              alt="El Bamby Group logo"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </motion.div>
        </div>

        {/* Store title */}
        <div className="flex flex-col items-center gap-1.5">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
            className="font-mono text-[10px] uppercase tracking-[0.25em] text-bg-text-secondary"
          >
            بيت الميموري
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.6 }}
            className="font-heading text-3xl font-bold tracking-tight text-bg-text-primary sm:text-4xl lg:text-5xl"
          >
            البمبي جروب
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.72,
            }}
            className="font-heading text-sm font-medium uppercase tracking-[0.18em] text-bg-primary-500 sm:text-base"
          >
            El Bamby Group
          </motion.p>
          {/* Draw-in underline */}
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
              delay: 0.85,
            }}
            className="mt-1 h-px w-20 origin-center bg-bg-primary-500/80"
          />
        </div>
      </motion.div>
    </figure>
  );
}
