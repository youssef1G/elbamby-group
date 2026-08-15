import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  useTransform,
  useMotionTemplate,
} from "motion/react";
import { useRef } from "react";
import { useLocale } from "@/context/LocaleContext.jsx";

const EASE = [0.22, 1, 0.36, 1];

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PARTICLES = Array.from({ length: 14 }, (_, i) => {
  const rand = mulberry32(7919 + i * 31);
  return {
    size: 1.5 + rand() * 3,
    radius: 95 + rand() * 80,
    speed: 28 + rand() * 38,
    startAngle: rand() * 360,
    opacity: 0.25 + rand() * 0.5,
    twinkleSpeed: 2.2 + rand() * 3.4,
    twinkleOffset: rand() * 4,
    tone: rand() > 0.55 ? "pink" : "cyan",
  };
});

const DUST = Array.from({ length: 9 }, (_, i) => {
  const rand = mulberry32(2024 + i * 17);
  return {
    left: 5 + rand() * 90,
    top: 10 + rand() * 80,
    size: 1.5 + rand() * 2.5,
    dur: 12 + rand() * 12,
    delay: rand() * 6,
    drift: -10 - rand() * 24,
  };
});

const TICKS = 60;
const TICK_BG = `conic-gradient(var(--bg-border) 0deg 1deg, transparent 1deg ${360 / TICKS}deg)`;

