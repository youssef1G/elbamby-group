import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCustomerAuth } from '@/context/CustomerAuthContext.jsx';
import {
  fetchMyPointsHistory,
  fetchMyOrders,
  updateMyProfile,
  changeMyPassword,
  getSettings,
} from '@/api.js';
import Skeleton from '@/components/ui/Skeleton.jsx';
import EmptyState from '@/components/ui/EmptyState.jsx';
import Button from '@/components/ui/Button.jsx';
import { useToast } from '@/components/ui/Toast.jsx';
import { formatDate } from '@/lib/formatters.js';
import { AUTO_REFRESH_MS } from '@/lib/constants.js';
import { OrderCard } from './MyOrders.jsx';
import { Plus, Minus, LogOut, LayoutGrid, Package, Settings as SettingsIcon } from 'lucide-react';

const TYPE_KEYS = {
  earn: 'admin:customerDetail.typeEarn',
  redeem: 'admin:customerDetail.typeRedeem',
  refund_reversal: 'admin:customerDetail.typeRefundReversal',
  manual_grant: 'admin:customerDetail.typeManualGrant',
  manual_deduct: 'admin:customerDetail.typeManualDeduct',
  signup_bonus: 'admin:customerDetail.typeSignupBonus',
};

const profileSchema = z.object({
  name: z.string().min(1, 'auth:validation.required'),
  email: z.string().email('auth:validation.email').optional().or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'auth:validation.required'),
  newPassword: z.string().min(6, 'auth:validation.passwordMin'),
});

function PointsInfoCard() {
  const { t } = useLocale();
  const [rates, setRates] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((s) => {
        if (!cancelled) setRates(s);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const earnRate = rates ? Number(rates.pointsEarnRate ?? 1) : 1;
  const redeemRate = rates ? Number(rates.pointsRedeemRate ?? 0.1) : 0.1;
  const currency = rates?.currencyCode || rates?.currency || 'EGP';
  const pointsPerEgp = Math.round(1 / Math.max(redeemRate, 0.0001));

  return (
    <div className="surface-card p-6">
      <h2 className="font-heading text-body-sm font-bold text-bg-text-primary mb-3">
        {t('account.pointsInfo.title')}
      </h2>
      <ul className="space-y-2 text-body-sm">
        <li className="flex items-start gap-2 text-bg-text-secondary">
          <Plus size={15} strokeWidth={2.5} className="text-bg-success shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {earnRate === 1
              ? t('account.pointsInfo.earnRateOne', { currency })
              : t('account.pointsInfo.earnRateMany', { points: earnRate, currency })}
          </span>
        </li>
        <li className="flex items-start gap-2 text-bg-text-secondary">
          <Minus size={15} strokeWidth={2.5} className="text-bg-primary-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            {pointsPerEgp === 1
              ? t('account.pointsInfo.redeemRateOne', { currency })
              : t('account.pointsInfo.redeemRateMany', { points: pointsPerEgp, currency })}
          </span>
        </li>
        <li className="flex items-start gap-2 text-bg-text-secondary">
          <span className="w-[15px] shrink-0 mt-0.5 flex justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-bg-primary-500" aria-hidden="true" />
          </span>
          <span>{t('account.pointsInfo.deliveredHint')}</span>
        </li>
        <li className="flex items-start gap-2 text-bg-text-secondary">
          <span className="w-[15px] shrink-0 mt-0.5 flex justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-bg-primary-500" aria-hidden="true" />
          </span>
          <span>{t('account.pointsInfo.redeemHint')}</span>
        </li>
      </ul>
    </div>
  );
}

