const variants = {
  'in-stock': 'bg-bg-success/10 text-bg-success',
  'low-stock': 'bg-bg-warning/10 text-bg-warning',
  'out-of-stock': 'bg-bg-error/10 text-bg-error',
  new: 'bg-bg-primary-100 text-bg-primary-700',
  featured: 'bg-bg-primary-100 text-bg-primary-700',
  info: 'bg-bg-info/10 text-bg-info',
};

/**
 * @param {{ variant?: 'in-stock'|'low-stock'|'out-of-stock'|'new'|'featured'|'info', children?: React.ReactNode, className?: string }} props
 */
export default function Badge({ variant = 'info', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium ${variants[variant] || variants.info} ${className}`}
    >
      {children}
    </span>
  );
}