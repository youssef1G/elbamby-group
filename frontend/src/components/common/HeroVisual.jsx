import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import { Usb, MemoryStick, HardDrive } from 'lucide-react';

/**
 * useCountUp — drives the "256GB" counter in the central card.
 * Runs once, when the hero scrolls into view (it's above the fold, so
 * effectively on mount) — not a decorative loop, a one-time reveal that
 * mirrors what a spec sheet does: the number IS the content.
 */
function useCountUp(target, duration = 1100, startWhen = true) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startWhen || startedRef.current) return;
    startedRef.current = true;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo — fast start, settles precisely, feels like a readout snapping into place
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, startWhen]);

  return value;
}

/**
 * A single floating device card — USB / SD / memory-stick glyph on a small
 * elevated card, each bobbing on its own independent sine-ish loop so the
 * cluster never moves in unison (that's what reads as "alive" rather than
 * "looping animation").
 */
function FloatingCard({ Icon, label, rotate, delay, duration, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -10, 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: { duration, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.5 },
      }}
      style={{ rotate }}
      className={`absolute flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 shadow-lg backdrop-blur-md ${className}`}
    >
      <Icon size={20} strokeWidth={1.5} className="text-bg-primary-400" />
      <span className="font-mono text-[10px] tracking-wide text-bg-ink-text/70">{label}</span>
    </motion.div>
  );
}

export default function HeroVisual() {
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { once: true, margin: '-40px' });

  const capacity = useCountUp(256, 1200, inView);
  const [speedPct, setSpeedPct] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setSpeedPct(92), 250);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-sm">
      {/* Ambient glow — restrained, single source, not a generic radial blob centerpiece */}
      <div className="absolute inset-0 -z-10 rounded-full bg-bg-primary-500/30 blur-[80px]" />

      {/* Central card — the thesis object */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative aspect-[4/3] rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent p-6 backdrop-blur-sm"
      >
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="h-8 w-11 rounded-md bg-bg-primary-500/90" />
            <span className="font-mono text-caption text-bg-ink-text/50">BG · microSD</span>
          </div>

          <div>
            <p className="font-mono text-h1 font-bold text-bg-ink-text tabular-nums">
              {capacity}
              <span className="text-bg-primary-400">GB</span>
            </p>

            {/* Transfer-speed bar — fills once, a real spec being demonstrated, not decoration */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-bg-ink-text/50">
                <span>WRITE</span>
                <span className="tabular-nums">{speedPct}MB/s</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-bg-primary-400"
                  initial={{ width: '0%' }}
                  animate={{ width: `${speedPct}%` }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Orbiting device cluster — independent float rates, not a synchronized loop */}
      <FloatingCard
        Icon={Usb}
        label="32GB"
        rotate={-8}
        delay={0.35}
        duration={4.2}
        className="-top-6 end-[-12%] sm:end-[-18%]"
      />
      <FloatingCard
        Icon={MemoryStick}
        label="128GB"
        rotate={6}
        delay={0.5}
        duration={3.6}
        className="-bottom-8 start-[-8%] sm:start-[-14%]"
      />
      <FloatingCard
        Icon={HardDrive}
        label="1TB"
        rotate={-4}
        delay={0.65}
        duration={5}
        className="top-1/2 end-[-16%] hidden -translate-y-1/2 sm:flex"
      />
    </div>
  );
}
