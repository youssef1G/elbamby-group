import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { Plus } from 'lucide-react';
import { fetchAdminCategories, createCategory, updateCategory, deleteCategory } from '@/api.js';
import DataTable from '@/components/admin/DataTable.jsx';
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Button from '@/components/ui/Button.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const categorySchema = z.object({
  name_en: z.string().min(1, 'Required'),
  name_ar: z.string().min(1, 'Required'),
  slug: z.string().min(1, 'Required'),
  description_en: z.string().optional(),
  description_ar: z.string().optional(),
  sort_order: z.coerce.number().int().optional(),
});

export default function AdminCategories() {
  const { t, isAr } = useLocale();
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAdminCategories()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = data?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm({ resolver: zodResolver(categorySchema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name_en: '', name_ar: '', slug: '', description_en: '', description_ar: '', sort_order: 0 });
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    reset({
      name_en: cat.name_en || '',
      name_ar: cat.name_ar || '',
      slug: cat.slug || '',
      description_en: cat.description_en || '',
      description_ar: cat.description_ar || '',
      sort_order: cat.sort_order ?? 0,
    });
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (editing) {
        await updateCategory(editing.id, formData);
        toast(t('admin:categories.updated'), 'success');
      } else {
        await createCategory(formData);
        toast(t('admin:categories.created'), 'success');
      }
      setModalOpen(false);
      setReload((v) => v + 1);
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.id);
      toast(t('admin:categories.deleted'), 'success');
      setDeleteTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      if (err.status === 409) {
        toast(t('admin:categories.deleteBlocked', { count: err.details?.count || 0 }), 'error');
      } else {
        toast(err.message || t('common:common.error'), 'error');
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: t('admin:categories.nameEn'),
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded overflow-hidden bg-bg-surface-sunken flex-shrink-0">
            {row.image ? (
              <img src={row.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-caption text-bg-text-secondary">—</div>
            )}
          </div>
          <span className="font-medium text-bg-text-primary truncate block">
            {(isAr ? row.name_ar : row.name_en) || row.name_en || row.name_ar || (isAr ? 'بدون اسم' : 'Untitled')}
          </span>
        </div>
      ),
    },
    {
      key: 'productCount',
      label: t('admin:categories.productCount'),
      render: (row) => (
        <span className="text-bg-text-secondary ltr-nums" dir="ltr">{row.product_count ?? 0}</span>
      ),
    },
    {
      key: 'sortOrder',
      label: t('admin:categories.sortOrder'),
      render: (row) => <span className="ltr-nums" dir="ltr">{row.sort_order ?? 0}</span>,
    },
    {
      key: 'actions',
      label: t('admin:common.actions'),
      render: (row) => (
        <div className="flex items-center justify-end gap-4">
          <button onClick={() => openEdit(row)} className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 hover:underline transition-colors">
            {t('admin:common.edit')}
          </button>
          <button onClick={() => setDeleteTarget(row)} className="text-body-sm font-medium text-bg-text-secondary hover:text-bg-error transition-colors">
            {t('admin:common.delete')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h2 font-heading font-bold text-bg-text-primary">{t('admin:categories.title')}</h1>
          <p className="text-body-sm text-bg-text-secondary mt-0.5">
            {isAr ? 'إدارة أقسام المتجر' : 'Manage product categories'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-md bg-bg-primary-500 hover:bg-bg-primary-600 text-white font-semibold transition active:scale-[0.98] shadow-sm"
        >
          <Plus size={18} strokeWidth={2} />
          {t('admin:categories.create')}
        </button>
      </div>

      <DataTable
        columns={columns}
        data={categories}
        isLoading={isLoading}
        emptyMessage={t('admin:common.noResults')}
        emptyAction={{ label: t('admin:categories.create'), onClick: openCreate }}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">
          <h3 className="text-body font-semibold text-bg-text-primary">
            {editing ? t('admin:categories.edit') : t('admin:categories.create')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t('admin:categories.nameEn')} {...register('name_en')} error={errors.name_en?.message} />
            <Input label={t('admin:categories.nameAr')} {...register('name_ar')} error={errors.name_ar?.message} dir="rtl" />
          </div>

          <Input label={t('admin:categories.slug')} {...register('slug')} error={errors.slug?.message} />

          <div>
            <label className="text-body-sm font-medium text-bg-text-primary ps-0.5 block mb-1">
              {t('admin:categories.descriptionEn')}
            </label>
            <textarea
              {...register('description_en')}
              rows={2}
              className="input-base w-full bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/50 resize-y"
            />
          </div>

          <div>
            <label className="text-body-sm font-medium text-bg-text-primary ps-0.5 block mb-1">
              {t('admin:categories.descriptionAr')}
            </label>
            <textarea
              {...register('description_ar')}
              rows={2}
              dir="rtl"
              className="input-base w-full bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/50 resize-y"
            />
          </div>

          <Input
            label={t('admin:categories.sortOrder')}
            type="number"
            {...register('sort_order')}
            error={errors.sort_order?.message}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              {t('admin:common.cancel')}
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              {t('admin:common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('admin:common.confirmDelete')}
        loading={deleting}
      />
    </div>
  );
}
