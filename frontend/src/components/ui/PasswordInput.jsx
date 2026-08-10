import { forwardRef, useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/context/LocaleContext.jsx";

/**
 * Password input with lock icon + show/hide toggle button.
 * Mirrors the inline input pattern used on the login/register pages.
 * @param {{ label?: string, error?: string, className?: string }} props
 */
const PasswordInput = forwardRef(function PasswordInput(
  { label, error, className = "", ...rest },
  ref,
) {
  const { t } = useLocale();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      {label && (
        <label className="block text-caption font-semibold text-bg-text-secondary mb-1.5 uppercase tracking-[0.08em]">
          {label}
        </label>
      )}
      <div className="relative">
        <Lock
          size={14}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-bg-text-secondary pointer-events-none"
        />
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={`input-base w-full ps-9 pe-9 h-10 text-body-sm bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/40 ${className}`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-sm text-bg-text-secondary hover:text-bg-text-primary transition-colors"
          aria-label={
            visible
              ? t("auth:common.hidePassword")
              : t("auth:common.showPassword")
          }
        >
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      {error && <p className="text-body-sm text-bg-error mt-1">{error}</p>}
    </div>
  );
});

export default PasswordInput;
