import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { X, Upload, ChevronLeft, Save } from 'lucide-react';
import { fetchAdminCategories, createProduct, updateProduct, fetchAdminProduct } from '@/api.js';
import { openCloudinaryWidget } from '@/lib/cloudinary.js';
import Select from '@/components/ui/Select.jsx';
import Button from '@/components/ui/Button.jsx';
import { useToast } from '@/components/ui/Toast.jsx';

const productSchema = z.object({
  name_en: z.string().min(1, 'Required'),
  name_ar: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required'),
  category_id: z.string().min(1, 'Required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  price: z.coerce.number().positive('Must be > 0'),
  compare_at_price: z.coerce.number().optional().nullable(),
  stock_quantity: z.coerce.number().int().min(0),
  capacity_gb: z.coerce.number().int().optional().nullable(),
  speed_class: z.string().optional(),
  interface_type: z.string().optional(),
  form_factor: z.string().optional(),
  is_featured: z.boolean().optional(),
  is_new_arrival: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

const inputCls = (error) =>
  `w-full rounded-lg border bg-bg-surface px-3.5 py-2.5 text-body-sm text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none transition-colors ${
    error ? 'border-bg-error focus:ring-2 focus:ring-bg-error/20' : 'border-bg-border focus:border-bg-primary-500 focus:ring-1 focus:ring-bg-primary-500'
  }`;

export default function AdminProductForm() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEdit = !!id;

  const [catData, setCatData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchAdminCategories()
      .then((res) => { if (!cancelled) setCatData(res); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const categories = catData?.data || [];

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [isDirty, setIsDirty] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);

  const {
    register, handleSubmit, formState: { errors }, reset, setValue, watch,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: { is_featured: false, is_new_arrival: false, is_active: true, stock_quantity: 0 },
  });

  const watchCategory = watch('category_id');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await fetchAdminProduct(id);
        const p = res.data || res;
        const hasSpecs = p.capacity_gb || p.speed_class || p.interface_type || p.form_factor;
        setShowSpecs(hasSpecs);
        reset({
          name_en: p.name_en || '', name_ar: p.name_ar || '',
          slug: p.slug || '', category_id: p.category_id?.toString() || '',
          description_en: p.description_en || '', description_ar: p.description_ar || '',
          price: p.price || 0, compare_at_price: p.compare_at_price || null,
          stock_quantity: p.stock_quantity ?? 0,
          capacity_gb: p.capacity_gb || null, speed_class: p.speed_class || '',
          interface_type: p.interface_type || '', form_factor: p.form_factor || '',
          is_featured: !!p.is_featured, is_new_arrival: !!p.is_new_arrival,
          is_active: !!p.is_active,
        });
        if (p.images?.length) setImages(p.images.map((img) => (typeof img === 'string' ? { url: img } : img)));
      } catch {
        toast(t('common:common.error'), 'error');
        navigate('/admin/products');
      } finally { setFetchLoading(false); }
    })();
  }, [id]);

  const handleUpload = () => {
    openCloudinaryWidget((url) => { setImages((prev) => [...prev, { url, sort_order: prev.length }]); setIsDirty(true); });
  };

  const removeImage = (index) => { setImages((prev) => prev.filter((_, i) => i !== index)); setIsDirty(true); };

  const moveImage = (from, to) => {
    setImages((prev) => {
      const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
      return next.map((img, i) => ({ ...img, sort_order: i }));
    }); setIsDirty(true);
  };

  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const onSubmit = async (data) => {
    if (images.length === 0) { toast(isAr ? 'مطلوب صورة واحدة على الأقل' : 'At least one image required', 'error'); return; }
    setLoading(true);
    try {
      const payload = {
        ...data,
        slug: data.slug || generateSlug(data.name_en),
        compare_at_price: data.compare_at_price || null,
        capacity_gb: showSpecs ? (data.capacity_gb || null) : null,
        speed_class: showSpecs ? (data.speed_class || null) : null,
        interface_type: showSpecs ? (data.interface_type || null) : null,
        form_factor: showSpecs ? (data.form_factor || null) : null,
        images: images.map((img, i) => ({ url: img.url, sort_order: i })),
      };
      if (isEdit) { await updateProduct(id, payload); toast(t('admin:products.updated'), 'success'); }
      else { await createProduct(payload); toast(t('admin:products.created'), 'success'); }
      navigate('/admin/products');
    } catch (err) {
      const serverError = err?.items?.[0] || err?.details?.[0];
      if (serverError?.field) { setValue(serverError.field, data[serverError.field] || ''); toast(serverError.message || t('admin:products.updated.EXISTS'), 'error'); }
      else { toast(err.message || t('common:common.error'), 'error'); }
    } finally { setLoading(false); }
  };

  if (fetchLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-bg-neutral-200/60 animate-pulse rounded-md" />
        <div className="h-[600px] bg-bg-neutral-200/60 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <button onClick={() => navigate('/admin/products')} className="flex items-center gap-1.5 text-caption text-bg-text-secondary hover:text-bg-text-primary mb-2 transition-colors">
            <ChevronLeft size={14} />
            {t('admin:products.title')}
          </button>
          <h1 className="text-h2 font-heading font-bold text-bg-text-primary">
            {isEdit ? t('admin:products.edit') : t('admin:products.create')}
          </h1>
        </div>
        {isEdit && isDirty && (
          <span className="text-caption font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full px-2.5 py-0.5">
            {isAr ? 'غير محفوظ' : 'Unsaved'}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Section title={isAr ? 'معلومات أساسية' : 'Basic Info'} subtitle={isAr ? 'الاسم والقسم' : 'Name and category'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('admin:products.nameEn')}>
              <input type="text" {...register('name_en')} placeholder="Samsung EVO Plus 128GB"
                onChange={(e) => { register('name_en').onChange(e); if (!isEdit) setValue('slug', generateSlug(e.target.value)); }}
                className={inputCls(errors.name_en)} />
              {errors.name_en && <p className="text-caption text-bg-error mt-1">{errors.name_en.message}</p>}
            </Field>
            <Field label={t('admin:products.nameAr')}>
              <input type="text" {...register('name_ar')} dir="rtl" placeholder={isAr ? 'اسم المنتج بالعربية' : 'Arabic name'} className={inputCls(errors.name_ar)} />
              {errors.name_ar && <p className="text-caption text-bg-error mt-1">{errors.name_ar.message}</p>}
            </Field>
          </div>
          <Field label={isAr ? 'الرابط التعريفي للمنتج' : 'Product URL slug'}>
            <input type="text" {...register('slug')} placeholder="samsung-evo-plus-128gb" className={inputCls(errors.slug)} />
            <p className="text-caption text-bg-text-secondary mt-1">{isAr ? 'يظهر في رابط المنتج في المتجر' : 'Appears in the product URL'}</p>
            {errors.slug && <p className="text-caption text-bg-error mt-1">{errors.slug.message}</p>}
          </Field>
          <Field label={t('admin:products.category')}>
            <Select
              value={watchCategory}
              onChange={(v) => setValue('category_id', v, { shouldValidate: true })}
              placeholder={isAr ? 'اختر القسم...' : 'Choose category...'}
              options={categories.map((c) => ({ value: c.id, label: isAr ? c.name_ar : c.name_en }))}
              className={errors.category_id ? '[&>button]:border-bg-error' : ''}
            />
            {errors.category_id && <p className="text-caption text-bg-error mt-1">{errors.category_id.message}</p>}
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={isAr ? 'الوصف (إنجليزي)' : 'Description (EN)'}>
              <textarea {...register('description_en')} rows={3} className={`${inputCls()} resize-y`} />
            </Field>
            <Field label={isAr ? 'الوصف (عربي)' : 'Description (AR)'}>
              <textarea {...register('description_ar')} rows={3} dir="rtl" className={`${inputCls()} resize-y`} />
            </Field>
          </div>
        </Section>

        {/* Pricing */}
        <Section title={isAr ? 'السعر والمخزون' : 'Pricing & Stock'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`${isAr ? 'السعر (جنيه)' : 'Price (EGP)'}`}>
              <div className={`flex items-center rounded-lg border overflow-hidden bg-bg-surface ${errors.price ? 'border-bg-error' : 'border-bg-border'} focus-within:border-bg-primary-500`}>
                <span className="ps-3.5 pe-2.5 text-body-sm text-bg-text-secondary font-semibold shrink-0 border-e border-bg-border py-2.5">EGP</span>
                <input type="number" step="0.01" min="0" {...register('price')} placeholder="0.00" className="w-full bg-transparent text-body-sm py-2.5 px-3 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none" />
              </div>
              {errors.price && <p className="text-caption text-bg-error mt-1">{errors.price.message}</p>}
            </Field>
            <Field label={`${isAr ? 'السعر قبل الخصم' : 'Compare at price'}`}>
              <div className="flex items-center rounded-lg border border-bg-border overflow-hidden bg-bg-surface focus-within:border-bg-primary-500">
                <span className="ps-3.5 pe-2.5 text-body-sm text-bg-text-secondary font-semibold shrink-0 border-e border-bg-border py-2.5">EGP</span>
                <input type="number" step="0.01" min="0" {...register('compare_at_price')} placeholder={isAr ? 'اختيار' : 'Optional'} className="w-full bg-transparent text-body-sm py-2.5 px-3 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none" />
              </div>
            </Field>
            <Field label={isAr ? 'الكمية في المخزون' : 'Stock'}>
              <div className="flex items-center rounded-lg border border-bg-border overflow-hidden bg-bg-surface focus-within:border-bg-primary-500">
                <button type="button" onClick={() => { const v = watch('stock_quantity') || 0; setValue('stock_quantity', Math.max(0, v - 1)); setIsDirty(true); }} className="w-9 h-10 flex items-center justify-center text-bg-text-secondary hover:bg-bg-surface-sunken shrink-0 transition">−</button>
                <input type="number" min="0" {...register('stock_quantity')} className="w-full bg-transparent text-body-sm py-2.5 text-center text-bg-text-primary focus:outline-none" />
                <button type="button" onClick={() => { const v = watch('stock_quantity') || 0; setValue('stock_quantity', v + 1); setIsDirty(true); }} className="w-9 h-10 flex items-center justify-center text-bg-text-secondary hover:bg-bg-surface-sunken shrink-0 transition">+</button>
              </div>
            </Field>
            <Field label={isAr ? 'وصل كمخزون منخفض عند' : 'Low stock alerts at'}>
              <input type="number" min="0" {...register('low_stock_threshold')} className={inputCls()} />
              <p className="text-caption text-bg-text-secondary mt-1">{isAr ? 'افتراضي: 5' : 'Default: 5'}</p>
            </Field>
          </div>
        </Section>

        {/* Storage specs — toggleable */}
        <div className="bg-bg-surface border border-bg-border rounded-lg p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-body-sm font-heading font-bold text-bg-text-primary uppercase tracking-[0.05em]">
                {isAr ? 'مواصفات التخزين' : 'Storage Specs'}
              </h2>
              <p className="text-caption text-bg-text-secondary mt-0.5">{isAr ? 'خاص بمنتجات الفلاشات والميموري' : 'For flash drives & memory cards'}</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-caption text-bg-text-secondary">{isAr ? 'منتج تخزين' : 'Storage product'}</span>
              <button type="button" role="switch" aria-checked={showSpecs} onClick={() => setShowSpecs(!showSpecs)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${showSpecs ? 'bg-bg-primary-500' : 'bg-bg-neutral-300'}`}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${showSpecs ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          </div>
          {showSpecs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
              <Field label={isAr ? 'السعة (جيجابايت)' : 'Capacity (GB)'}>
                <input type="number" {...register('capacity_gb')} placeholder="256" className={inputCls()} />
              </Field>
              <Field label={isAr ? 'سرعة الكارت' : 'Speed Class'}>
                <input type="text" {...register('speed_class')} placeholder="U3, V30, A2" className={inputCls()} />
              </Field>
              <Field label={isAr ? 'نوع المنفذ' : 'Interface Type'}>
                <input type="text" {...register('interface_type')} placeholder="USB 3.2, NVMe PCIe 4.0" className={inputCls()} />
              </Field>
              <Field label={isAr ? 'الشكل والحجم' : 'Form Factor'}>
                <input type="text" {...register('form_factor')} placeholder='M.2 2280, microSD, 2.5"' className={inputCls()} />
              </Field>
            </div>
          )}
        </div>

        {/* Media */}
        <Section title={isAr ? 'الصور' : 'Images'}>
          <div className="flex flex-wrap gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-bg-border group">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <button type="button" onClick={() => removeImage(i)} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center"><X size={12} /></button>
                </div>
                {i === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] text-center py-0.5">{isAr ? 'الصورة الرئيسية' : 'Primary'}</span>}
              </div>
            ))}
            <button type="button" onClick={handleUpload} className="w-20 h-20 rounded-lg border-2 border-dashed border-bg-border flex flex-col items-center justify-center gap-1 text-bg-text-secondary hover:text-bg-primary-500 hover:border-bg-primary-500 transition cursor-pointer">
              <Upload size={16} />
              <span className="text-caption">{isAr ? 'رفع' : 'Upload'}</span>
            </button>
          </div>
        </Section>

        {/* Status */}
        <Section title={isAr ? 'الحالة' : 'Status'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleCard label={t('admin:products.isFeatured')} {...register('is_featured')} />
            <ToggleCard label={t('admin:products.isNewArrival')} {...register('is_new_arrival')} />
          </div>
        </Section>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => navigate('/admin/products')}>
            {t('admin:common.cancel')}
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            <Save size={16} />
            {isEdit ? t('admin:common.save') : t('admin:products.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="bg-bg-surface border border-bg-border rounded-lg p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-body-sm font-heading font-bold text-bg-text-primary uppercase tracking-[0.05em]">{title}</h2>
        {subtitle && <p className="text-caption text-bg-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.05em]">{label}</label>
      {children}
    </div>
  );
}

function ToggleCard({ label, ...props }) {
  return (
    <label className="flex items-center justify-center gap-2.5 rounded-lg border px-4 py-3 text-body-sm font-medium cursor-pointer transition-colors border-bg-border bg-bg-surface text-bg-text-secondary hover:border-bg-primary-500/40 peer-checked:bg-bg-primary-500/10 peer-checked:border-bg-primary-500 peer-checked:text-bg-primary-500">
      <input type="checkbox" {...props} className="peer sr-only" />
      <span>{label}</span>
      <span className="w-4 h-4 rounded border-2 border-bg-border peer-checked:border-bg-primary-500 peer-checked:bg-bg-primary-500 flex items-center justify-center transition">
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
      </span>
    </label>
  );
}