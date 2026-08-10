import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useLocale } from "@/context/LocaleContext.jsx";
import { useCart } from "@/context/CartContext.jsx";
import { useCustomerAuth } from "@/context/CustomerAuthContext.jsx";
import { createOrder, getSettings } from "@/api.js";
import { formatPrice } from "@/lib/formatters.js";
import { checkoutSchema } from "@/schemas/checkout.schema.js";
import { DEFAULT_SHIPPING_FEE } from "@/lib/constants.js";
import SEO from "@/components/common/SEO.jsx";
import { Banknote } from "lucide-react";
import Input from "@/components/ui/Input.jsx";

export default function Checkout() {
  const { t, isAr } = useLocale();
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const { customer, isLoading: customerAuthLoading } = useCustomerAuth();
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customer_name: "",
      phone: "",
      email: "",
      address_line: "",
      city: "",
      notes: "",
    },
  });

  // Logged-in customers shouldn't re-type what we already have: prefill the
  // contact fields from the account profile the moment it arrives. Only empty
  // fields get filled — anything the customer already typed is left alone.
  useEffect(() => {
    if (!customer) return;
    reset((prev) => ({
      ...prev,
      customer_name: prev.customer_name || customer.name || "",
      phone: prev.phone || customer.phone || "",
      email: prev.email || customer.email || "",
    }));
  }, [customer, reset]);

  // zodResolver stores the schema's (English) message strings on
  // errors.<field>.message; those are validated-side artifacts, so they're
  // mapped to i18n keys before rendering instead of leaking English into the
  // Arabic UI. Any message without a mapping falls through verbatim.
  const CHECKOUT_VALIDATION_KEYS = {
    "Name is required": "checkout:validation.name",
    "Invalid Egyptian phone number": "checkout:validation.phone",
    "Invalid email": "checkout:validation.email",
    "Address is required": "checkout:validation.address",
    "City is required": "checkout:validation.city",
  };
  const errMsg = (field) => {
    const msg = errors[field]?.message;
    if (!msg) return undefined;
    const key = CHECKOUT_VALIDATION_KEYS[msg];
    return key ? t(key) : msg;
  };

  const [settings, setSettings] = useState(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSettings()
      .then((res) => {
        if (cancelled) return;
        const s = res?.data || res || null;
        setSettings(s);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shippingFee = settings?.defaultShippingFee ?? DEFAULT_SHIPPING_FEE;
  const freeThreshold = settings?.freeShippingThreshold ?? null;
  const shipping =
    freeThreshold && subtotal >= Number(freeThreshold)
      ? 0
      : Number(shippingFee);
  const total = subtotal + shipping;

  // ── points redemption (docs/13 §7.4) ─────────────────────────────────────
  // Mirrors the server-side math in submitOrder exactly, so the previewed
  // total matches what the order will actually cost.
  const [redeemInput, setRedeemInput] = useState(0);
  const redeemRate = settings?.pointsRedeemRate ?? null;
  const balance = Number(customer?.pointsBalance ?? 0);

  const rawRedeem = Math.max(0, Math.floor(Number(redeemInput) || 0));
  const clampedRedeem = Math.min(rawRedeem, balance);
  let pointsDiscountEgp = 0;
  let effectiveRedeem = 0;
  if (clampedRedeem > 0 && redeemRate != null && redeemRate > 0) {
    pointsDiscountEgp = Math.round(clampedRedeem * redeemRate * 100) / 100;
    effectiveRedeem = clampedRedeem;
    if (pointsDiscountEgp > total && total > 0) {
      const pointsNeeded = Math.ceil(total / redeemRate);
      effectiveRedeem = Math.min(clampedRedeem, pointsNeeded);
      pointsDiscountEgp = total;
    }
  }
  const totalAfterDiscount = Math.max(0, total - pointsDiscountEgp);

  // Enter moves to the next field instead of submitting mid-form; only the
  // last field's Enter triggers a real submit (and its validation).
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    const inputs = Array.from(
      e.currentTarget.form?.querySelectorAll("input") ?? [],
    );
    const next = inputs[inputs.indexOf(e.currentTarget) + 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  };

  const onSubmit = async (data) => {
    try {
      const res = await createOrder({
        items: items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
        })),
        customer_name: data.customer_name,
        phone: data.phone,
        email: data.email || undefined,
        address_line: data.address_line,
        city: data.city,
        notes: data.notes || undefined,
        points_to_redeem: customer ? effectiveRedeem : undefined,
      });
      clearCart();
      const order = res?.data || res || {};
      const orderId = order.orderNumber || "";
      const redeemed = Number(order.pointsRedeemed || 0);
      const discountEgp = Number(order.pointsDiscountEgp || 0);
      const earnRate = Number(settings?.pointsEarnRate ?? 0);
      const earnEstimate =
        earnRate > 0 ? Math.floor(Number(order.total ?? 0) * earnRate) : 0;
      const qs = new URLSearchParams({ orderId, phone: data.phone });
      if (redeemed > 0) qs.set("redeemed", String(redeemed));
      if (discountEgp > 0) qs.set("discount", String(discountEgp));
      if (earnEstimate > 0) qs.set("earn", String(earnEstimate));
      navigate(`/checkout/success?${qs.toString()}`);
    } catch (err) {
      if (err.code === "STOCK_CONFLICT" && err.items?.length) {
        const lines = err.items.map((item) => {
          const found = items.find((i) => i.productId === item.productId);
          const name = found
            ? isAr
              ? found.nameAr || found.nameEn
              : found.nameEn || found.nameAr
            : item.productId;
          return t("checkout:errors.stockConflictItem", {
            name,
            available: item.available,
            requested: item.requested,
          });
        });
        setError("root.stockConflict", {
          message: `${t("checkout:errors.stockConflict")}\n${lines.join("\n")}`,
        });
      } else if (err.code === "INSUFFICIENT_POINTS") {
        setError("root.serverError", {
          message: t("checkout:errors.insufficientPoints"),
        });
      } else if (err.code === "REDEMPTION_DISABLED") {
        setError("root.serverError", {
          message: t("checkout:errors.redemptionDisabled"),
        });
      } else if (err.code === "INVALID_REDEMPTION") {
        setError("root.serverError", {
          message: t("checkout:errors.redemptionRequiresLogin"),
        });
      } else {
        setError("root.serverError", {
          message: err.message || t("checkout:errors.generic"),
        });
      }
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-5 py-24 text-center">
        <h2 className="text-heading-lg text-bg-text-primary mb-3">
          {t("cart.empty")}
        </h2>
        <Link to="/shop" className="btn-primary text-sm">
          {t("nav.shop")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <SEO titleKey="nav.checkout" />

      <motion.nav
        className="flex items-center gap-2 text-xs text-bg-text-secondary mb-8"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Link to="/cart" className="hover:text-bg-primary-500">
          {t("nav.cart")}
        </Link>
        <span>/</span>
        <span className="text-bg-text-primary">{t("nav.checkout")}</span>
      </motion.nav>

      <div className="grid lg:grid-cols-5 gap-10">
        <motion.form
          id="checkout-form"
          onSubmit={handleSubmit(onSubmit)}
          className="lg:col-span-3 space-y-8"
          noValidate
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.55,
            ease: [0.25, 0.1, 0.25, 1],
            delay: 0.1,
          }}
        >
          <div>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold text-bg-text-primary">
                {t("checkout:form.nameLabel")}
              </h2>
              {customer && (
                <p className="text-[11px] text-bg-text-secondary">
                  {t("checkout:form.autofilled")}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <Input
                label={t("checkout:form.nameLabel")}
                {...register("customer_name")}
                onKeyDown={handleKeyDown}
                error={errMsg("customer_name")}
                id="checkout-name"
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label={t("checkout:form.phoneLabel")}
                  {...register("phone")}
                  onKeyDown={handleKeyDown}
                  error={errMsg("phone")}
                  id="checkout-phone"
                  dir="ltr"
                  placeholder="010xxxxxxxx"
                />
              </div>
              <Input
                label={t("checkout:form.emailLabel")}
                {...register("email")}
                onKeyDown={handleKeyDown}
                error={errMsg("email")}
                id="checkout-email"
                type="email"
              />
            </div>
          </div>

          <div>
            <h2 className="font-heading text-lg font-semibold text-bg-text-primary mb-4">
              {t("checkout:form.addressLabel")}
            </h2>
            <div className="space-y-4">
              <Input
                label={t("checkout:form.addressLabel")}
                {...register("address_line")}
                onKeyDown={handleKeyDown}
                error={errMsg("address_line")}
                id="checkout-address"
              />
              <Input
                label={t("checkout:form.cityLabel")}
                {...register("city")}
                onKeyDown={handleKeyDown}
                error={errMsg("city")}
                id="checkout-city"
              />
              <Input
                label={t("checkout:form.notesLabel")}
                {...register("notes")}
                error={errors.notes?.message}
                id="checkout-notes"
                placeholder={t("checkout:form.notesLabel")}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 bg-bg-primary-500/10 border border-bg-primary-500/30 rounded-2xl px-5 py-4">
            <Banknote
              size={20}
              strokeWidth={1.5}
              className="shrink-0 text-bg-primary-500 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-bg-text-primary">
                {t("checkout:form.cod")}
              </p>
              <p className="text-xs text-bg-text-secondary mt-0.5">
                {t("checkout:form.codDesc")}
              </p>
            </div>
          </div>

          {errors.root?.serverError && (
            <p className="text-sm text-bg-error bg-bg-neutral-100 border border-bg-error/20 rounded-xl px-4 py-3">
              {errors.root.serverError.message}
            </p>
          )}
          {errors.root?.stockConflict && (
            <p className="text-sm text-bg-error bg-bg-neutral-100 border border-bg-error/20 rounded-xl px-4 py-3">
              {errors.root.stockConflict.message}
            </p>
          )}
        </motion.form>

        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.55,
            ease: [0.25, 0.1, 0.25, 1],
            delay: 0.15,
          }}
        >
          {!customerAuthLoading && customer && (
            <div className="surface-card p-6 mb-6">
              <h2 className="font-heading text-lg font-semibold text-bg-text-primary mb-1">
                {t("checkout:redeem.title")}
              </h2>
              <p className="text-xs text-bg-text-secondary mb-4">
                {t("checkout:redeem.balance", {
                  points: balance.toLocaleString("en-US"),
                })}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={balance}
                  step={1}
                  value={redeemInput}
                  onChange={(e) => setRedeemInput(e.target.value)}
                  disabled={redeemRate == null}
                  aria-label={t("checkout:redeem.label")}
                  dir="ltr"
                  className="input-base h-10 w-full text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40 ltr-nums disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setRedeemInput(balance)}
                  disabled={redeemRate == null}
                  className="btn-secondary !min-h-0 h-10 px-3 text-body-sm shrink-0 disabled:opacity-50"
                >
                  {t("checkout:redeem.useAll")}
                </button>
              </div>
              <p className="text-[11px] text-bg-text-secondary mt-2">
                {redeemRate != null
                  ? t("checkout:redeem.rateHint", {
                      rate: formatPrice(redeemRate),
                    })
                  : t("checkout:redeem.unavailable")}
              </p>
            </div>
          )}

          <div className="sticky top-24 surface-card p-6">
            <h2 className="font-heading text-lg font-semibold text-bg-text-primary mb-4">
              {t("checkout:summary.subtotal")}
            </h2>
            <ul className="space-y-3 mb-4">
              {items.map((item) => {
                const name = isAr ? item.nameAr || item.nameEn : item.nameEn;
                return (
                  <li key={item.productId} className="flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={name || ""}
                      className="w-12 h-12 rounded-xl object-cover border border-bg-border shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-bg-text-primary truncate">
                        {name}
                      </p>
                      <p className="text-[11px] text-bg-text-secondary">
                        x{item.quantity}
                      </p>
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
                <span>{t("checkout:summary.subtotal")}</span>
                <span className="ltr-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-bg-text-secondary">
                <span>{t("checkout:summary.shipping")}</span>
                <span>
                  {settingsLoaded
                    ? shipping > 0
                      ? formatPrice(shipping)
                      : t("checkout:summary.free")
                    : "..."}
                </span>
              </div>
              {settingsLoaded && freeThreshold && shipping > 0 && (
                <p className="text-[11px] text-bg-warning">
                  {t("checkout:summary.freeShippingHint", {
                    amount: formatPrice(freeThreshold - subtotal),
                  })}
                </p>
              )}
              {pointsDiscountEgp > 0 && (
                <div className="flex justify-between text-xs text-bg-success">
                  <span>{t("checkout:redeem.discount")}</span>
                  <span className="ltr-nums">
                    −{formatPrice(pointsDiscountEgp)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-heading text-bg-text-primary pt-2 border-t border-bg-border">
                <span>{t("checkout:summary.total")}</span>
                <span className="font-bold text-lg ltr-nums">
                  {formatPrice(totalAfterDiscount)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 text-sm disabled:opacity-50 mt-5"
            >
              {isSubmitting
                ? t("checkout:form.placingOrder")
                : t("checkout:form.submit")}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
