import { motion } from "motion/react";

/**
 * HeroVisual — animated geometric art (v8).
 *
 * No products, no photography, no type: a quiet machine of pure geometry.
 * Light blobs drift, a hairline orbit ring turns with its dots travelling,
 * a dashed ring spins the other way, and a core dot pulses like a signal.
 * One continuous, deliberate motion system in brand colors.
 */
export default function HeroVisual() {
  return (
    <figure
      className="relative h-full min-h-[340px] w-full select-none overflow-hidden sm:min-h-[440px] lg:min-h-[520px]"
      aria-hidden="true"
    >
      {/* Drifting light blobs */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 rounded-full bg-bg-primary-500/[0.14] blur-3xl"
        animate={{ y: [0, 22, 0], x: [0, -16, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-12 start-6 h-52 w-52 rounded-full bg-bg-primary-400/[0.12] blur-3xl"
        animate={{ y: [0, -18, 0] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.2,
        }}
      />
      <motion.div
        className="pointer-events-none absolute -end-10 top-8 h-40 w-40 rounded-full bg-bg-primary-500/[0.1] blur-3xl"
        animate={{ y: [0, 14, 0] }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* The assembly — settles in once, then floats gently */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.25 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="relative flex h-full w-full items-center justify-center"
        >
          {/* Faint outer circle */}
          <div className="absolute h-[26rem] w-[26rem] rounded-full border border-bg-border/60" />

          {/* Pulsing core */}
          <motion.span
            className="absolute h-10 w-10 rounded-full bg-bg-primary-500/30"
            animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute h-10 w-10 rounded-full bg-bg-primary-500"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Orbit ring — slow turn, dots travelling with it */}
          <motion.div
            className="absolute h-72 w-72 rounded-full border border-bg-border"
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-bg-primary-500" />
            <span className="absolute top-1/2 -end-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-bg-primary-400" />
            <span className="absolute top-1/2 -start-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-bg-text-secondary/70" />
          </motion.div>

          {/* Dashed ring — counter-rotation */}
          <motion.div
            className="absolute h-44 w-44 rounded-full border border-dashed border-bg-primary-400/60"
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-bg-primary-500" />
          </motion.div>

          {/* Floating square accents */}
          <motion.div
            className="absolute top-12 end-14 h-7 w-7 border-2 border-bg-primary-500/70"
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute bottom-16 start-12 h-4 w-4 border border-bg-primary-400/60"
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute bottom-24 end-24 h-2.5 w-2.5 rounded-full bg-bg-primary-500/80"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </figure>
  );
}
