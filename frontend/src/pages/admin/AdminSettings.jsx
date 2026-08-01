import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { getSettings, updateSettings } from '@/api.js';
import { useAuth } from '@/context/AuthContext.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import Select from '@/components/ui/Select.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';
import { useToast } from '@/components/ui/Toast.jsx';

export default function AdminSettings() {
  const { t, isAr } = useLocale();
  const { toast } = useToast();
  const { admin } = useAuth();
  const isSuper = admin?.role === 'super_admin';

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const { register, handleSubmit, reset, watch, setValue } = useForm({ defaultValues: {} });

  useEffect(() => {
    if (data?.data) {
      const s = data.data;
      reset({
        store_name_en: s.store_name_en || '',
        store_name_ar: s.store_name_ar || '',
        logo_url: s.logo_url || '',
        contact_phone: s.contact_phone || '',
        whatsapp_number: s.whatsapp_number || '',
        contact_email: s.contact_email || '',
        address_en: s.address_en || '',
        address_ar: s.address_ar || '',
        facebook_url: s.facebook_url || '',
        instagram_url: s.instagram_url || '',
        tiktok_url: s.tiktok_url || '',
        default_shipping_fee: s.default_shipping_fee ?? 50,
        free_shipping_threshold: s.free_shipping_threshold ?? 0,
        low_stock_threshold: s.low_stock_threshold ?? 5,
        currency_code: s.currency_code || 'EGP',
      });
      setDirty(false);
    }
  }, [data, reset]);

  const handleChange = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setValue(key, value);
    setDirty(true);
  };

  const onSubmit = async (formData) => {
    try {
      setSaving(true);
      await updateSettings(formData);
      toast(t('admin:settings.saved'), 'success');
      setDirty(false);
    } catch (err) { toast(err.message || t('common:common.error'), 'error'); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;

  const currency = watch('currency_code') || 'EGP';
  const shippingFee = Number(watch('default_shipping_fee') || 0);
  const freeThreshold = Number(watch('free_shipping_threshold') || 0);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-h2 font-heading font-bold text-bg-text-primary">{t('admin:settings.title')}</h1>
        <p className="text-body-sm text-bg-text-secondary mt-0.5">
          {isAr ? 'إعدادات المتجر العامة' : 'General store settings'}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Section title={isAr ? 'المتجر' : 'Store'}>
          <Input label={t('admin:settings.storeNameEn')} {...register('store_name_en')} onChange={(e) => handleChange('store_name_en')(e)} placeholder="El Bamby Group" />
          <Input label={t('admin:settings.storeNameAr')} {...register('store_name_ar')} onChange={(e) => handleChange('store_name_ar')(e)} dir="rtl" placeholder="البمبي جروب" />
          <Input label={t('admin:settings.logoUrl')} {...register('logo_url')} onChange={(e) => handleChange('logo_url')(e)} placeholder="https://..." />
        </Section>

        <Section title={isAr ? 'التواصل' : 'Contact'}>
          <Input label={t('admin:settings.contactPhone')} {...register('contact_phone')} onChange={(e) => handleChange('contact_phone')(e)} dir="ltr" placeholder="01000000000" />
          <Input label={t('admin:settings.whatsappNumber')} {...register('whatsapp_number')} onChange={(e) => handleChange('whatsapp_number')(e)} dir="ltr" />
          <Input label={t('admin:settings.contactEmail')} type="email" {...register('contact_email')} onChange={(e) => handleChange('contact_email')(e)} placeholder="info@example.com" />
          <Input label={t('admin:settings.addressEn')} {...register('address_en')} onChange={(e) => handleChange('address_en')(e)} />
          <Input label={t('admin:settings.addressAr')} {...register('address_ar')} onChange={(e) => handleChange('address_ar')(e)} dir="rtl" />
        </Section>

        <Section title={isAr ? 'وسائل التواصل الاجتماعي' : 'Social Media'}>
          <Input label="Facebook" {...register('facebook_url')} onChange={(e) => handleChange('facebook_url')(e)} placeholder="https://facebook.com/..." />
          <Input label="Instagram" {...register('instagram_url')} onChange={(e) => handleChange('instagram_url')(e)} placeholder="https://instagram.com/..." />
          <Input label="TikTok" {...register('tiktok_url')} onChange={(e) => handleChange('tiktok_url')(e)} placeholder="https://tiktok.com/..." />
        </Section>

        <Section title={isAr ? 'العملة والشحن' : 'Currency & Shipping'}>
          <div>
            <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.05em]">
              {t('admin:settings.currencyCode')} {!isSuper && <span className="text-caption font-normal text-bg-text-secondary">({t('admin:settings.superAdminOnly')})</span>}
            </label>
            <Select
              value={currency}
              onChange={(v) => handleChange('currency_code')(v)}
              options={[
                { value: 'EGP', label: 'EGP (جنيه مصري)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'SAR', label: 'SAR (ر.س)' },
                { value: 'AED', label: 'AED (د.إ)' },
              ]}
            />
          </div>
          <Input
            label={`${isAr ? 'رسوم الشحن' : 'Shipping fee'} (${currency})`}
            type="number"
            {...register('default_shipping_fee', { valueAsNumber: true })}
            onChange={(e) => handleChange('default_shipping_fee')(e.target.value === '' ? 0 : Number(e.target.value))}
            disabled={!isSuper}
            helper={!isSuper ? `(${t('admin:settings.superAdminOnly')})` : null}
          />
          <Input
            label={isAr ? 'الشحن مجاني من' : 'Free shipping from'}
            type="number"
            {...register('free_shipping_threshold', { valueAsNumber: true })}
            onChange={(e) => handleChange('free_shipping_threshold')(e.target.value === '' ? 0 : Number(e.target.value))}
            placeholder="0"
          />
          {freeThreshold > 0 && (
            <p className="text-caption text-bg-text-secondary">
              {isAr ? `الطلبات فوق ${freeThreshold} ${currency} تشحن مجاناً` : `Orders over ${freeThreshold} ${currency} ship free`}
            </p>
          )}
        </Section>

        <Section title={isAr ? 'الإعدادات الافتراضية' : 'Defaults'}>
          <Input
            label={t('admin:settings.lowStockThreshold')}
            type="number"
            {...register('low_stock_threshold', { valueAsNumber: true })}
            onChange={(e) => handleChange('low_stock_threshold')(e.target.value === '' ? 5 : Number(e.target.value))}
            helper={isAr ? 'عند هذا الرقم أو أقل يظهر تنبيه المخزون المنخفض' : 'Alert appears at or below this number'}
          />
        </Section>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={saving} disabled={!dirty}>
            <Save size={16} />
            {t('admin:common.save')}
          </Button>
          {!dirty && <p className="text-body-sm text-bg-text-secondary">{isAr ? 'كل التغييرات محفوظة ✓' : 'All changes saved ✓'}</p>}
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-5 sm:p-6 space-y-4">
      <h2 className="text-body-sm font-heading font-bold text-bg-text-primary uppercase tracking-[0.05em]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}