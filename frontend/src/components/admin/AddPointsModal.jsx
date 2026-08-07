import { useEffect, useState } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import {
  fetchAdminSettings,
  fetchCustomers,
  createCustomer,
  adjustCustomerPoints,
} from '@/api.js';
import Modal from '@/components/ui/Modal.jsx';
import Input from '@/components/ui/Input.jsx';
import { Search, UserPlus, Sparkles } from 'lucide-react';
import { normalizePhone } from '@/lib/formatters.js';

// normalizePhone() rewrites +20… → 0… first, so the +201 form never reaches
// here (and in [0-2,5] used to let a literal comma pass). Local 11-digit only.
const PHONE_REGEX = /^01[0-25]\d{8}$/;

/**
 * In-store points flow (docs/13-points-system.md §6).
 *
 * - No `initialCustomer` → starts at phone search; not found → inline create.
 * - With `initialCustomer` (opened from the detail page) → starts at the
 *   amount step for that customer.
 * - Grant: admin enters the EGP amount; points = floor(egp × earn rate),
 *   shown as computed confirmation. Deduct: raw points + required note.
 *
 * @param {{ isOpen: boolean, onClose: () => void, initialCustomer?: object|null,
 *           onAdjustApplied: (customer: object) => void }} props
 */
export default function AddPointsModal({ isOpen, onClose, initialCustomer, onAdjustApplied }) {
  const { t } = useLocale();

  const [mode, setMode] = useState('grant');
  const [step, setStep] = useState('search');
  const [customer, setCustomer] = useState(null);
  const [earnRate, setEarnRate] = useState(1);

  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [amount, setAmount] = useState('');
  const [pointsInput, setPointsInput] = useState('');
  const [note, setNote] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode('grant');
      setCustomer(initialCustomer || null);
      setStep(initialCustomer ? 'amount' : 'search');
      setPhone('');
      setNewName('');
      setAmount('');
      setPointsInput('');
      setNote('');
      setSearchError('');
      setCreateError('');
      setSubmitError('');
      setNotFound(false);
      fetchAdminSettings()
        .then((s) => setEarnRate(Number(s?.pointsEarnRate ?? 1)))
        .catch(() => {});
    }
  }, [isOpen, initialCustomer]);

  const autoNote = t('admin:addPoints.notePlaceholder', {
    amount: (mode === 'grant' ? amount : pointsInput).trim() || '—',
  });
  const finalNote = note.trim() || autoNote;

  const computedPoints = Math.floor(Number(amount || 0) * earnRate);

  async function handleSearch() {
    const q = normalizePhone(phone.trim());
    if (!q) {
      setSearchError(t('admin:addPoints.emptySearch'));
      return;
    }
    setSearching(true);
    setSearchError('');
    setNotFound(false);
    try {
      const res = await fetchCustomers({ search: q, limit: 20 });
      // Only accounts (id present) can receive points — order-based customers
      // without an account fall through to the create step (docs/13 §6).
      const match = (res.data || []).find((c) => c.id && c.phone === q);
      if (match) {
        setCustomer(match);
        setStep('amount');
      } else {
        setNotFound(true);
        setStep('create');
      }
    } catch {
      setSearchError(t('common:common.error'));
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate() {
    setCreateError('');
    if (!newName.trim()) {
      setCreateError(t('admin:addPoints.required'));
      return;
    }
    const q = normalizePhone(phone.trim());
    if (!PHONE_REGEX.test(q)) {
      setCreateError(t('admin:addPoints.invalidPhone'));
      return;
    }
    setCreating(true);
    try {
      const created = await createCustomer({ name: newName.trim(), phone: q });
      setCustomer(created);
      setStep('amount');
    } catch (err) {
      setCreateError(
        err.status === 409 ? t('admin:addPoints.duplicatePhone') : t('common:common.error'),
      );
    } finally {
      setCreating(false);
    }
  }

  function handleNext() {
    setSubmitError('');
    if (mode === 'grant') {
      if (!amount || Number(amount) <= 0) {
        setSubmitError(t('admin:addPoints.required'));
        return;
      }
    } else {
      if (!pointsInput || Number(pointsInput) <= 0) {
        setSubmitError(t('admin:addPoints.required'));
        return;
      }
      if (Number(pointsInput) > Number(customer?.pointsBalance ?? 0)) {
        setSubmitError(t('admin:addPoints.deductTooHigh'));
        return;
      }
    }
    setStep('confirm');
  }

  async function handleConfirm() {
    setSubmitError('');
    setSubmitting(true);
    try {
      const payload =
        mode === 'grant'
          ? { direction: 'grant', egp_amount: Number(amount), note: finalNote }
          : { direction: 'deduct', points: Number(pointsInput), note: finalNote };
      const res = await adjustCustomerPoints(customer.id, payload);
      onAdjustApplied(res.customer, mode);
      onClose();
    } catch {
      setSubmitError(t('admin:addPoints.error'));
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = 'ltr-nums';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <h2 className="font-heading text-lg font-bold text-bg-text-primary">
          {t('admin:addPoints.title')}
        </h2>
        <p className="text-body-sm text-bg-text-secondary mt-1 mb-5">
          {t('admin:addPoints.subtitle')}
        </p>

        {!customer && step === 'search' && (
          <div className="space-y-4">
            <Input
              label={t('admin:addPoints.searchLabel')}
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('admin:addPoints.searchPlaceholder')}
              error={searchError}
              className={inputCls}
              maxLength={11}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              className="btn-primary !min-h-0 h-9 px-4 text-body-sm disabled:opacity-50"
            >
              <Search size={15} aria-hidden="true" focusable="false" />
              {searching ? t('admin:common.loading') : t('admin:addPoints.searchBtn')}
            </button>
          </div>
        )}

        {!customer && step === 'create' && (
          <div className="space-y-4">
            {notFound && (
              <p className="text-body-sm text-bg-text-secondary flex items-center gap-2">
                <UserPlus size={15} className="text-bg-primary-500" aria-hidden="true" />
                {t('admin:addPoints.notFound')}
              </p>
            )}
            <Input
              label={t('admin:addPoints.nameLabel')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="—"
              error={createError}
            />
            <Input
              label={t('admin:addPoints.phoneLabel')}
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder={t('admin:addPoints.searchPlaceholder')}
              maxLength={11}
              className={inputCls}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep('search')}
                disabled={creating}
                className="btn-ghost !min-h-0 h-9 px-4 text-body-sm disabled:opacity-50"
              >
                {t('admin:addPoints.back')}
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="btn-primary !min-h-0 h-9 px-4 text-body-sm disabled:opacity-50"
              >
                {creating ? t('admin:common.loading') : t('admin:addPoints.createBtn')}
              </button>
            </div>
          </div>
        )}

        {customer && step !== 'confirm' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-bg-border bg-bg-surface-sunken/40 px-4 py-3">
              <div className="min-w-0">
                <p className="text-body-sm font-semibold text-bg-text-primary truncate">
                  {customer.name}
                </p>
                <p className="text-caption text-bg-text-secondary" dir="ltr">
                  {customer.phone}
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-bg-primary-500/10 px-3 py-1 text-caption font-semibold text-bg-primary-500 whitespace-nowrap"
                dir="ltr"
              >
                <Sparkles size={13} aria-hidden="true" />
                {t('admin:addPoints.currentBalance', {
                  points: Number(customer.pointsBalance ?? 0).toLocaleString('en-US'),
                })}
              </span>
            </div>

            <div className="flex gap-2">
              {[
                { key: 'grant', label: t('admin:addPoints.grantMode') },
                { key: 'deduct', label: t('admin:addPoints.deductMode') },
              ].map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    setSubmitError('');
                  }}
                  className={`!min-h-0 h-9 px-4 text-body-sm rounded-md border transition-colors ${
                    mode === m.key
                      ? 'border-bg-primary-500 text-bg-primary-500 bg-bg-primary-500/10 font-semibold'
                      : 'border-bg-border text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-surface-sunken/50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'grant' ? (
              <Input
                label={t('admin:addPoints.egpAmount')}
                type="number"
                min="0"
                step="0.01"
                dir="ltr"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('admin:addPoints.egpPlaceholder')}
                error={submitError}
                className={inputCls}
              />
            ) : (
              <Input
                label={t('admin:addPoints.pointsToDeduct')}
                type="number"
                min="0"
                step="1"
                dir="ltr"
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                placeholder="0"
                error={submitError}
                className={inputCls}
              />
            )}

            {mode === 'grant' && Number(amount) > 0 && computedPoints > 0 && (
              <p className="text-body-sm text-bg-text-secondary ltr-nums">
                {t('admin:addPoints.computedPoints', {
                  amount: Number(amount).toLocaleString('en-US'),
                  rate: Number(earnRate).toLocaleString('en-US'),
                })}{' '}
                <span className="font-bold text-bg-primary-500" dir="ltr">
                  = {computedPoints.toLocaleString('en-US')} {t('admin:customerDetail.points')}
                </span>
              </p>
            )}

            <Input
              label={t('admin:addPoints.noteLabel')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={autoNote}
              className={inputCls}
            />

            <div className="flex gap-2">
              <button
                onClick={() => setStep(initialCustomer ? 'amount' : 'search')}
                disabled={submitting}
                className="btn-ghost !min-h-0 h-9 px-4 text-body-sm disabled:opacity-50"
              >
                {t('admin:addPoints.back')}
              </button>
              <button
                onClick={handleNext}
                className="btn-primary !min-h-0 h-9 px-4 text-body-sm"
              >
                {t('admin:common.next')}
              </button>
            </div>
          </div>
        )}

        {customer && step === 'confirm' && (
          <div className="space-y-5">
            <div className="rounded-lg border border-bg-primary-500/30 bg-bg-primary-500/5 px-4 py-4">
              <p className="text-body-sm text-bg-text-primary font-medium">
                {mode === 'grant'
                  ? t('admin:addPoints.confirmGrant', {
                      points: computedPoints.toLocaleString('en-US'),
                      amount: Number(amount).toLocaleString('en-US'),
                    })
                  : t('admin:addPoints.confirmDeduct', {
                      points: Number(pointsInput).toLocaleString('en-US'),
                    })}
              </p>
              <p className="text-caption text-bg-text-secondary mt-2">
                {customer.name} · <span dir="ltr">{customer.phone}</span>
              </p>
              {note.trim() && <p className="text-caption text-bg-text-secondary mt-1">{finalNote}</p>}
            </div>

            {submitError && (
              <p className="text-body-sm text-bg-error bg-bg-error/10 border border-bg-error/20 rounded-md px-4 py-3">
                {submitError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setStep('amount')}
                disabled={submitting}
                className="btn-ghost !min-h-0 h-9 px-4 text-body-sm disabled:opacity-50"
              >
                {t('admin:addPoints.back')}
              </button>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="btn-primary !min-h-0 h-9 px-4 text-body-sm disabled:opacity-50"
              >
                {submitting ? t('admin:common.loading') : t('admin:addPoints.confirm')}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
