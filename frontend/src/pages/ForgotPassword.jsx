import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { User, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useLocale } from "@/context/LocaleContext.jsx";
import { useCustomerAuth } from "@/context/CustomerAuthContext.jsx";
import { normalizePhone } from "@/lib/formatters.js";
import {
  requestPasswordReset,
  verifyPasswordResetCode,
  resetPassword,
} from "@/api.js";
import Button from "@/components/ui/Button.jsx";
import PasswordInput from "@/components/ui/PasswordInput.jsx";
import SEO from "@/components/common/SEO.jsx";

const phoneRegex = /^01[0-25]\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Accepts an Egyptian phone (any dial form) or an email — mirrors the
// server-side identifierField transform.
const normalizeIdentifier = (value) => {
  const cleaned = String(value ?? "").replace(/\s+/g, "");
  if (cleaned.startsWith("+20")) return normalizePhone(cleaned);
  return cleaned;
};

const identifierSchema = z
  .string()
  .trim()
  .transform(normalizeIdentifier)
  .refine(
    (v) => phoneRegex.test(v) || emailRegex.test(v),
    "auth:forgot.invalidIdentifier",
  );

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

function mapError(err, t) {
  if (err.code === "INVALID_CODE") return t("auth:forgot.invalidCode");
  if (err.code === "CODE_LOCKED") return t("auth:forgot.codeLocked");
  if (err.code === "RATE_LIMITED") return t("auth:errors.rateLimited");
  if (err.code === "VALIDATION_ERROR") return t("auth:errors.validationFailed");
  return err.message || t("errors.generic");
}

function StepProgress({ current }) {
  // current: 0 | 1 | 2 — segments before it are done, current pulses.
  return (
    <div
      className="flex items-center gap-2 mb-8"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={3}
      aria-valuenow={current + 1}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex-1 h-1 rounded-full bg-bg-border overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-bg-primary-500"
            initial={false}
            animate={{ width: i < current ? "100%" : i === current ? "50%" : "0%" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      ))}
    </div>
  );
}

function StepHeader({ title, subtitle }) {
  return (
    <div className="text-center mb-6">
      <h1 className="font-heading text-h2 font-bold tracking-tight text-bg-text-primary">
        {title}
      </h1>
      <p className="text-caption text-bg-text-secondary mt-2 max-w-xs mx-auto">
        {subtitle}
      </p>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-body-sm text-bg-error bg-bg-error/10 rounded-sm px-3 py-2"
      role="alert"
    >
      {message}
    </motion.p>
  );
}

function IdentifierStep({ onSent }) {
  const { t } = useLocale();
  const [error, setError] = useState("");

  const schema = z.object({ identifier: identifierSchema });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ identifier }) => {
    setError("");
    try {
      const res = await requestPasswordReset(identifier);
      onSent(identifier, res?.maskedEmail || null);
    } catch (err) {
      setError(mapError(err, t));
    }
  };

  return (
    <>
      <StepHeader
        title={t("auth:forgot.title")}
        subtitle={t("auth:forgot.identifierSubtitle")}
      />
      <div className="surface-card p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
              {t("auth:forgot.identifier")}
            </label>
            <div className="relative">
              <User
                size={14}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
              />
              <input
                type="text"
                {...register("identifier")}
                onKeyDown={handleKeyDown}
                autoComplete="username"
                dir="ltr"
                placeholder="010xxxxxxxx / you@email.com"
                className="input-base w-full ps-9 pe-3 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40 ltr-nums"
              />
            </div>
            {errors.identifier?.message && (
              <p className="text-body-sm text-bg-error mt-1">
                {t(errors.identifier.message)}
              </p>
            )}
          </div>

          {error && <ErrorBanner message={error} />}

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {t("auth:forgot.sendCode")}
          </Button>
        </form>
      </div>

      <p className="text-center text-body-sm text-bg-text-secondary mt-6">
        <Link
          to="/login"
          className="font-semibold text-bg-primary-500 hover:text-bg-primary-600 transition-colors"
        >
          {t("auth:forgot.backToLogin")}
        </Link>
      </p>
    </>
  );
}

