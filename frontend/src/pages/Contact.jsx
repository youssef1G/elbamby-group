import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { submitComplaint } from '@/api.js';
import { fadeUp, scaleIn } from '@/lib/animations.js';

function Field({ label, error, children, id }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-bg-text-primary mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-bg-error mt-1" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

export default function Contact() {
  const { t } = useLocale();
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const phoneRef = useRef(null);
  const messageRef = useRef(null);

  const set = (f) => (e) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    if (errors[f]) setErrors((p) => ({ ...p, [f]: '' }));
  };

  const next = (e, ref) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ref.current.focus();
    }
  };

  function validateForm(data) {
    const e = {};
    if (data.name.trim().length < 2) e.name = t('errors:validation.required');
    if (!/^(010|011|012|015)\d{8}$/.test(data.phone.replace(/\s/g, ''))) e.phone = t('errors:validation.phone');
    if (data.message.trim().length < 10) e.message = t('errors:validation.required');
    return e;
  }

  const inputCls = (f) =>
    `w-full rounded-xl border px-4 py-3 text-sm font-medium bg-bg-surface text-bg-text-primary focus:outline-none focus:ring-2 focus:ring-bg-primary-500 focus:border-bg-primary-500 transition ${
      errors[f] ? 'border-bg-error' : 'border-bg-border'
    }`;

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errs = validateForm(form);
    if (Object.keys(errs).length) return setErrors(errs);
    setLoading(true);
    try {
      await submitComplaint(form);
      setSuccess(true);
    } catch (err) {
      setServerError(err.message || t('common:common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div className="max-w-lg mx-auto px-5 py-24 text-center" {...scaleIn}>
<div className="w-16 h-16 rounded-full bg-bg-primary-50 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-bg-primary-500" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-heading-lg text-bg-text-primary mb-2">{t('contact.success', { ns: 'common' })}</h2>
        <p className="text-sm text-bg-text-secondary mb-8">{t('contact.formTitle', { ns: 'common' })}</p>
        <Link to="/" className="btn-primary text-sm">{t('notFound.backHome', { ns: 'common' })}</Link>
      </motion.div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
      <motion.div className="text-center mb-10" {...fadeUp}>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-primary-50 border border-bg-primary-500/10 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-bg-primary-500">
            {t('contact.title', { ns: 'common' })}
          </span>
        </div>
        <h1 className="text-display text-bg-text-primary mb-2">{t('contact.title', { ns: 'common' })}</h1>
        <p className="text-sm text-bg-text-secondary">{t('contact.formTitle', { ns: 'common' })}</p>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-5"
        noValidate
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      >
        <Field label={t('contact.name', { ns: 'common' })} error={errors.name} id="contact-name">
          <input
            id="contact-name"
            value={form.name}
            onChange={set('name')}
            onKeyDown={(e) => next(e, phoneRef)}
            placeholder={t('contact.name', { ns: 'common' })}
            className={inputCls('name')}
          />
        </Field>
        <Field label={t('contact.phone', { ns: 'common' })} error={errors.phone} id="contact-phone">
          <input
            id="contact-phone"
            dir="ltr"
            ref={phoneRef}
            value={form.phone}
            onChange={set('phone')}
            onKeyDown={(e) => next(e, messageRef)}
            placeholder="010xxxxxxxx"
            className={inputCls('phone')}
          />
        </Field>
        <Field label={t('contact.message', { ns: 'common' })} error={errors.message} id="contact-message">
          <textarea
            id="contact-message"
            ref={messageRef}
            value={form.message}
            onChange={set('message')}
            rows={5}
            placeholder={t('contact.message', { ns: 'common' })}
            className={inputCls('message')}
          />
        </Field>
        {serverError && (
          <p className="text-sm text-bg-error bg-bg-neutral-100 border border-bg-error/20 rounded-xl px-4 py-3">{serverError}</p>
        )}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm disabled:opacity-50">
          {loading ? t('contact.sending', { ns: 'common' }) : t('contact.submit', { ns: 'common' })}
        </button>
      </motion.form>
    </div>
  );
}