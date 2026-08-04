import { motion } from 'motion/react';

const variants = {
  primary:
    'btn-primary inline-flex items-center justify-center font-semibold transition active:scale-[0.98]',
  secondary:
    'btn-secondary inline-flex items-center justify-center font-medium transition active:scale-[0.98]',
  ghost: 'btn-ghost inline-flex items-center justify-center font-medium transition active:scale-[0.98]',
  danger:
    'btn-danger inline-flex items-center justify-center font-semibold transition active:scale-[0.98]',
};

const sizes = {
  sm: 'text-body-sm h-9 px-3 rounded-sm gap-1.5',
  md: 'text-body h-[44px] px-6 gap-2',
  lg: 'text-body-lg h-12 px-8 gap-2.5',
};

/**
 * @param {{ variant?: 'primary'|'secondary'|'ghost'|'danger', size?: 'sm'|'md'|'lg', disabled?: boolean, loading?: boolean, children?: React.ReactNode, className?: string }} props
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  className = '',
  ...rest
}) {
  const base = [variants[variant], sizes[size], disabled && 'opacity-50 pointer-events-none', className]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.button
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      className={base}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="animate-spin" aria-hidden="true"><LoadingIcon /></span>}
      {children}
    </motion.button>
  );
}

function LoadingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}