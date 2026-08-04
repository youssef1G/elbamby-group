import { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { fetchAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api.js';
import { formatDate } from '@/lib/formatters.js';
import Skeleton from '@/components/ui/Skeleton.jsx';

export default function AdminManage() {
  const { t } = useLocale();
  const { toast } = useToast();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [changingPasswordId, setChangingPasswordId] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const newPasswordRef = useRef();

  useEffect(() => {
    fetchAdmins()
      .then((res) => setAdmins(res?.data || []))
      .catch(() => toast(t('common:common.error'), 'error'))
      .finally(() => setLoading(false));
  }, []);

  const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v.trim());

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError('');
    if (newUsername.trim().length < 3) { setCreateError(t('admin:manage.usernameError')); return; }
    if (!emailOk(newEmail)) { setCreateError(t('admin:manage.emailError')); return; }
    if (newPassword.length < 8) { setCreateError(t('admin:manage.passwordError')); return; }
    setCreating(true);
    try {
      const admin = await createAdmin({ username: newUsername.trim(), email: newEmail.trim(), password: newPassword });
      setAdmins((prev) => [...prev, admin]);
      toast(t('admin:manage.created'), 'success');
      setNewUsername(''); setNewEmail(''); setNewPassword('');
    } catch (err) { setCreateError(err.message || t('admin:manage.createError')); }
    finally { setCreating(false); }
  }

  async function handleDelete(id) {
    try {
      await deleteAdmin(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      setConfirmDeleteId(null);
      toast(t('admin:manage.deleted'), 'success');
    } catch (err) {
      toast(err.message || t('common:common.error'), 'error');
      setConfirmDeleteId(null);
    }
  }

  async function handleChangePassword(id) {
    setPwError('');
    if (newPw.length < 8) { setPwError(t('admin:manage.passwordError')); return; }
    setPwSaving(true);
    try {
      const updated = await updateAdmin(id, { password: newPw });
      setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
      setPwSuccess(true);
      toast(t('admin:manage.passwordChanged'), 'success');
      setTimeout(() => { setChangingPasswordId(null); setPwSuccess(false); setNewPw(''); }, 1500);
    } catch (err) { setPwError(err.message || t('admin:manage.changeError')); }
    finally { setPwSaving(false); }
  }

  const inputCls =
    'w-full rounded-xl border border-bg-border px-4 py-3 text-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-bg-primary-500/40 transition-colors';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-2xl"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
      >
        <h2 className="font-heading text-lg font-bold text-bg-text-primary mb-4">{t('admin:manage.addAdmin')}</h2>
        <form onSubmit={handleCreate} className="surface-card p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-bg-text-primary mb-1.5">{t('admin:manage.username')}</label>
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); newPasswordRef.current?.focus(); } }}
                placeholder={t('admin:manage.usernamePlaceholder')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-bg-text-primary mb-1.5">{t('admin:manage.email')}</label>
              <input type="email" dir="ltr" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder={t('admin:manage.emailPlaceholder')} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-bg-text-primary mb-1.5">{t('admin:manage.password')}</label>
            <input ref={newPasswordRef} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('admin:manage.passwordPlaceholder')} className={inputCls} />
          </div>
          {createError && <p className="text-xs text-bg-error">{createError}</p>}
          <button type="submit" disabled={creating} className="btn-primary text-sm disabled:opacity-50">
            {creating ? t('admin:manage.creating') : t('admin:manage.add')}
          </button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <h2 className="font-heading text-lg font-bold text-bg-text-primary mb-4">{t('admin:manage.existing')}</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface-card p-4 flex items-center gap-3">
                <Skeleton shape="circle" className="w-9 h-9" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-bg-text-secondary">{t('admin:manage.noAdmins')}</p>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="space-y-3"
          >
            {admins.map((admin, idx) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.06 }}
                className="surface-card p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-bg-primary-500/10 flex items-center justify-center text-bg-primary-500 font-bold text-sm">
                      {(admin.username || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-bg-text-primary">{admin.username}</p>
                      <p className="text-[11px] text-bg-text-secondary">{formatDate(admin.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setChangingPasswordId(changingPasswordId === admin.id ? null : admin.id); setPwError(''); setNewPw(''); setPwSuccess(false); }}
                      className="text-[11px] font-medium text-bg-primary-500 border border-bg-primary-500/30 rounded-full px-3 py-1 hover:bg-bg-primary-500/10 transition-colors">
                      {t('admin:manage.changePassword')}
                    </button>
                    {confirmDeleteId === admin.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(admin.id)} className="text-[11px] text-white bg-bg-error hover:bg-bg-error/90 rounded-full px-3 py-1 transition-colors">{t('admin:manage.confirm')}</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="text-[11px] text-bg-text-secondary border border-bg-border rounded-full px-3 py-1 hover:bg-bg-surface-sunken transition-colors">{t('admin:common.cancel')}</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(admin.id)} className="text-[11px] text-bg-text-secondary border border-bg-border rounded-full px-3 py-1 hover:text-bg-error transition-colors">{t('admin:manage.remove')}</button>
                    )}
                  </div>
                </div>
                {changingPasswordId === admin.id && (
                  <div className="mt-3 pt-3 border-t border-bg-border space-y-3">
                    <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                      placeholder={t('admin:manage.newPasswordPlaceholder')} className={inputCls} />
                    {pwError && <p className="text-xs text-bg-error">{pwError}</p>}
                    {pwSuccess && <p className="text-xs text-bg-success">{t('admin:manage.passwordChanged')}</p>}
                    <button onClick={() => handleChangePassword(admin.id)} disabled={pwSaving} className="btn-primary text-xs disabled:opacity-50">
                      {pwSaving ? t('admin:orders.saving') : t('admin:manage.savePassword')}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}