export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springCfg = { stiffness: 70, damping: 18, mass: 0.55 };

  const rotX = useSpring(useTransform(mouseY, [-260, 260], [6, -6]), springCfg);
  const rotY = useSpring(useTransform(mouseX, [-260, 260], [-6, 6]), springCfg);

  const lightX = useSpring(
    useTransform(mouseX, [-260, 260], [15, 85]),
    springCfg,
  );
  const lightY = useSpring(
    useTransform(mouseY, [-260, 260], [15, 85]),
    springCfg,
  );

  const aberrX = useSpring(
    useTransform(mouseX, [-260, 260], [-1.6, 1.6]),
    springCfg,
  );
  const aberrY = useSpring(
    useTransform(mouseY, [-260, 260], [-1.6, 1.6]),
    springCfg,
  );

  const badgeTransform = useMotionTemplate`perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

  const handleMouseMove = (e) => {
    if (!ref.current || reduceMotion) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const titleWords = isAr ? ["البمبي", "جروب"] : ["EL", "BAMBY", "GROUP"];
  const eyebrow = isAr ? "بيت الميموري · مصر" : "MEMORY · EST. EGYPT";
  const caption = isAr ? "BG-001 · المتجر الرسمي" : "BG-001 · OFFICIAL STORE";
  const watermark = isAr ? "البمبي" : "BAMBY";
  const idSuffix = isAr ? "ar" : "en";

  return (
    <figure
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative isolate flex w-full select-none flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6 sm:py-14"
      style={{ minHeight: "min(82vh, 660px)" }}
    >
      <div className="pointer-events-none absolute inset-0 -z-20">
        <motion.div
          className="absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
          style={{
            background:
              "conic-gradient(from 90deg at 50% 50%, #E6007E 0deg, #B14BFF 70deg, #5B8CFF 140deg, #00D4FF 200deg, #00FFA3 260deg, #FFD055 320deg, #E6007E 360deg)",
          }}
          animate={
            reduceMotion ? undefined : { rotate: 360, scale: [1, 1.08, 1] }
          }
          transition={
            reduceMotion
              ? undefined
              : {
                  rotate: { duration: 36, repeat: Infinity, ease: "linear" },
                  scale: { duration: 9, repeat: Infinity, ease: "easeInOut" },
                }
          }
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 25%, var(--bg-surface) 82%)",
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
        <motion.span
          aria-hidden
          className={`whitespace-nowrap font-heading text-[20vw] font-bold leading-none ${isAr ? "font-arabic" : ""}`}
          style={{
            color: "var(--bg-primary-500)",
            filter: "blur(8px)",
            opacity: 0.045,
          }}
          animate={
            reduceMotion
              ? undefined
              : { opacity: [0.035, 0.06, 0.035], scale: [1, 1.015, 1] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 12, repeat: Infinity, ease: "easeInOut" }
          }
        >
          {watermark}
        </motion.span>
      </div>

      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {DUST.map((d, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full bg-bg-primary-500/40"
            style={{
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: d.size,
              height: d.size,
              filter: "blur(0.4px)",
            }}
            animate={
              reduceMotion
                ? undefined
                : { y: [0, d.drift, 0], opacity: [0.2, 0.65, 0.2] }
            }
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: d.dur,
                    delay: d.delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-3 -z-10 sm:inset-5">
        <span className="absolute start-0 top-0 h-5 w-5 border-s border-t border-bg-border" />
        <span className="absolute end-0 top-0 h-5 w-5 border-e border-t border-bg-border" />
        <span className="absolute bottom-0 start-0 h-5 w-5 border-s border-b border-bg-border" />
        <span className="absolute bottom-0 end-0 h-5 w-5 border-e border-b border-bg-border" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 sm:gap-10">
        <div
          className="relative flex items-center justify-center"
          style={{
            width: "min(82vw, 340px)",
            height: "min(82vw, 340px)",
          }}
        >
          <motion.div
            className="absolute inset-0 rounded-full opacity-80"
            style={{
              background: TICK_BG,
              mask: "radial-gradient(farthest-side, #000 99%, transparent 100%)",
              WebkitMask:
                "radial-gradient(farthest-side, #000 99%, transparent 100%)",
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 80, repeat: Infinity, ease: "linear" }
            }
          />

          <div
            className="absolute inset-[5%] rounded-full"
            style={{ border: "1px dashed var(--bg-border)" }}
          />

          <motion.div
            className="absolute inset-[5%] rounded-full"
            style={{ border: "1.5px dashed var(--bg-border)" }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 50, repeat: Infinity, ease: "linear" }
            }
          />

          {PARTICLES.map((p, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: p.speed,
                      repeat: Infinity,
                      ease: "linear",
                      delay: -(p.startAngle / 36),
                    }
              }
            >
              <motion.span
                className={`absolute left-1/2 top-1/2 rounded-full ${
                  p.tone === "pink" ? "bg-bg-primary-500" : "bg-bg-info"
                }`}
                style={{
                  width: p.size,
                  height: p.size,
                  transform: `translate(-50%, -50%) translateY(-${p.radius}px)`,
                  boxShadow:
                    p.tone === "pink"
                      ? "0 0 12px var(--bg-primary-500)"
                      : "0 0 10px rgba(37,99,235,0.7)",
                  opacity: p.opacity,
                }}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
                      }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: p.twinkleSpeed,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: p.twinkleOffset,
                      }
                }
              />
            </motion.div>
          ))}

          <motion.div
            className="absolute inset-[18%] rounded-full blur-[2px]"
            style={{
              background:
                "conic-gradient(from 0deg, #E6007E, #B14BFF, #5B8CFF, #00D4FF, #00FFA3, #FFD055, #E6007E)",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 10px), #000 calc(100% - 9px))",
            }}
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 9, repeat: Infinity, ease: "linear" }
            }
          />

          <motion.div
            className="absolute inset-[18%] rounded-full"
            style={{
              background:
                "conic-gradient(from 90deg, var(--bg-primary-500), transparent 35%, transparent 65%, var(--bg-primary-500))",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 1px), #000 calc(100% - 0.5px))",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 1px), #000 calc(100% - 0.5px))",
            }}
            animate={reduceMotion ? undefined : { rotate: -360 }}
            transition={
              reduceMotion
                ? undefined
                : { duration: 22, repeat: Infinity, ease: "linear" }
            }
          />

          <motion.div
            className="relative"
            style={{
              width: "54%",
              height: "54%",
              transform: badgeTransform,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              className="absolute -bottom-4 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-full bg-bg-primary-500/35 blur-2xl"
              aria-hidden
            />

            <div className="relative h-full w-full overflow-hidden rounded-full border border-bg-border bg-bg-surface-raised shadow-card">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/2 rounded-t-full bg-gradient-to-b from-white/35 to-transparent dark:from-white/10"
              />

              <motion.span
                aria-hidden
                className="pointer-events-none absolute z-10 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45 blur-2xl mix-blend-overlay dark:bg-white/25"
                style={{
                  left: useTransform(lightX, (v) => `${v}%`),
                  top: useTransform(lightY, (v) => `${v}%`),
                }}
              />

              <motion.img
                src="/logo.jpg"
                alt={isAr ? "البمبي جروب" : "El Bamby Group"}
                className="absolute inset-0 h-full w-full rounded-full object-cover"
                style={{
                  x: aberrX,
                  y: aberrY,
                }}
                loading="eager"
              />
              <motion.img
                aria-hidden
                src="/logo.jpg"
                className="pointer-events-none absolute inset-0 h-full w-full rounded-full object-cover"
                style={{
                  x: useTransform(aberrX, (v) => v + 1.4),
                  y: aberrY,
                  mixBlendMode: "screen",
                  filter: "saturate(2) hue-rotate(-30deg)",
                  opacity: 0.6,
                }}
              />
              <motion.img
                aria-hidden
                src="/logo.jpg"
                className="pointer-events-none absolute inset-0 h-full w-full rounded-full object-cover"
                style={{
                  x: useTransform(aberrX, (v) => v - 1.4),
                  y: aberrY,
                  mixBlendMode: "screen",
                  filter: "saturate(2) hue-rotate(150deg)",
                  opacity: 0.6,
                }}
              />

              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 55%, rgba(255,255,255,0) 100%)",
                }}
              />
            </div>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
            className={`flex items-center gap-2.5 text-[10px] uppercase tracking-[0.4em] text-bg-text-secondary ${
              isAr ? "font-arabic tracking-normal" : "font-mono"
            }`}
          >
            <motion.span
              className="h-1 w-1 rounded-full bg-bg-primary-500"
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [0.35, 1, 0.35], scale: [0.85, 1.2, 0.85] }
              }
              transition={
                reduceMotion
                  ? undefined
                  : { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }
            />
            <span>{eyebrow}</span>
          </motion.div>

          <h2
            className={`flex flex-wrap items-baseline justify-center ${
              isAr ? "gap-x-4" : "gap-x-3 sm:gap-x-4"
            }`}
          >
            {titleWords.map((word, i) => (
              <span
                key={`${idSuffix}-${word}-${i}`}
                className="inline-block overflow-hidden"
              >
                <motion.span
                  className={`inline-block font-heading font-bold text-bg-text-primary ${
                    isAr
                      ? "font-arabic text-5xl leading-[1.2] sm:text-6xl lg:text-7xl"
                      : "text-4xl leading-[1.02] tracking-[-0.025em] sm:text-6xl lg:text-7xl"
                  }`}
                  initial={reduceMotion ? { opacity: 0 } : { y: "110%" }}
                  animate={reduceMotion ? { opacity: 1 } : { y: "0%" }}
                  transition={{
                    duration: 0.95,
                    ease: EASE,
                    delay: 0.55 + i * 0.13,
                  }}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h2>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 1, ease: EASE, delay: 1.05 }}
            className="h-[2px] w-24 origin-center rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--bg-primary-300), var(--bg-primary-500), var(--bg-primary-700), var(--bg-primary-500), var(--bg-primary-300), transparent)",
            }}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 1.35 }}
            className={`text-[10px] uppercase tracking-[0.5em] text-bg-text-secondary/70 ${
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
