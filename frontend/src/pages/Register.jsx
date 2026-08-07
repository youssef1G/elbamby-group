import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Lock, Mail, Phone } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCustomerAuth } from '@/context/CustomerAuthContext.jsx';
import { normalizePhone } from '@/lib/formatters.js';
import Button from '@/components/ui/Button.jsx';
import SEO from '@/components/common/SEO.jsx';

const phoneRegex = /^01[0-25]\d{8}$/;

const registerSchema = z.object({
  name: z.string().min(1, 'auth:validation.required'),
  phone: z.string().transform(normalizePhone).pipe(z.string().regex(phoneRegex, 'auth:validation.phone')),
  password: z.string().min(6, 'auth:validation.passwordMin'),
  email: z.string().email('auth:validation.email').optional().or(z.literal('')),
});

export default function Register() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { customer, isLoading: authLoading, register } = useCustomerAuth();
  const [error, setError] = useState('');
  const [isConflict, setIsConflict] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  if (authLoading) return null;
  if (customer) return <Navigate to="/account" replace />;

  const onSubmit = async (data) => {
    setError('');
    setIsConflict(false);
    try {
      await register({
        name: data.name,
        phone: data.phone,
        password: data.password,
        email: data.email || undefined,
      });
      navigate('/account');
    } catch (err) {
      if (err.code === 'CONFLICT') {
        setIsConflict(true);
        setError(t('auth:register.conflict'));
      } else {
        setError(
          err.code === 'RATE_LIMITED'
            ? t('auth:errors.rateLimited')
            : err.code === 'VALIDATION_ERROR'
              ? t('auth:errors.validationFailed')
              : err.message || t('errors.generic'),
        );
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-5 py-12 sm:py-20">
      <SEO titleKey="auth:register.title" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="text-center mb-8">
          <h1 className="font-heading text-h2 font-bold tracking-tight text-bg-text-primary">
            {t('auth:register.title')}
          </h1>
          <p className="text-caption text-bg-text-secondary mt-2">{t('auth:register.subtitle')}</p>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
                {t('auth:register.name')}
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
                />
                <input
                  type="text"
                  {...registerField('name')}
                  autoComplete="name"
                  placeholder={t('auth:register.namePlaceholder')}
                  className="input-base w-full ps-9 pe-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
                />
              </div>
              {errors.name?.message && (
                <p className="text-body-sm text-bg-error mt-1">{t(errors.name.message)}</p>
              )}
            </div>

            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
                {t('auth:register.phone')}
              </label>
              <div className="relative">
                <Phone
                  size={14}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
                />
                <input
                  type="tel"
                  {...registerField('phone')}
                  autoComplete="tel"
                  dir="ltr"
                  placeholder="010xxxxxxxx"
                  className="input-base w-full ps-9 pe-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40 ltr-nums"
                />
              </div>
              {errors.phone?.message && (
                <p className="text-body-sm text-bg-error mt-1">{t(errors.phone.message)}</p>
              )}
            </div>

            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
                {t('auth:register.password')}
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
                />
                <input
                  type="password"
                  {...registerField('password')}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="input-base w-full ps-9 pe-4 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
                />
              </div>
              {errors.password?.message && (
                <p className="text-body-sm text-bg-error mt-1">{t(errors.password.message)}</p>
              )}
            </div>

            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
                {t('auth:register.email')}
              </label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
                />
                <input
                  type="email"
                  {...registerField('email')}
                  autoComplete="email"
                  dir="ltr"
                  className="input-base w-full ps-9 pe-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
                />
              </div>
              {errors.email?.message && (
                <p className="text-body-sm text-bg-error mt-1">{t(errors.email.message)}</p>
              )}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-body-sm text-bg-error bg-bg-error/10 rounded-sm px-3 py-2"
                role="alert"
              >
                {error}
              </motion.p>
            )}

            {isConflict && (
              <p className="text-body-sm text-bg-text-secondary">
                <Link to="/login" className="font-semibold text-bg-primary-500 hover:text-bg-primary-600 transition-colors">
                  {t('auth:register.loginLink')}
                </Link>
              </p>
            )}

            <Button type="submit" variant="primary" className="w-full h-11" loading={isSubmitting} disabled={isSubmitting}>
              {t('auth:register.submit')}
            </Button>
          </form>
        </div>

        <p className="text-center text-body-sm text-bg-text-secondary mt-6">
          {t('auth:register.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-bg-primary-500 hover:text-bg-primary-600 transition-colors">
            {t('auth:register.loginLink')}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
