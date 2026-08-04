import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fadeUp } from '@/lib/animations.js';

export default function About() {
  const { t } = useLocale();
  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
      <motion.div className="text-center mb-12" {...fadeUp}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-primary-50 border border-bg-primary-500/10 mb-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bg-primary-500">
            {t('about.title', { ns: 'common' })}
          </span>
        </div>
        <h1 className="text-display text-bg-text-primary">{t('about.title', { ns: 'common' })}</h1>
      </motion.div>

      <motion.div
        className="space-y-5 text-sm text-bg-text-secondary leading-relaxed"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      >
        <p>{t('about.storyP1', { ns: 'common' })}</p>
        <p>{t('about.storyP2', { ns: 'common' })}</p>
      </motion.div>

      <motion.div
        className="grid sm:grid-cols-3 gap-4 mt-12"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
      >
        <div className="surface-card p-6 text-center">
          <h3 className="font-heading text-sm font-semibold text-bg-text-primary mb-2">
            {t('about.value1Title', { ns: 'common' })}
          </h3>
          <p className="text-xs text-bg-text-secondary">
            {t('about.value1Desc', { ns: 'common' })}
          </p>
        </div>
        <div className="surface-card p-6 text-center">
          <h3 className="font-heading text-sm font-semibold text-bg-text-primary mb-2">
            {t('about.value2Title', { ns: 'common' })}
          </h3>
          <p className="text-xs text-bg-text-secondary">
            {t('about.value2Desc', { ns: 'common' })}
          </p>
        </div>
        <div className="surface-card p-6 text-center">
          <h3 className="font-heading text-sm font-semibold text-bg-text-primary mb-2">
            {t('about.value3Title', { ns: 'common' })}
          </h3>
          <p className="text-xs text-bg-text-secondary">
            {t('about.value3Desc', { ns: 'common' })}
          </p>
        </div>
      </motion.div>

      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1], delay: 0.25 }}
      >
        <Link to="/shop" className="btn-primary px-8 py-3 text-sm">
          {t('home.heroCta', { ns: 'common' })}
        </Link>
      </motion.div>
    </div>
  );
}