function ProfileForm({ customer, onSaved }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: customer?.name || '', email: customer?.email || '' },
  });

  const onSubmit = async (data) => {
    setError('');
    try {
      await updateMyProfile({ name: data.name, email: data.email });
      if (onSaved) onSaved();
      toast(t('account.settings.saved'), 'success');
    } catch (err) {
      setError(err.message || t('errors.generic'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
          {t('account.settings.name')}
        </label>
        <input
          type="text"
          {...register('name')}
          autoComplete="name"
          className="input-base w-full px-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
        />
        {errors.name?.message && (
          <p className="text-body-sm text-bg-error mt-1">{t(errors.name.message)}</p>
        )}
      </div>

      <div>
        <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
          {t('account.settings.email')}
        </label>
        <input
          type="email"
          {...register('email')}
          autoComplete="email"
          dir="ltr"
          placeholder="you@example.com"
          className="input-base w-full px-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40 ltr-nums"
        />
        {errors.email?.message && (
          <p className="text-body-sm text-bg-error mt-1">{t(errors.email.message)}</p>
        )}
      </div>

      {error && (
        <p className="text-body-sm text-bg-error bg-bg-error/10 rounded-sm px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" className="h-10 px-5 text-body-sm" loading={isSubmitting} disabled={isSubmitting}>
        {t('account.settings.save')}
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { t } = useLocale();
  const { toast } = useToast();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (data) => {
    setError('');
    try {
      await changeMyPassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
      });
      reset();
      toast(t('account.settings.passwordUpdated'), 'success');
    } catch (err) {
      setError(
        err.code === 'WRONG_PASSWORD'
          ? t('account.settings.wrongPassword')
          : err.message || t('errors.generic')
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
          {t('account.settings.currentPassword')}
        </label>
        <input
          type="password"
          {...register('currentPassword')}
          autoComplete="current-password"
          className="input-base w-full px-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
        />
        {errors.currentPassword?.message && (
          <p className="text-body-sm text-bg-error mt-1">{t(errors.currentPassword.message)}</p>
        )}
      </div>

      <div>
        <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
          {t('account.settings.newPassword')}
        </label>
        <input
          type="password"
          {...register('newPassword')}
          autoComplete="new-password"
          className="input-base w-full px-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40"
        />
        {errors.newPassword?.message && (
          <p className="text-body-sm text-bg-error mt-1">{t(errors.newPassword.message)}</p>
        )}
      </div>

      {error && (
        <p className="text-body-sm text-bg-error bg-bg-error/10 rounded-sm px-3 py-2" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" className="h-10 px-5 text-body-sm" loading={isSubmitting} disabled={isSubmitting}>
        {t('account.settings.save')}
      </Button>
    </form>
  );
}

export default function Account() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { customer, isLoading: authLoading, logout, refreshProfile } = useCustomerAuth();

  // Set right before logout so the `!customer → <Navigate to="/login">` guard
  // doesn't race the imperative navigate('/') and strand the user on /login.
  const [justLoggedOut, setJustLoggedOut] = useState(false);

  const TABS = ['overview', 'orders', 'settings'];
  const tabParam = searchParams.get('tab');
  const [tab, setTab] = useState(() => (TABS.includes(tabParam) ? tabParam : 'overview'));

  // Follow ?tab= from the navbar "My Orders" link without a reload.
  useEffect(() => {
    if (TABS.includes(tabParam)) setTab(tabParam);
  }, [tabParam]);

  const handleTabClick = (key) => {
    setTab(key);
    if (key === 'overview') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: key }, { replace: true });
    }
  };

  const [history, setHistory] = useState(null);
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState(null);
  const [ordersPage, setOrdersPage] = useState(1);

  const loadHistory = useCallback((p) => {
    fetchMyPointsHistory({ page: p, limit: 15 })
      .then(setHistory)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (customer) loadHistory(1);
  }, [customer, loadHistory]);

  // Silent refresh: keeps the ledger live (e.g. after the admin earns points
  // on a delivered order) without reloading the page. Existing rows stay on
  // screen until the new data arrives — no skeleton flicker.
  useEffect(() => {
    if (!customer) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadHistory(page);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [customer, page, loadHistory]);

  const loadOrders = useCallback((p) => {
    fetchMyOrders({ page: p, limit: 5 })
      .then(setOrders)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'orders' && customer) loadOrders(1);
  }, [tab, customer, loadOrders]);

  // Silent refresh: delivery status advances without a reload while the
  // orders tab is open.
  useEffect(() => {
    if (tab !== 'orders' || !customer) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      loadOrders(ordersPage);
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [tab, customer, ordersPage, loadOrders]);

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="surface-card p-6 flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!customer && !justLoggedOut) return <Navigate to="/login" replace />;

  const rows = history?.data || [];
  const meta = history?.meta || {};
  const typeLabel = (type) => t(TYPE_KEYS[type] || 'admin:customerDetail.typeEarn');

  const handleLogout = async () => {
    setJustLoggedOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  const tabs = [
    { key: 'overview', label: t('account.tabs.overview'), icon: LayoutGrid },
    { key: 'orders', label: t('account.tabs.orders'), icon: Package },
    { key: 'settings', label: t('account.tabs.settings'), icon: SettingsIcon },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto px-5 sm:px-8 py-10 sm:py-14 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-h2 font-bold tracking-tight text-bg-text-primary">
          {t('common.nav.account')}
        </h1>
        <button onClick={handleLogout} className="btn-secondary !min-h-0 h-10 px-4 text-body-sm">
          <LogOut size={15} className="rtl:-scale-x-100" aria-hidden="true" focusable="false" />
          {t('account.logout')}
        </button>
      </div>

      <div
        role="tablist"
        aria-label={t('common.nav.account')}
        className="flex items-center gap-1 rounded-full border border-bg-border bg-bg-surface p-1 overflow-x-auto"
      >
        {tabs.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => handleTabClick(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-body-sm font-semibold whitespace-nowrap transition-colors ${
                active
                  ? 'bg-bg-primary-500 text-white'
                  : 'text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-border/40'
              }`}
            >
              <Icon size={15} aria-hidden="true" focusable="false" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="surface-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-14 w-14 rounded-full bg-bg-primary-500/10 flex items-center justify-center shrink-0">
                  <span className="font-heading text-lg font-bold text-bg-primary-500">
                    {(customer.name || '?').trim().charAt(0)}
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="font-heading text-xl font-bold text-bg-text-primary truncate">{customer.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-bg-text-secondary mt-0.5">
                    <span dir="ltr" className="ltr-nums">{customer.phone}</span>
                    {customer.email && <span dir="ltr">{customer.email}</span>}
                    {customer.createdAt && (
                      <span>{t('account.memberSince', { date: formatDate(customer.createdAt) })}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-end">
                <p className="text-caption text-bg-text-secondary">{t('account.pointsBalance')}</p>
                <p
                  className="font-heading text-2xl font-bold text-bg-primary-500 ltr-nums leading-tight"
                  dir="ltr"
                >
                  {Number(customer.pointsBalance ?? 0).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>

          <PointsInfoCard />

          <div>
            <h2 className="font-heading text-body-sm font-bold text-bg-text-primary mb-3">
              {t('account.history')}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-bg-border bg-bg-surface">
              <table className="w-full">
                <thead className="bg-bg-surface-sunken/50">
                  <tr>
                    {[
                      { key: 'date', label: t('admin:customerDetail.date') },
                      { key: 'type', label: t('admin:customerDetail.type') },
                      { key: 'points', label: t('admin:customerDetail.points') },
                      { key: 'balanceAfter', label: t('admin:customerDetail.balanceAfter') },
                      { key: 'note', label: t('admin:customerDetail.note'), responsive: 'hidden md:table-cell' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={`px-4 py-3 text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary whitespace-nowrap text-start ${col.responsive || ''}`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!history ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-t border-bg-border">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full max-w-[100px]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState message={t('account.noHistory')} />
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="border-t border-bg-border hover:bg-bg-surface-sunken/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                            {formatDate(r.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-caption text-bg-text-primary">{typeLabel(r.type)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-0.5 text-caption font-bold ltr-nums ${
                              r.points > 0 ? 'text-bg-success' : 'text-bg-error'
                            }`}
                            dir="ltr"
                          >
                            {r.points > 0 ? (
                              <Plus size={12} strokeWidth={2.5} aria-hidden="true" />
                            ) : (
                              <Minus size={12} strokeWidth={2.5} aria-hidden="true" />
                            )}
                            {Math.abs(r.points).toLocaleString('en-US')}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-caption text-bg-text-secondary ltr-nums" dir="ltr">
                            {Number(r.balanceAfter ?? 0).toLocaleString('en-US')}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-caption text-bg-text-secondary max-w-[280px] block truncate">
                            {r.note || '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {meta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    loadHistory(page - 1);
                  }}
                  className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
                >
                  {t('admin:common.prev')}
                </button>
                <span className="text-body-sm text-bg-text-secondary">
                  {t('admin:common.page')} {meta.page} {t('admin:common.of')} {meta.totalPages}
                </span>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    loadHistory(page + 1);
                  }}
                  className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
                >
                  {t('admin:common.next')}
                </button>
              </div>
            )}

            <p className="text-center mt-6">
              <Link to="/shop" className="text-body-sm font-semibold text-bg-primary-500 hover:text-bg-primary-600 transition-colors">
                {t('account.continueShopping')}
              </Link>
            </p>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-4">
          {!orders ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-lg" />
            ))
          ) : orders.data.length === 0 ? (
            <div className="surface-card p-4">
              <EmptyState
                message={t('account.orders.emptyHint')}
                action={{ label: t('nav.shop', { ns: 'common' }), onClick: () => navigate('/shop') }}
              />
            </div>
          ) : (
            <>
              {orders.data.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onRefresh={() => loadOrders(ordersPage)}
                />
              ))}
              {orders.meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    disabled={ordersPage <= 1}
                    onClick={() => {
                      setOrdersPage((p) => p - 1);
                      loadOrders(ordersPage - 1);
                    }}
                    className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
                  >
                    {t('admin:common.prev')}
                  </button>
                  <span className="text-body-sm text-bg-text-secondary">
                    {t('admin:common.page')} {orders.meta.page} {t('admin:common.of')} {orders.meta.totalPages}
                  </span>
                  <button
                    disabled={ordersPage >= orders.meta.totalPages}
                    onClick={() => {
                      setOrdersPage((p) => p + 1);
                      loadOrders(ordersPage + 1);
                    }}
                    className="btn-ghost !min-h-0 h-8 px-3 text-body-sm disabled:opacity-30"
                  >
                    {t('admin:common.next')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <div className="surface-card p-6 space-y-4">
            <h2 className="font-heading text-body-sm font-bold text-bg-text-primary">
              {t('account.settings.profileTitle')}
            </h2>
            <ProfileForm
              customer={customer}
              onSaved={() => refreshProfile()}
            />
          </div>
          <div className="surface-card p-6 space-y-4">
            <h2 className="font-heading text-body-sm font-bold text-bg-text-primary">
              {t('account.settings.passwordTitle')}
            </h2>
            <PasswordForm />
          </div>
        </div>
      )}
    </motion.div>
  );
}
