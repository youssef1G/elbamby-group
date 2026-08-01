import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { fadeIn } from '@/lib/animations.js';

export default function Footer() {
  const { t } = useLocale();

  return (
    <motion.footer
      className="border-t border-bg-border bg-bg-surface mt-16"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-10 sm:pt-12 pb-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
<img
          src="/logo.jpg"
          alt={t('brand.fullName', { ns: 'common' })}
          className="h-8 w-8 rounded-lg object-cover"
          loading="lazy"
        />
              <div className="flex flex-col leading-tight">
                <span className="font-heading font-semibold text-[15px] tracking-tight text-bg-text-primary">
                  {t('brand.name', { ns: 'common' })}
                </span>
                <span className="font-heading font-medium text-[9px] uppercase tracking-[0.15em] text-bg-text-secondary">
                  {t('brand.subName', { ns: 'common' })}
                </span>
              </div>
            </div>
            <p className="text-[13px] text-bg-text-secondary leading-relaxed max-w-xs">
              {t('footer.tagline', { ns: 'common' })}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-bg-text-primary mb-3">
              {t('footer.quickLinks', { ns: 'common' })}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/shop"
                  className="text-[13px] text-bg-text-secondary hover:text-bg-primary-500 transition-colors"
                >
                  {t('nav.shop', { ns: 'common' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-[13px] text-bg-text-secondary hover:text-bg-primary-500 transition-colors"
                >
                  {t('nav.about', { ns: 'common' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-[13px] text-bg-text-secondary hover:text-bg-primary-500 transition-colors"
                >
                  {t('nav.contact', { ns: 'common' })}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-bg-text-primary mb-3">
              {t('footer.customerService', { ns: 'common' })}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/track-order"
                  className="text-[13px] text-bg-text-secondary hover:text-bg-primary-500 transition-colors"
                >
                  {t('nav.trackOrder', { ns: 'common' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/my-orders"
                  className="text-[13px] text-bg-text-secondary hover:text-bg-primary-500 transition-colors"
                >
                  {t('nav.myOrders', { ns: 'common' })}
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-[13px] text-bg-text-secondary hover:text-bg-primary-500 transition-colors"
                >
                  {t('footer.contactUs', { ns: 'common' })}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-bg-text-primary mb-3">
              {t('footer.payment', { ns: 'common' })}
            </h4>
            <ul className="space-y-2 text-[13px] text-bg-text-secondary">
              <li>{t('footer.cod', { ns: 'common' })}</li>
              <li>{t('footer.deliveryDays', { ns: 'common' })}</li>
              <li>{t('footer.whatsapp', { ns: 'common' })}</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-bg-border py-4 text-center text-[12px] text-bg-text-secondary space-y-1">
        <p>
          © {new Date().getFullYear()} {t('brand.fullName', { ns: 'common' })} —{' '}
          {t('footer.rights', { ns: 'common' })}
        </p>
        <p>
          Developed by{' '}
          <a
            href="https://www.linkedin.com/in/yousssefgamal"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-bg-text-primary hover:text-bg-primary-500 transition-colors"
          >
            Youssef Gamal
          </a>
        </p>
      </div>
    </motion.footer>
  );
}
