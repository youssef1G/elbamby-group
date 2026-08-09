import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext.jsx';
import { login } from '@/api.js';
import Button from '@/components/ui/Button.jsx';
import { Lock, User, Cpu } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'username'),
  password: z.string().min(1, 'password'),
});

export default function AdminLogin() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAdmin } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sessionExpired = location.state?.reason === 'session-expired';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data) => {
    setError('');
    setSubmitting(true);
    try {
      const admin = await login(data.username, data.password);
      setAdmin(admin);
      navigate('/admin');
    } catch (err) {
      setError(err.message || t('admin:login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Enter moves to the next field instead of submitting mid-form; only the
  // last field's Enter triggers a real submit (and its validation).
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const inputs = Array.from(e.currentTarget.form?.querySelectorAll('input') ?? []);
    const next = inputs[inputs.indexOf(e.currentTarget) + 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-surface-sunken px-4 py-12">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 end-1/4 w-96 h-96 bg-bg-primary-500/4 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 start-1/4 w-80 h-80 bg-bg-primary-500/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-bg-primary-500/10 mb-2">
            <Cpu size={28} strokeWidth={1.5} className="text-bg-primary-500" />
          </div>
          <h1 className="font-heading text-h2 font-bold tracking-tight text-bg-text-primary">
            {t('common:brand.fullName')}
          </h1>
          <p className="text-caption text-bg-text-secondary mt-1">{t('admin:login.subtitle')}</p>
        </div>

        {sessionExpired && (
          <div className="mb-4 bg-bg-warning/10 border border-bg-warning/25 text-bg-warning rounded-md px-4 py-3 text-body-sm" role="status">
            {t('admin:login.sessionExpired')}
          </div>
        )}

        <div className="bg-bg-surface border border-bg-border rounded-lg p-6 sm:p-8 shadow-card">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
                {t('admin:login.username')}
              </label>
              <div className="relative">
                <User
                  size={14}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
                />
                <input
                  type="text"
                  {...register('username')}
                  onKeyDown={handleKeyDown}
                  autoComplete="username"
                  placeholder={t('admin:login.placeholderUsername')}
                  className="input-base w-full ps-9 pe-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
                />
              </div>
              {errors.username?.message && (
                <p className="text-body-sm text-bg-error mt-1">{t('admin:login.required')}</p>
              )}
            </div>

            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
                {t('admin:login.password')}
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
                />
                <input
                  type="password"
                  {...register('password')}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-base w-full ps-9 pe-4 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
                />
              </div>
              {errors.password?.message && (
                <p className="text-body-sm text-bg-error mt-1">{t('admin:login.required')}</p>
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

            <Button
              type="submit"
              variant="primary"
              className="w-full h-11"
              loading={submitting}
              disabled={submitting}
            >
              {t('admin:login.submit')}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
