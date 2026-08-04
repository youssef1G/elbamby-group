import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useAuth } from '@/context/AuthContext.jsx';
import { fetchAdminSettings, updateSettings, updatePointsSettings } from '@/api.js';
import Skeleton from '@/components/ui/Skeleton.jsx';

export default function AdminSettings() {
  const { t } = useLocale();
  const { admin } = useAuth();
  const isSuper = admin?.role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shipping, setShipping] = useState('');
  const [threshold, setThreshold] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [earnRate, setEarnRate] = useState('1');
  const [redeemRate, setRedeemRate] = useState('0.1');

  useEffect(() => {
    fetchAdminSettings()
      .then((data) => {
        setShipping(data ? String(data.defaultShippingFee ?? '') : '');
        setThreshold(data ? String(data.freeShippingThreshold ?? '') : '');
        setCurrency(data?.currencyCode || 'EGP');
        setEarnRate(data ? String(data.pointsEarnRate ?? 1) : '1');
        setRedeemRate(data ? String(data.pointsRedeemRate ?? 0.1) : '0.1');
      })
      .catch(() => setError(t('admin:settings.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  async function savePoints(key) {
    setError('');
    setSuccess('');
    setSaving(key);
    try {
      await updatePointsSettings({
        points_earn_rate: Number(earnRate) || 0,
        points_redeem_rate: Number(redeemRate) || 0,
      });
      setSuccess(t('admin:settings.pointsSaved'));
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError(t('admin:settings.saveError'));
    } finally {
      setSaving('');
    }
  }

  async function save(key, value) {
    setError('');
    setSuccess('');
    setSaving(key);
    try {
      await updateSettings({ [key]: Number(value) || 0 });
      const label =
        key === 'default_shipping_fee'
          ? t('admin:settings.defaultShippingFee')
          : t('admin:settings.freeShippingThreshold');
      setSuccess(t('admin:settings.saveSuccess', { label }));
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError(t('admin:settings.saveError'));
    } finally {
      setSaving('');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    );
  }

  const fee = Math.max(0, Number(shipping) || 0);
  const thresh = Math.max(0, Number(threshold) || 0);

  const inputCls =
    'w-full text-body-sm py-3 px-3 bg-transparent text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ltr-nums';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        <h2 className="font-heading text-xl font-bold text-bg-text-primary">{t('admin:settings.title')}</h2>
        <p className="text-body-sm text-bg-text-secondary mt-1">{t('admin:settings.subtitle')}</p>
      </motion.div>

      {error && (
        <p className="text-body-sm text-bg-error bg-bg-error/10 border border-bg-error/20 rounded-md px-4 py-3">{error}</p>
      )}
      {success && (
        <p className="text-body-sm text-bg-success bg-bg-success/10 border border-bg-success/20 rounded-md px-4 py-3">{success}</p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.05 }}
      >
        <h3 className="font-heading text-body-sm font-bold text-bg-text-primary">
          {t('admin:settings.pointsTitle')}
        </h3>
        <p className="text-caption text-bg-text-secondary mt-0.5 mb-4">
          {t('admin:settings.pointsSubtitle')}
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePoints('points_earn_rate');
              }}
            >
              <label className="block text-body-sm font-medium text-bg-text-primary mb-1.5">
                {t('admin:settings.pointsEarnRate')}
              </label>
              <div className="flex items-center rounded-md border border-bg-border overflow-hidden bg-bg-surface focus-within:ring-2 focus-within:ring-bg-primary-500/40 transition-colors">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  value={earnRate}
                  onChange={(e) => setEarnRate(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="1"
                />
              </div>
              <p className="text-caption text-bg-text-secondary mt-2">
                {t('admin:settings.pointsEarnRateHint')}
              </p>
              <button
                type="submit"
                disabled={saving === 'points_earn_rate'}
                className="btn-primary !min-h-0 h-9 px-4 mt-3 text-body-sm disabled:opacity-50"
              >
                {saving === 'points_earn_rate' ? t('admin:settings.saving') : t('admin:common.save')}
              </button>
            </form>
          </div>

          <div className="surface-card p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                savePoints('points_redeem_rate');
              }}
            >
              <label className="block text-body-sm font-medium text-bg-text-primary mb-1.5">
                {t('admin:settings.pointsRedeemRate')}
              </label>
              <div className="flex items-center rounded-md border border-bg-border overflow-hidden bg-bg-surface focus-within:ring-2 focus-within:ring-bg-primary-500/40 transition-colors">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  dir="ltr"
                  value={redeemRate}
                  onChange={(e) => setRedeemRate(e.target.value)}
                  className={`${inputCls} flex-1`}
                  placeholder="0.1"
                />
              </div>
              <p className="text-caption text-bg-text-secondary mt-2">
                {t('admin:settings.pointsRedeemRateHint')}
              </p>
              <button
                type="submit"
                disabled={saving === 'points_redeem_rate'}
                className="btn-primary !min-h-0 h-9 px-4 mt-3 text-body-sm disabled:opacity-50"
              >
                {saving === 'points_redeem_rate' ? t('admin:settings.saving') : t('admin:common.save')}
              </button>
            </form>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        <div className="surface-card p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save('default_shipping_fee', shipping);
            }}
          >
            <label className="block text-body-sm font-medium text-bg-text-primary mb-1.5">
              {t('admin:settings.defaultShippingFee')}
              {!isSuper && (
                <span className="text-caption font-normal text-bg-text-secondary">
                  {' '}
                  ({t('admin:settings.superAdminOnly')})
                </span>
              )}
            </label>
            <div className="flex items-center rounded-md border border-bg-border overflow-hidden bg-bg-surface focus-within:ring-2 focus-within:ring-bg-primary-500/40 transition-colors">
              <span className="ps-3.5 pe-2.5 text-body-sm text-bg-text-secondary font-semibold shrink-0 border-e border-bg-border py-3 ltr-nums" dir="ltr">
                {currency}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                dir="ltr"
                value={shipping}
                disabled={!isSuper}
                onChange={(e) => setShipping(e.target.value)}
                className={`${inputCls} ${isSuper ? '' : 'opacity-60 cursor-not-allowed'}`}
                placeholder="0"
              />
            </div>
            <p className="text-caption text-bg-text-secondary mt-2">
              {fee > 0
                ? t('admin:settings.feePerOrder', { fee: fee.toFixed(0) })
                : t('admin:settings.noFee')}
            </p>
            <button
              type="submit"
              disabled={saving === 'default_shipping_fee' || !isSuper}
              className="btn-primary !min-h-0 h-9 px-4 mt-3 text-body-sm disabled:opacity-50"
            >
              {saving === 'default_shipping_fee'
                ? t('admin:settings.saving')
                : t('admin:common.save')}
            </button>
          </form>
        </div>

        <div className="surface-card p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save('free_shipping_threshold', threshold);
            }}
          >
            <label className="block text-body-sm font-medium text-bg-text-primary mb-1.5">
              {t('admin:settings.freeShippingThreshold')}
            </label>
            <div className="flex items-center rounded-md border border-bg-border overflow-hidden bg-bg-surface focus-within:ring-2 focus-within:ring-bg-primary-500/40 transition-colors">
              <span className="ps-3.5 pe-2.5 text-body-sm text-bg-text-secondary font-semibold shrink-0 border-e border-bg-border py-3 ltr-nums" dir="ltr">
                {currency}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                dir="ltr"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={inputCls}
                placeholder="0"
              />
            </div>
            <p className="text-caption text-bg-text-secondary mt-2">
              {thresh > 0
                ? t('admin:settings.thresholdLabel', { amount: thresh.toFixed(0) })
                : t('admin:settings.noThreshold')}
            </p>
            <button
              type="submit"
              disabled={saving === 'free_shipping_threshold'}
              className="btn-primary !min-h-0 h-9 px-4 mt-3 text-body-sm disabled:opacity-50"
            >
              {saving === 'free_shipping_threshold'
                ? t('admin:settings.saving')
                : t('admin:common.save')}
            </button>
          </form>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.15 }}
        className="surface-card p-6"
      >
        <h3 className="font-heading text-body-sm font-bold text-bg-text-primary mb-4">
          {t('admin:settings.preview')}
        </h3>
        {thresh > 0 && fee > 0 ? (
          <div className="space-y-2 text-body-sm">
            <div className="flex items-center justify-between text-bg-text-secondary">
              <span>{t('admin:settings.belowThreshold', { amount: thresh.toFixed(0) })}</span>
              <span className="font-semibold text-bg-text-primary ltr-nums" dir="ltr">
                {currency} {fee.toFixed(0)} {t('admin:settings.shipping')}
              </span>
            </div>
            <div className="flex items-center justify-between text-bg-text-secondary">
              <span>{t('admin:settings.aboveThreshold', { amount: thresh.toFixed(0) })}</span>
              <span className="font-semibold text-bg-success">{t('admin:settings.free')}</span>
            </div>
          </div>
        ) : fee > 0 ? (
          <p className="text-body-sm text-bg-text-secondary">
            {t('admin:settings.feePerOrder', { fee: fee.toFixed(0) })}
          </p>
        ) : (
          <p className="text-body-sm text-bg-text-secondary">{t('admin:settings.noFee')}</p>
        )}
      </motion.div>
    </motion.div>
  );
}