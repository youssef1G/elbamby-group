import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useCart } from '@/context/CartContext.jsx';
import { createOrder, getSettings } from '@/api.js';
import { formatPrice } from '@/lib/formatters.js';

function Field({ label, error, children, id }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-bg-text-primary mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-bg-error mt-1" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

export default function Checkout() {
  const { t } = useLocale();
  const { items, clearCart } = useCart();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const navigate = useNavigate();
  const phoneRef = useRef();
  const emailRef = useRef();
  const addressRef = useRef();
  const cityRef = useRef();
  const next = (e, ref) => { if (e.key === 'Enter') { e.preventDefault(); ref.current?.focus(); } };

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [shippingFee, setShippingFee] = useState(0);
  const [freeThreshold, setFreeThreshold] = useState(0);
  const [baseShipping, setBaseShipping] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then((data) => {
        const settings = data.data || data;
        const shipping = (Array.isArray(settings) ? settings : [settings]).find((s) => s.key === 'default_shipping_fee');
        const threshold = (Array.isArray(settings) ? settings : [settings]).find((s) => s.key === 'free_shipping_threshold');
        const sVal = shipping ? Math.max(0, Number(shipping.value) || 0) : 50;
        const tVal = threshold ? Math.max(0, Number(threshold.value) || 0) : 0;
        setFreeThreshold(tVal);
        setBaseShipping(sVal);
        setShippingFee(tVal > 0 && subtotal >= tVal ? 0 : sVal);
        setSettingsLoaded(true);
      })
      .catch(() => setSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    setShippingFee(freeThreshold > 0 && subtotal >= freeThreshold ? 0 : baseShipping);
  }, [subtotal, settingsLoaded]);

  const total = subtotal + shippingFee;

  if (items.length === 0)
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h2 className="text-heading-lg text-bg-text-primary mb-3">{t('cart.empty', { ns: 'common' })}</h2>
        <Link to="/shop" className="btn-primary text-sm">{t('nav.shop', { ns: 'common' })}</Link>
      </div>
    );

  const set = (f) => (e) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    if (errors[f]) setErrors((p) => ({ ...p, [f]: '' }));
  };

  const inputCls = (field) =>
    `w-full rounded-xl border px-4 py-3 text-sm font-medium bg-bg-surface text-bg-text-primary focus:outline-none focus:ring-2 focus:ring-bg-primary-500 focus:border-bg-primary-500 transition ${
      errors[field] ? 'border-bg-error' : 'border-bg-border'
    }`;

  function validateForm(data) {
    const e = {};
    if (!data.name.trim() || data.name.trim().length < 2) e.name = t('errors:validation.required');
    if (!/^(010|011|012|015)\d{8}$/.test(data.phone.replace(/\s/g, ''))) e.phone = t('errors:validation.phone');
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = t('errors:validation.email');
    if (!data.address.trim() || data.address.trim().length < 5) e.address = t('errors:validation.required');
    if (!data.city.trim()) e.city = t('errors:validation.required');
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await createOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        customer: form,
        shippingFee,
      });
      clearCart();
      const orderId = res.data?.orderNumber || res.orderNumber || '';
      navigate(`/checkout/success?orderId=${orderId}`);
    } catch (err) {
      setServerError(err.message || t('checkout:errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <motion.nav
        className="flex items-center gap-2 text-xs text-bg-text-secondary mb-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Link to="/cart" className="hover:text-bg-primary-500">{t('nav.cart', { ns: 'common' })}</Link>
        <span>/</span>
        <span className="text-bg-text-primary">{t('nav.checkout', { ns: 'common' })}</span>
      </motion.nav>

      <div className="grid lg:grid-cols-5 gap-10">
        <motion.form
          onSubmit={handleSubmit}
          className="lg:col-span-3 space-y-8"
          noValidate
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
        >
          <div>
            <h2 className="font-heading text-lg font-semibold text-bg-text-primary mb-4">{t('checkout:form.nameLabel')}</h2>
            <div className="space-y-4">
              <Field label={t('checkout:form.nameLabel')} error={errors.name} id="checkout-name">
                <input
                  id="checkout-name"
                  value={form.name}
                  onChange={set('name')}
                  onKeyDown={(e) => next(e, phoneRef)}
                  placeholder={t('checkout:form.nameLabel')}
                  className={inputCls('name')}
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label={t('checkout:form.phoneLabel')} error={errors.phone} id="checkout-phone">
                  <input
                    ref={phoneRef}
                    id="checkout-phone"
                    dir="ltr"
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    onKeyDown={(e) => next(e, emailRef)}
                    placeholder="010xxxxxxxx"
                    className={inputCls('phone')}
                  />
                </Field>
                <Field label={t('checkout:form.emailLabel')} error={errors.email} id="checkout-email">
                  <input
                    id="checkout-email"
                    ref={emailRef}
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    onKeyDown={(e) => next(e, addressRef)}
                    placeholder={t('checkout:form.emailLabel')}
                    className={inputCls('email')}
                  />
                </Field>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-bg-text-primary mb-4">{t('checkout:form.addressLabel')}</h2>
            <div className="space-y-4">
              <Field label={t('checkout:form.addressLabel')} error={errors.address} id="checkout-address">
                <input
                  id="checkout-address"
                  ref={addressRef}
                  type="text"
                  value={form.address}
                  onChange={set('address')}
                  onKeyDown={(e) => next(e, cityRef)}
                  className={inputCls('address')}
                />
              </Field>
              <Field label={t('checkout:form.cityLabel')} error={errors.city} id="checkout-city">
                <input
                  id="checkout-city"
                  ref={cityRef}
                  type="text"
                  value={form.city}
                  onChange={set('city')}
                  placeholder={t('checkout:form.cityLabel')}
                  className={inputCls('city')}
                />
              </Field>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-bg-primary-50 border border-bg-primary-500/10 rounded-2xl px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-bg-text-primary">{t('checkout:form.cod')}</p>
                <p className="text-xs text-bg-text-secondary mt-0.5">{t('checkout:form.codDesc')}</p>
              </div>
            </div>

          {serverError && (
            <p className="text-sm text-bg-error bg-bg-neutral-100 border border-bg-error/20 rounded-xl px-4 py-3">{serverError}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-sm disabled:opacity-50">
            {loading ? t('checkout:form.placingOrder') : t('checkout:form.submit')}
          </button>
        </motion.form>

        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.25, 0.1, 0.25, 1], delay: 0.15 }}
        >
          <div className="sticky top-24 surface-card p-6">
            <h2 className="font-heading text-lg font-semibold text-bg-text-primary mb-4">{t('checkout:summary.subtotal')}</h2>
            <ul className="space-y-3 mb-4">
              {items.map((item) => {
                const name = item.nameEn || '';
                return (
                  <li key={item.productId} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={name}
                      className="w-12 h-12 rounded-xl object-cover border border-bg-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-bg-text-primary truncate">{name}</p>
                      <p className="text-[11px] text-bg-text-secondary">x{item.quantity}</p>
                    </div>
                    <span className="text-xs font-semibold text-bg-text-primary whitespace-nowrap ltr-nums">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-bg-border pt-4 space-y-2">
              <div className="flex justify-between text-xs text-bg-text-secondary">
                <span>{t('checkout:summary.subtotal')}</span>
                <span className="ltr-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-bg-text-secondary">
                <span>{t('checkout:summary.shipping')}</span>
                <span>
                  {settingsLoaded
                    ? shippingFee > 0
                      ? formatPrice(shippingFee)
                      : freeThreshold > 0
                      ? `${t('checkout:summary.free')}`
                      : t('checkout:summary.free')
                    : '...'}
                </span>
              </div>
              {settingsLoaded && freeThreshold > 0 && shippingFee > 0 && (
                <p className="text-[11px] text-amber-600">
                  {t('checkout:summary.freeShippingHint', { amount: formatPrice(freeThreshold - subtotal) })}
                </p>
              )}
              <div className="flex justify-between font-heading text-bg-text-primary pt-2 border-t border-bg-border">
                <span>{t('checkout:summary.total')}</span>
                <span className="font-bold text-lg ltr-nums">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}