function CodeStep({ identifier, maskedEmail, onVerified }) {
  const { t } = useLocale();
  const [error, setError] = useState("");
  const [masked, setMasked] = useState(maskedEmail);
  const [resentNote, setResentNote] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const schema = z.object({
    code: z.string().regex(/^\d{6}$/, "auth:forgot.invalidCode"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ code }) => {
    setError("");
    try {
      await verifyPasswordResetCode(identifier, code);
      onVerified(code);
    } catch (err) {
      setError(mapError(err, t));
    }
  };

  const handleResend = async () => {
    setError("");
    setResentNote(false);
    setIsResending(true);
    try {
      const res = await requestPasswordReset(identifier);
      setResentNote(true);
      if (res?.maskedEmail) setMasked(res.maskedEmail);
    } catch (err) {
      setError(mapError(err, t));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <StepHeader title={t("auth:forgot.title")} subtitle="" />
      <div className="surface-card p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-bg-primary-500/10 border border-bg-primary-500/30 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={20} className="text-bg-primary-500" />
          </div>
          <p className="text-body-sm text-bg-text-secondary max-w-xs mx-auto">
            {t("auth:forgot.codeSentIntro")}{" "}
            {masked ? (
              <span className="font-semibold text-bg-text-primary ltr-nums break-all">
                {masked}
              </span>
            ) : (
              t("auth:forgot.codeSubtitle")
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
              {t("auth:forgot.codeLabel")}
            </label>
            <div className="relative">
              <input
                type="text"
                {...register("code")}
                onKeyDown={handleKeyDown}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                dir="ltr"
                placeholder="••••••"
                className="input-base w-full h-12 font-mono tracking-[0.5em] ltr-nums text-h5 bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40 text-center"
              />
            </div>
            {errors.code?.message && (
              <p className="text-body-sm text-bg-error mt-1">
                {t(errors.code.message)}
              </p>
            )}
          </div>

          {error && <ErrorBanner message={error} />}
          {resentNote && !error && (
            <p
              className="text-body-sm text-bg-success bg-bg-success/10 rounded-sm px-3 py-2"
              role="status"
            >
              {t("auth:forgot.resent")}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {t("auth:forgot.verify")}
          </Button>

          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="w-full text-caption font-semibold uppercase tracking-[0.08em] text-bg-text-secondary hover:text-bg-primary-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {t("auth:forgot.resend")}
          </button>
        </form>
      </div>

      <p className="text-center text-body-sm text-bg-text-secondary mt-6">
        <Link
          to="/login"
          className="font-semibold text-bg-primary-500 hover:text-bg-primary-600 transition-colors"
        >
          {t("auth:forgot.backToLogin")}
        </Link>
      </p>
    </>
  );
}

function NewPasswordStep({ identifier, code, onDone }) {
  const { t } = useLocale();
  const [error, setError] = useState("");

  const schema = z
    .object({
      password: z.string().min(6, "auth:validation.passwordMin"),
      confirmPassword: z.string().min(1, "auth:validation.required"),
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: "auth:validation.passwordMismatch",
      path: ["confirmPassword"],
    });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ password }) => {
    setError("");
    try {
      await resetPassword({
        identifier,
        code,
        new_password: password,
      });
      onDone();
    } catch (err) {
      setError(mapError(err, t));
    }
  };

  return (
    <>
      <StepHeader
        title={t("auth:forgot.title")}
        subtitle={t("auth:forgot.newPasswordSubtitle")}
      />
      <div className="surface-card p-6 sm:p-8">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <PasswordInput
            label={t("auth:forgot.newPassword")}
            {...register("password")}
            onKeyDown={handleKeyDown}
            autoComplete="new-password"
            placeholder="••••••••"
            error={
              errors.password?.message
                ? t(errors.password.message)
                : undefined
            }
          />

          <PasswordInput
            label={t("auth:register.confirmPassword")}
            {...register("confirmPassword")}
            autoComplete="new-password"
            placeholder="••••••••"
            error={
              errors.confirmPassword?.message
                ? t(errors.confirmPassword.message)
                : undefined
            }
          />

          {error && <ErrorBanner message={error} />}

          <Button
            type="submit"
            variant="primary"
            className="w-full h-11"
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {t("auth:forgot.updatePassword")}
          </Button>
        </form>
      </div>

      <p className="text-center text-body-sm text-bg-text-secondary mt-6">
        <Link
          to="/login"
          className="font-semibold text-bg-primary-500 hover:text-bg-primary-600 transition-colors"
        >
          {t("auth:forgot.backToLogin")}
        </Link>
      </p>
    </>
  );
}

function DoneStep() {
  const { t } = useLocale();

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-16 h-16 rounded-full bg-bg-success/10 border border-bg-success/30 flex items-center justify-center mx-auto mb-5"
      >
        <CheckCircle2 size={28} className="text-bg-success" />
      </motion.div>
      <h1 className="font-heading text-h2 font-bold tracking-tight text-bg-text-primary mb-2">
        {t("auth:forgot.doneTitle")}
      </h1>
      <p className="text-caption text-bg-text-secondary mb-8 max-w-xs mx-auto">
        {t("auth:forgot.doneBody")}
      </p>
      <Link to="/login" tabIndex={-1}>
        <Button variant="primary" className="h-11 px-8">
          {t("auth:forgot.backToLogin")}
        </Button>
      </Link>
    </div>
  );
}

export default function ForgotPassword() {
  const { customer, isLoading: authLoading } = useCustomerAuth();
  // step: 'identifier' | 'code' | 'new' | 'done'
  const [step, setStep] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [maskedEmail, setMaskedEmail] = useState(null);
  const [code, setCode] = useState("");

  if (authLoading) return null;
  if (customer) return <Navigate to="/account" replace />;

  const stepIndex =
    step === "identifier" ? 0 : step === "code" ? 1 : step === "new" ? 2 : 3;

  return (
    <div className="max-w-md mx-auto px-5 py-12 sm:py-20">
      <SEO titleKey="auth:forgot.title" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {step !== "done" && <StepProgress current={stepIndex} />}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {step === "identifier" && (
              <IdentifierStep
                onSent={(sentIdentifier, masked) => {
                  setIdentifier(sentIdentifier);
                  setMaskedEmail(masked);
                  setStep("code");
                }}
              />
            )}

            {step === "code" && (
              <CodeStep
                identifier={identifier}
                maskedEmail={maskedEmail}
                onVerified={(verifiedCode) => {
                  setCode(verifiedCode);
                  setStep("new");
                }}
              />
            )}

            {step === "new" && (
              <NewPasswordStep
                identifier={identifier}
                code={code}
                onDone={() => {
                  setIdentifier("");
                  setCode("");
                  setStep("done");
                }}
              />
            )}

            {step === "done" && <DoneStep />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
