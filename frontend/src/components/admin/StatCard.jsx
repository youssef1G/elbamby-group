import Skeleton from '@/components/ui/Skeleton.jsx';

export default function StatCard({
  label,
  value,
  icon: Icon,
  accent = '',
  valueClass = 'text-xl',
  loading = false,
}) {
  return (
    <div className="surface-card p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      {loading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="hidden sm:block w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ) : (
        <>
          {Icon && (
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-bg-primary-500/10 text-bg-primary-500 items-center justify-center shrink-0">
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" focusable="false" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.05em] text-bg-text-secondary">
              {label}
            </p>
            <p
              className={`font-heading font-bold text-bg-text-primary ltr-nums whitespace-nowrap mt-0.5 ${valueClass} ${accent}`}
            >
              {value ?? 0}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
