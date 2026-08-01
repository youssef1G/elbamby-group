import Skeleton from '@/components/ui/Skeleton.jsx';

export default function StatCard({ label, value, icon: Icon, color = 'primary', loading = false }) {
  const iconColors = {
    primary: 'text-bg-primary-500 bg-bg-primary-50',
    success: 'text-bg-success bg-bg-success/10',
    warning: 'text-bg-warning bg-bg-warning/10',
    error: 'text-bg-error bg-bg-error/10',
    info: 'text-bg-info bg-bg-info/10',
  };

  return (
    <div className="bg-bg-surface border border-bg-border rounded-md p-4 sm:p-5">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-caption text-bg-text-secondary">{label}</p>
            {Icon && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconColors[color] || iconColors.primary}`}>
                <Icon size={16} strokeWidth={1.5} />
              </div>
            )}
          </div>
          <p className="text-h2 font-bold text-bg-text-primary ltr-nums">{value ?? 0}</p>
        </>
      )}
    </div>
  );
}