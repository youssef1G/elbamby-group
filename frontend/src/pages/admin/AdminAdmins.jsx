import { useState, useEffect } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { Plus, Pencil } from 'lucide-react';
import { fetchAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api.js';
import { useAuth } from '@/context/AuthContext.jsx';
import DataTable from '@/components/admin/DataTable.jsx';
import ConfirmDialog from '@/components/admin/ConfirmDialog.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import Select from '@/components/ui/Select.jsx';
import Button from '@/components/ui/Button.jsx';
import Badge from '@/components/ui/Badge.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDate } from '@/lib/formatters.js';

const adminSchema = z.object({
  username: z.string().min(3, 'Min 3 chars'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Min 6 chars').optional().or(z.literal('')),
  role: z.string().min(1, 'Required'),
});

export default function AdminAdmins() {
  const { t } = useLocale();
  const { toast } = useToast();
  const { admin: currentAdmin } = useAuth();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchAdmins()
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const admins = data?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({ resolver: zodResolver(adminSchema) });
  const role = watch('role');

  const openCreate = () => {
    setEditing(null);
    reset({ username: '', email: '', password: '', role: 'admin' });
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    reset({ username: a.username || '', email: a.email || '', password: '', role: a.role || 'admin' });
    setModalOpen(true);
  };

  const onSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const payload = { ...formData };
      if (editing && !payload.password) delete payload.password;
      if (editing) {
        await updateAdmin(editing.id, payload);
        toast(t('admin:admins.updated'), 'success');
      } else {
        await createAdmin(payload);
        toast(t('admin:admins.created'), 'success');
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
      await deleteAdmin(deleteTarget.id);
      toast(t('admin:admins.deleted'), 'success');
      setDeleteTarget(null);
      setReload((v) => v + 1);
    } catch (err) {
      if (err.status === 403) {
        toast(t('admin:admins.cannotDeleteSelf'), 'error');
      } else if (err.status === 409) {
        toast(t('admin:admins.cannotDeleteLastSuper'), 'error');
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
      key: 'username',
      label: t('admin:admins.username'),
      render: (row) => (
        <span className="font-medium text-bg-text-primary">
          {row.username}
          {row.id === currentAdmin?.id && <span className="text-caption text-bg-text-secondary ms-2">(you)</span>}
        </span>
      ),
    },
    {
      key: 'email',
      label: t('admin:admins.email'),
      render: (row) => <span className="text-bg-text-secondary">{row.email || '—'}</span>,
    },
    {
      key: 'role',
      label: t('admin:admins.role'),
      render: (row) => (
        <Badge variant={row.role === 'super_admin' ? 'featured' : 'info'}>
          {row.role === 'super_admin' ? 'Super Admin' : 'Admin'}
        </Badge>
      ),
    },
    {
      key: 'lastLogin',
      label: t('admin:admins.lastLogin'),
      render: (row) => (
        <span className="text-body-sm text-bg-text-secondary ltr-nums" dir="ltr">
          {row.last_login ? formatDate(row.last_login) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('admin:common.actions'),
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(row)}
            className="btn-ghost !min-h-0 h-8 w-8 flex items-center justify-center text-bg-text-secondary hover:text-bg-text-primary"
          >
            <Pencil size={14} />
          </button>
          {row.id !== currentAdmin?.id && (
            <button
              onClick={() => setDeleteTarget(row)}
              className="btn-ghost !min-h-0 h-8 w-8 flex items-center justify-center text-bg-text-secondary hover:text-bg-error"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h2 font-semibold text-bg-text-primary">{t('admin:admins.title')}</h1>
        <Button onClick={openCreate}>
          <Plus size={16} />
          {t('admin:admins.create')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={admins}
        isLoading={isLoading}
        emptyMessage={t('admin:common.noResults')}
        emptyAction={{ label: t('admin:admins.create'), onClick: openCreate }}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="p-6 space-y-4">
          <h3 className="text-body font-semibold text-bg-text-primary">
            {editing ? t('admin:admins.edit') : t('admin:admins.create')}
          </h3>

          <Input label={t('admin:admins.username')} {...register('username')} error={errors.username?.message} />
          <Input label={t('admin:admins.email')} {...register('email')} error={errors.email?.message} type="email" />

          <Input
            label={editing ? `${t('admin:admins.password')} (leave blank to keep)` : t('admin:admins.password')}
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />

          <div>
            <label className="text-body-sm font-medium text-bg-text-primary ps-0.5 block mb-1">
              {t('admin:admins.role')}
            </label>
            <Select
              value={role}
              onChange={(v) => setValue('role', v, { shouldValidate: true })}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'super_admin', label: 'Super Admin' },
              ]}
            />
            {errors.role && <p className="text-body-sm text-bg-error mt-1">{errors.role.message}</p>}
          </div>

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
        title={t('admin:admins.deleteConfirm')}
        loading={deleting}
      />
    </div>
  );
}
