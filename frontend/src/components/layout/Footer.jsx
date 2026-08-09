import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Facebook, Instagram, MapPin, MessageCircle, Music2, Send } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCustomerAuth } from '@/context/CustomerAuthContext.jsx';
import { fadeIn } from '@/lib/animations.js';

const STORE_LOCATION = 'https://maps.app.goo.gl/mRyFtdVdDC7E6w3h8';

const SOCIALS = [
  { label: 'WhatsApp', href: 'https://wa.me/201020999911', Icon: MessageCircle },
  { label: 'Telegram', href: 'https://t.me/elbambygroupBG', Icon: Send },
  { label: 'Instagram', href: 'https://www.instagram.com/hassanelbamby', Icon: Instagram },
  { label: 'Facebook', href: 'https://www.facebook.com/elbambygroupBG', Icon: Facebook },
  { label: 'TikTok', href: 'https://www.tiktok.com/@hassanelbamby', Icon: Music2 },
];

const linkCls =
  'inline-flex items-center gap-2 text-[13px] text-bg-text-secondary hover:text-bg-primary-500 transition-colors';

export default function Footer() {
  const { t } = useLocale();
  const { customer, isLoading: customerAuthLoading } = useCustomerAuth();

  return (
    <motion.footer className="border-t border-bg-border bg-bg-surface mt-16" {...fadeIn}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-12 sm:pt-14 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <img
                src="/logo.jpg"
                alt={t('brand.fullName', { ns: 'common' })}
                className="h-8 w-8 rounded-lg object-cover"
                loading="lazy"
              />
              <div className="flex flex-col leading-tight">
                <span className="font-heading font-semibold text-base tracking-tight text-bg-text-primary">
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
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-bg-text-primary mb-4">
              {t('footer.shop', { ns: 'common' })}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/shop" className={linkCls}>
                  {t('nav.shop', { ns: 'common' })}
                </Link>
              </li>
              <li>
                <Link to="/about" className={linkCls}>
                  {t('nav.about', { ns: 'common' })}
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkCls}>
                  {t('nav.contact', { ns: 'common' })}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-bg-text-primary mb-4">
              {t('footer.help', { ns: 'common' })}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/my-orders" className={linkCls}>
                  {t('footer.trackOrder', { ns: 'common' })}
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkCls}>
                  {t('footer.returns', { ns: 'common' })}
                </Link>
              </li>
              {customerAuthLoading || customer ? (
                <li>
                  <Link to="/account" className={linkCls}>
                    {t('nav.account', { ns: 'common' })}
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link to="/login" className={linkCls}>
                      {t('nav.login', { ns: 'common' })}
                    </Link>
                  </li>
                  <li>
                    <Link to="/register" className={linkCls}>
                      {t('footer.register', { ns: 'common' })}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-bg-text-primary mb-4">
              {t('footer.connect', { ns: 'common' })}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={STORE_LOCATION}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  <MapPin size={14} aria-hidden="true" focusable="false" className="shrink-0" />
                  {t('footer.location', { ns: 'common' })}
                </a>
              </li>
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkCls}
                  >
                    <Icon size={14} aria-hidden="true" focusable="false" className="shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-bg-border py-4 text-center text-[12px] text-bg-text-secondary space-y-1">
        <p>{t('footer.copyright', { ns: 'common', year: new Date().getFullYear() })}</p>
        <p>
          {t('footer.developedBy', { ns: 'common' })}{' '}
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
