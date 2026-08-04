import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { scaleIn } from '@/lib/animations.js';

export default function NotFound() {
  const { t } = useLocale();
  return (
    <motion.div className="max-w-lg mx-auto px-5 py-24 text-center" {...scaleIn}>
      <div className="w-16 h-16 rounded-full bg-bg-primary-50 flex items-center justify-center mx-auto mb-5">
        <span className="text-xl font-bold text-bg-primary-500">404</span>
      </div>
      <h1 className="text-heading-lg text-bg-text-primary mb-2">
        {t('notFound.title', { ns: 'common' })}
      </h1>
      <p className="text-sm text-bg-text-secondary mb-8">
        {t('notFound.subtitle', { ns: 'common' })}
      </p>
      <Link to="/" className="btn-primary text-sm">
        {t('notFound.backHome', { ns: 'common' })}
      </Link>
    </motion.div>
  );
}
