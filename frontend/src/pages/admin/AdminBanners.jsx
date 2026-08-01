import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { Plus, Pencil } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchAdminBanners, deleteBanner, createBanner, updateBanner } from '@/api.js';
import DataTable from '@/components/admin/DataTable.jsx';
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Select from '@/components/ui/Select.jsx';
import Button from '@/components/ui/Button.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { openCloudinaryWidget } from '@/lib/cloudinary.js';
import { Upload, X } from 'lucide-react';

const bannerSchema = z.object({
  title_en: z.string().optional(),
  title_ar: z.string().optional(),
  subtitle_en: z.string().optional(),
  subtitle_ar: z.string().optional(),
  link_url: z.string().optional(),
  position: z.string().min(1, 'Required'),
});

const inputCls = 'w-full rounded-lg border border-bg-border bg-bg-surface px-3.5 py-2.5 text-body-sm text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:border-bg-primary-500';

export default function AdminBanners() {
  const { t, isAr } = useLocale();
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAdminBanners({ all: true })
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const banners = data?.data || [];

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm({ resolver: zodResolver(bannerSchema) });
  const position = watch('position');

  const openCreate = () => { setEditing(null); setImageUrl(''); reset({ title_en: '', title_ar: '', subtitle_en: '', subtitle_ar: '', link_url: '', position: 'hero' }); setModalOpen(true); };
  const openEdit = (b) => { setEditing(b); setImageUrl(b.image || ''); reset({ title_en: b.title_en || '', title_ar: b.title_ar || '', subtitle_en: b.subtitle_en || '', subtitle_ar: b.subtitle_ar || '', link_url: b.link_url || '', position: b.position || 'hero' }); setModalOpen(true); };

  const onSubmit = async (formData) => {
    if (!imageUrl) { toast(isAr ? 'الصورة مطلوبة' : 'Image required', 'error'); return; }
    setSubmitting(true);
    try {
      const payload = { ...formData, image: imageUrl };
      if (editing) { await updateBanner(editing.id, payload); toast(t('admin:banners.updated'), 'success'); }
      else { await createBanner(payload); toast(t('admin:banners.created'), 'success'); }
      setModalOpen(false);
      setReload((v) => v + 1);
    } catch (err) { toast(err.message || t('common:common.error'), 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteBanner(deleteTarget.id);
      toast(t('admin:banners.deleted'), 'success');
      setDeleteTarget(null);
      setReload((v) => v + 1);
    }
    catch (err) { toast(err.message || t('common:common.error'), 'error'); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key: 'image', label: t('admin:banners.image'), render: (r) => <div className="w-16 h-10 rounded-md overflow-hidden bg-bg-surface-sunken">{r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-caption text-bg-text-secondary">—</div>}</div> },
    { key: 'title', label: t('admin:banners.titleEn'), render: (r) => <span className="font-medium text-bg-text-primary">{isAr ? (r.title_ar || r.title_en) : (r.title_en || r.title_ar) || '—'}</span> },
    { key: 'position', label: t('admin:banners.position'), render: (r) => <span className="text-bg-text-secondary text-caption font-semibold uppercase">{r.position === 'hero' ? (isAr ? 'الرئيسية' : 'Home') : r.position}</span> },
    { key: 'actions', label: '', render: (r) => (
      <div className="flex items-center justify-end gap-3">
        <button onClick={() => openEdit(r)} className="text-caption font-medium text-bg-primary-500 hover:underline">{t('admin:common.edit')}</button>
        <button onClick={() => setDeleteTarget(r)} className="text-caption font-medium text-bg-text-secondary hover:text-bg-error">{t('admin:common.delete')}</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-heading font-bold text-bg-text-primary">{t('admin:banners.title')}</h1>
          <p className="text-body-sm text-bg-text-secondary mt-0.5">
            {isAr ? 'الصور الكبيرة التي تظهر على الصفحة الرئيسية للمتجر' : 'Large images shown on the homepage of your store'}
          </p>
        </div>
        <Button onClick={openCreate}><Plus size={16} />{t('admin:banners.create')}</Button>
      </div>

      <DataTable columns={columns} data={banners} isLoading={isLoading} emptyMessage={t('admin:common.noResults')} emptyAction={{ label: t('admin:banners.create'), onClick: openCreate }} />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">
          <h3 className="text-body font-heading font-bold text-bg-text-primary">{editing ? t('admin:banners.edit') : t('admin:banners.create')}</h3>
          <div>
            <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.05em]">{t('admin:banners.image')}</label>
            {imageUrl ? (
              <div className="relative w-44 h-24 rounded-lg overflow-hidden border border-bg-border">
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setImageUrl('')} className="absolute top-1 end-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"><X size={10} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => openCloudinaryWidget(setImageUrl)} className="h-24 w-44 rounded-lg border-2 border-dashed border-bg-border flex flex-col items-center justify-center gap-1 text-bg-text-secondary hover:text-bg-primary-500 hover:border-bg-primary-500 transition cursor-pointer"><Upload size={16} /><span className="text-caption">{isAr ? 'رفع' : 'Upload'}</span></button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.05em]">{t('admin:banners.titleEn')}</label>
              <input type="text" {...register('title_en')} className={inputCls} />
            </div>
            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.05em]">{t('admin:banners.titleAr')}</label>
              <input type="text" {...register('title_ar')} dir="rtl" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5">Subtitle (EN)</label>
              <input type="text" {...register('subtitle_en')} className={inputCls} />
            </div>
            <div>
              <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5">Subtitle (AR)</label>
              <input type="text" {...register('subtitle_ar')} dir="rtl" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5">{t('admin:banners.linkUrl')}</label>
            <input type="text" {...register('link_url')} placeholder="/shop" className={inputCls} />
          </div>
          <div>
            <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5">{t('admin:banners.position')}</label>
            <Select
              value={position}
              onChange={(v) => setValue('position', v)}
              placeholder={isAr ? 'اختر الموضع...' : 'Choose position...'}
              options={[
                { value: 'hero', label: `Hero — ${isAr ? 'الشريحة الرئيسية' : 'main slide'}` },
                { value: 'secondary', label: `Secondary — ${isAr ? 'البانر الثانوي' : 'secondary banner'}` },
              ]}
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('admin:common.cancel')}</Button>
            <Button type="submit" loading={submitting} disabled={submitting}>{t('admin:common.save')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} />
    </div>
  );
}