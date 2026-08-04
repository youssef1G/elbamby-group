import { forwardRef } from 'react';

/**
 * @param {{ label?: string, error?: string, dir?: 'ltr'|'rtl', className?: string }} props
 */
const Input = forwardRef(function Input(
  { label, error, helper, dir, className = '', ...rest },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-body-sm font-medium text-bg-text-primary ps-0.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        dir={dir}
        className={[
          'input-base w-full bg-bg-surface text-bg-text-primary placeholder:text-bg-text-secondary/50',
          error ? 'input-error' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={!!error}
        aria-describedby={error ? `${rest.id || rest.name}-error` : undefined}
        {...rest}
      />
      {error && (
        <p id={`${rest.id || rest.name}-error`} className="text-body-sm text-bg-error ps-0.5" role="alert">
          {error}
        </p>
      )}
      {helper && !error && (
        <p className="text-caption text-bg-text-secondary ps-0.5">{helper}</p>
      )}
    </div>
  );
});

export default Input;