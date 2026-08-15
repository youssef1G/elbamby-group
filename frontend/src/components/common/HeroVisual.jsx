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

export default function HeroVisual() {
  const { isAr } = useLocale();
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);

  const titleWords = isAr ? ["البمبي", "جروب"] : ["EL", "BAMBY", "GROUP"];
  const eyebrow = isAr ? "بيت الميموري · مصر" : "MEMORY · EST. EGYPT";
  const caption = isAr ? "BG-001 · المتجر الرسمي" : "BG-001 · OFFICIAL STORE";

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springCfg = { stiffness: 80, damping: 22, mass: 0.5 };
  const rotX = useSpring(useTransform(mouseY, [-220, 220], [5, -5]), springCfg);
  const rotY = useSpring(useTransform(mouseX, [-220, 220], [-5, 5]), springCfg);
  const glowX = useSpring(
    useTransform(mouseX, [-220, 220], [22, 78]),
    springCfg,
  );
  const glowY = useSpring(
    useTransform(mouseY, [-220, 220], [22, 78]),
    springCfg,
  );
  const badgeTransform = useMotionTemplate`perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

  const handleMouseMove = (e) => {
    if (!ref.current || reduceMotion) return;
    const r = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - (r.left + r.width / 2));
    mouseY.set(e.clientY - (r.top + r.height / 2));
  };
  const resetMouse = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const eyebrowFont = isAr ? "font-arabic tracking-normal" : "font-mono";
  const captionFont = isAr ? "font-arabic tracking-normal" : "font-mono";

  return (
    <figure
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetMouse}
      className="relative isolate flex w-full select-none flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: "min(72vh, 560px)" }}
    >
      <div className="pointer-events-none absolute inset-0 -z-20 flex items-center justify-center">
        <motion.div
          className="h-[30rem] w-[30rem] rounded-full blur-3xl"
          style={{ background: "var(--bg-primary-500)" }}
          initial={reduceMotion ? { opacity: 0.1 } : { opacity: 0, scale: 0.8 }}
          animate={
            reduceMotion
              ? { opacity: 0.1, scale: 1 }
              : { opacity: [0.1, 0.18, 0.1], scale: [1, 1.04, 1] }
          }
          transition={{
            opacity: reduceMotion
              ? { duration: 1.4, ease: EASE, delay: 0.2 }
              : {
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4,
                },
            scale: reduceMotion
              ? { duration: 1.4, ease: EASE, delay: 0.2 }
              : {
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.4,
                },
          }}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.022]"
        style={{
          backgroundImage:
            "linear-gradient(var(--bg-border) 1px, transparent 1px), linear-gradient(90deg, var(--bg-border) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage:
            "radial-gradient(ellipse at center, #000 55%, transparent 88%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, #000 55%, transparent 88%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col items-center gap-8 sm:gap-10">
        <motion.div
          className="relative"
          style={{
            width: "min(54vw, 280px)",
            height: "min(54vw, 280px)",
          }}
          initial={
            reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.94 }
          }
          animate={
            reduceMotion
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 1, y: [0, -8, 0], scale: 1 }
          }
          transition={{
            opacity: { duration: 0.9, ease: EASE, delay: 0.15 },
            y: reduceMotion
              ? { duration: 0.9, ease: EASE, delay: 0.15 }
              : {
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1.2,
                },
            scale: { duration: 0.9, ease: EASE, delay: 0.15 },
          }}
        >
          <span
            aria-hidden
            className="absolute -bottom-3 left-1/2 h-9 w-3/5 -translate-x-1/2 rounded-full bg-bg-primary-500/20 blur-2xl"
          />

          <div
            className="absolute -inset-4 rounded-full border border-bg-border/50"
            aria-hidden
          />

          <motion.div
            className="absolute -inset-1.5 rounded-full"
            style={{ border: "1px dashed var(--bg-border)" }}
            aria-hidden
            animate={reduceMotion ? undefined : { rotate: 360 }}
            transition={{
              duration: 60,
              repeat: Infinity,
              ease: "linear",
            }}
          />

          <motion.div
            className="absolute -inset-4 rounded-full"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, var(--bg-primary-500) 18deg, transparent 36deg, transparent 360deg)`,
              mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))",
              opacity: 0.7,
            }}
            aria-hidden
            animate={reduceMotion ? undefined : { rotate: -360 }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: "linear",
              delay: 0.6,
            }}
          />

          <motion.div
            className="relative h-full w-full"
            style={{ transform: badgeTransform, transformStyle: "preserve-3d" }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-full border border-bg-border bg-bg-surface-raised shadow-card">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-1/2 rounded-t-full bg-gradient-to-b from-white/22 to-transparent dark:from-white/8"
              />

              <motion.span
                aria-hidden
                className="pointer-events-none absolute z-10 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-2xl mix-blend-overlay dark:bg-white/20"
                style={{
                  left: useTransform(glowX, (v) => `${v}%`),
                  top: useTransform(glowY, (v) => `${v}%`),
                }}
              />

              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 rounded-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 55%, rgba(255,255,255,0) 100%)",
                }}
              />

              <img
                src="/logo.jpg"
                alt={isAr ? "البمبي جروب" : "El Bamby Group"}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
          </motion.div>
        </motion.div>

        <div className="flex flex-col items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
            className={`flex items-center gap-2.5 text-[10px] uppercase tracking-[0.4em] text-bg-text-secondary ${eyebrowFont}`}
          >
            <motion.span
              className="h-1 w-1 rounded-full bg-bg-primary-500"
              animate={
                reduceMotion
                  ? undefined
                  : { opacity: [0.35, 1, 0.35], scale: [0.85, 1.2, 0.85] }
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
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
                key={word}
                className="inline-block overflow-hidden pb-[0.22em] -mb-[0.22em]"
              >
                <motion.span
                  className={`inline-block font-heading font-bold text-bg-text-primary ${
                    isAr
                      ? "font-arabic text-4xl leading-[1.3] sm:text-5xl lg:text-6xl"
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

          <motion.span
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: EASE, delay: 1.0 }}
            className="block h-[2px] w-20 origin-center rounded-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--bg-primary-300), var(--bg-primary-500), var(--bg-primary-700), var(--bg-primary-500), var(--bg-primary-300), transparent)",
            }}
            aria-hidden
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 1.2 }}
            className={`text-[10px] uppercase tracking-[0.5em] text-bg-text-secondary/60 ${captionFont}`}
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
