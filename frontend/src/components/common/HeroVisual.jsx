import { motion } from 'motion/react';

const FRAME = 'M12,12 H508 M12,12 V388 H508 V12';

const CORNER_TICKS = ['M12,34 V12 H34', 'M474,12 H508 V34', 'M508,366 V388 H474', 'M34,388 H12 V366'];

var tickIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

var specCaption = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  },
};

/**
 * HeroVisual — the page's signature element (v3, "spec plate").
 *
 * One idea, done quietly: a product rendered as a printed catalogue plate.
 * A hairline frame with printer's crop marks encloses the device; "FIG 01"
 * and a mono spec line caption it like a figure in a technical manual.
 *
 * Motion is a single settle: the frame draws itself once (stroke reveal),
 * the corner ticks tick in, the device and caption fall into place — then
 * everything is still. No loop, no float, no parallax, no glow. This is the
 * "spec sheet, not a template" promise at its most literal.
 *
 * The drawing is symmetric and layout-neutral, so it reads correctly in RTL
 * with no mirroring tricks, and Arabic never touches mono glyphs.
 */

export default function HeroVisual() {
  return (
    <figure className="mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative">
        <motion.svg
          viewBox="0 0 520 400"
          className="block h-auto w-full overflow-visible"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } } }}
          aria-hidden="true"
        >
          {/* The frame — draws on once, clockwise, a single 700ms sweep */}
          <path
            d={FRAME}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="square"
            className="text-bg-text-primary"
            pathLength="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
          />

          {/* Catalogue marks — the printer's crop ticks */}
          {CORNER_TICKS.map((d, i) => (
            <motion.path
              key={d}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="square"
              className="text-bg-text-secondary"
              variants={tickIn}
            />
          ))}

          {/* Top-of-plate meta: edition number + a registration disc */}
          <motion.text
            x="40"
            y="40"
            textAnchor="start"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            letterSpacing="2"
            fill="currentColor"
            className="text-bg-text-secondary"
            variants={tickIn}
          >
            FIG.01
          </motion.text>
          <motion.g variants={tickIn}>
            <circle cx="480" cy="40" r="7" fill="none" stroke="currentColor" strokeWidth="1" className="text-bg-text-secondary" />
            <circle cx="480" cy="40" r="3" fill="currentColor" className="text-bg-primary-500" />
          </motion.g>

          {/* The device — line-art, ink strokes, one flat screen */}
          <motion.g variants={specCaption}>
            {/* body */}
            <path
              d="M166,70 h188 a26,26 0 0 1 26,26 v222 a26,26 0 0 1 -26,26 h-188 a26,26 0 0 1 -26,-26 v-222 a26,26 0 0 1 26,-26 z"
              fill="var(--bg-surface)"
              stroke="currentColor"
              strokeWidth="1.25"
              className="text-bg-text-primary"
            />
            {/* screen */}
            <rect x="182" y="88" width="156" height="212" rx="15" fill="none" stroke="currentColor" strokeWidth="0.75" className="text-bg-text-primary" />
            {/* home button */}
            <rect x="236" y="302" width="48" height="6" rx="3" fill="currentColor" className="text-bg-text-primary opacity-50" />
            {/* camera + flash */}
            <circle cx="242" cy="38" r="5" fill="currentColor" className="text-bg-text-secondary" />
            <circle cx="262" cy="38" r="2" fill="currentColor" className="text-bg-primary-500" />
            {/* speaker slot */}
            <rect x="230" y="78" width="26" height="3" rx="1.5" fill="currentColor" className="text-bg-text-primary opacity-40" />
            {/* capacity readout — the one piece of content */}
            <text
              x="260"
              y="146"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="17"
              letterSpacing="1"
              fill="currentColor"
              className="text-bg-text-primary"
            >
              256GB
            </text>
            <line x1="220" y1="160" x2="300" y2="160" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className="text-bg-text-primary opacity-30" />
            <line x1="226" y1="168" x2="294" y2="168" stroke="currentColor" strokeWidth="1" strokeLinecap="square" className="text-bg-text-primary opacity-30" />
            <circle cx="260" cy="188" r="10" fill="none" stroke="currentColor" strokeWidth="1" className="text-bg-primary-500" />
            <circle cx="260" cy="188" r="3" fill="currentColor" className="text-bg-primary-500" />
          </motion.g>

          {/* Caption — set inside the plate, like a catalogue legend */}
          <motion.text
            x="40"
            y="360"
            textAnchor="start"
            fontFamily="'JetBrains Mono', monospace"
            fontSize="10"
            letterSpacing="1.5"
            fill="currentColor"
            className="text-bg-text-secondary"
            variants={specCaption}
          >
            BG — 01 / ACCESSORIES
          </motion.text>
          <motion.line
            x1="40"
            y1="370"
            x2="96"
            y2="370"
            stroke="currentColor"
            strokeWidth="1"
            className="text-bg-primary-500"
            variants={specCaption}
          />
        </motion.svg>
      </div>
    </figure>
  );
}