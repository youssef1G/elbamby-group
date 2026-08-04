import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { FolderTree } from 'lucide-react';
import { fetchAdminCategories, createCategory, updateCategory, deleteCategory } from '@/api.js';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import Skeleton from '@/components/ui/Skeleton.jsx';

const EMPTY_DRAFT = { name_en: '', name_ar: '', slug: '' };

export default function AdminCategories() {
  const { t } = useLocale();
  const { toast } = useToast();

  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading');

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT);

  const [showCreate, setShowCreate] = useState(false);
  const [newDraft, setNewDraft] = useState(EMPTY_DRAFT);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = () => {
    setStatus('loading');
    fetchAdminCategories()
      .then((res) => { setCategories(res?.data || []); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };
  useEffect(() => { load(); }, []);

  function translateError(err) {
    const msg = err?.message || '';
    if (/already exists|duplicate/i.test(msg)) return t('admin:categories.errorExists');
    if (/not found/i.test(msg)) return t('admin:categories.errorNotFound');
    if (/still has products|assigned to this category/i.test(msg)) return t('admin:categories.errorInUse');
    return null;
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDraft.name_en.trim() || !newDraft.name_ar.trim() || !newDraft.slug.trim()) return;
    setCreating(true);
    try {
      const cat = await createCategory({ name_en: newDraft.name_en.trim(), name_ar: newDraft.name_ar.trim(), slug: newDraft.slug.trim() });
      setCategories((prev) => [...prev, cat]);
      toast(t('admin:categories.created'), 'success');
      setNewDraft(EMPTY_DRAFT); setShowCreate(false);
    } catch (err) { toast(translateError(err) || t('common:common.error'), 'error'); }
    finally { setCreating(false); }
  };

  const handleUpdate = async (id) => {
    if (!editDraft.name_en.trim() || !editDraft.name_ar.trim() || !editDraft.slug.trim()) return;
    try {
      const updated = await updateCategory(id, { name_en: editDraft.name_en.trim(), name_ar: editDraft.name_ar.trim(), slug: editDraft.slug.trim() });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      toast(t('admin:categories.updated'), 'success');
    } catch (err) { toast(translateError(err) || t('common:common.error'), 'error'); }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(t('admin:categories.deleteConfirm', { name: cat.nameEn || cat.slug }))) return;
    setDeletingId(cat.id);
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      toast(t('admin:categories.deleted'), 'success');
    } catch (err) {
      if (err.status === 409) { toast(t('admin:categories.deleteBlocked', { count: err.details?.productCount ?? 0 }), 'error'); }
      else { toast(translateError(err) || t('common:common.error'), 'error'); }
    }
    finally { setDeletingId(null); }
  };

  function startEdit(cat) { setEditingId(cat.id); setEditDraft({ name_en: cat.nameEn || '', name_ar: cat.nameAr || '', slug: cat.slug || '' }); }

  const inputCls = 'w-full text-body-sm surface-card py-1.5 px-2.5 text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:border-bg-primary-500';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }}>
        <h2 className="font-heading text-xl font-bold text-bg-text-primary">{t('admin:categories.title')}</h2>
        <p className="text-body-sm text-bg-text-secondary mt-1">{t('admin:categories.subtitle')}</p>
      </motion.div>

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 surface-card">
          <p className="text-body-sm text-bg-text-secondary">{t('errors.generic')}</p>
          <button onClick={load} className="btn-secondary">{t('common:common.retry')}</button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.35 }} className="flex flex-wrap items-center gap-3">
        <div className="flex-1" />
        <p className="text-caption text-bg-text-secondary">{t('admin:categories.count', { count: categories.length })}</p>
        <button onClick={() => { setShowCreate(true); setNewDraft(EMPTY_DRAFT); }} className="btn-primary">{t('admin:categories.addCategory')}</button>
      </motion.div>

      {showCreate && (
        <motion.form onSubmit={handleCreate} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.25 }} className="surface-card p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-1.5">{t('admin:categories.nameEn')}</label>
            <input type="text" value={newDraft.name_en} onChange={(e) => setNewDraft((d) => ({ ...d, name_en: e.target.value }))} placeholder={t('admin:categories.nameEnPlaceholder')} className={inputCls} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-1.5">{t('admin:categories.nameAr')}</label>
            <input type="text" dir="rtl" value={newDraft.name_ar} onChange={(e) => setNewDraft((d) => ({ ...d, name_ar: e.target.value }))} placeholder={t('admin:categories.nameArPlaceholder')} className={inputCls} />
          </div>
          <div className="w-full sm:w-[200px]">
            <label className="block text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary mb-1.5">{t('admin:categories.slug')}</label>
            <input type="text" dir="ltr" value={newDraft.slug} onChange={(e) => setNewDraft((d) => ({ ...d, slug: e.target.value }))} placeholder={t('admin:categories.slugPlaceholder')} className={inputCls} />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={creating || !newDraft.name_en.trim() || !newDraft.name_ar.trim() || !newDraft.slug.trim()} className="btn-primary disabled:opacity-50">
              {creating ? t('admin:categories.creating') : t('admin:common.create')}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-body-sm text-bg-text-secondary hover:text-bg-text-primary px-3 py-2">{t('admin:common.cancel')}</button>
          </div>
        </motion.form>
      )}

      {status === 'loading' ? (
        <div className="overflow-x-auto rounded-lg border border-bg-border bg-bg-surface">
          <table className="w-full text-body-sm">
            <thead className="bg-bg-surface-sunken/50">
              <tr>
                {[t('admin:categories.nameEn'), t('admin:categories.nameAr'), t('admin:categories.slug'), t('admin:categories.productCount'), t('admin:common.actions')].map((label) => (
                  <th key={label} scope="col" className="px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start whitespace-nowrap">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-t border-bg-border">
                  {[32, 32, 24, 10, 16].map((w, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className={`h-4 ${j === 4 ? 'w-16 ms-auto' : `w-${w}`}`} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : categories.length === 0 ? (
        <div className="surface-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bg-primary-500/10 flex items-center justify-center">
            <FolderTree size={28} strokeWidth={1.5} className="text-bg-primary-500" aria-hidden="true" focusable="false" />
          </div>
          <p className="text-body font-medium text-bg-text-primary mb-1">{t('admin:categories.noCategories')}</p>
          <p className="text-caption text-bg-text-secondary mb-4">{t('admin:categories.firstCategory')}</p>
          <button onClick={() => { setShowCreate(true); setNewDraft(EMPTY_DRAFT); }} className="btn-primary">{t('admin:categories.addCategory')}</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-bg-border bg-bg-surface">
          <table className="w-full text-body-sm">
            <thead className="bg-bg-surface-sunken/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start whitespace-nowrap">{t('admin:categories.nameEn')}</th>
                <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start whitespace-nowrap">{t('admin:categories.nameAr')}</th>
                <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start whitespace-nowrap">{t('admin:categories.slug')}</th>
                <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-start whitespace-nowrap">{t('admin:categories.productCount')}</th>
                <th scope="col" className="px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary text-end whitespace-nowrap">{t('admin:common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => {
                const editing = editingId === cat.id;
                return (
                  <motion.tr key={cat.id} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: idx * 0.04 }} className="border-t border-bg-border hover:bg-bg-surface-sunken/30 transition-colors">
                    <td className="px-4 py-3">
                      {editing ? (
                        <input type="text" autoFocus value={editDraft.name_en} onChange={(e) => setEditDraft((d) => ({ ...d, name_en: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(cat.id); if (e.key === 'Escape') setEditingId(null); }} className={inputCls} />
                      ) : <span className="text-body-sm font-medium text-bg-text-primary">{cat.nameEn || '—'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input type="text" dir="rtl" value={editDraft.name_ar} onChange={(e) => setEditDraft((d) => ({ ...d, name_ar: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(cat.id); if (e.key === 'Escape') setEditingId(null); }} className={inputCls} />
                      ) : <span className="text-body-sm text-bg-text-primary">{cat.nameAr || '—'}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {editing ? (
                        <input type="text" dir="ltr" value={editDraft.slug} onChange={(e) => setEditDraft((d) => ({ ...d, slug: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate(cat.id); if (e.key === 'Escape') setEditingId(null); }} className={inputCls} />
                      ) : <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">{cat.slug || '—'}</span>}
                    </td>
                    <td className="px-4 py-3"><span className="text-body-sm text-bg-text-secondary ltr-nums" dir="ltr">{cat.productCount ?? 0}</span></td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">
                      {editing ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleUpdate(cat.id)} className="btn-primary !min-h-0 h-8 px-3 text-caption">{t('admin:common.save')}</button>
                          <button onClick={() => setEditingId(null)} className="text-body-sm text-bg-text-secondary hover:text-bg-text-primary">{t('admin:common.cancel')}</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-4">
                          <button onClick={() => startEdit(cat)} className="text-body-sm font-medium text-bg-primary-500 hover:text-bg-primary-600 hover:underline transition-colors">{t('admin:common.edit')}</button>
                          <button onClick={() => handleDelete(cat)} disabled={deletingId === cat.id} className="text-body-sm text-bg-text-secondary hover:text-bg-error transition-colors disabled:opacity-50">
                            {deletingId === cat.id ? t('admin:categories.deleting') : t('admin:common.delete')}
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}