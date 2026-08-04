import { useLocale } from '@/context/LocaleContext.jsx';
import { Package } from 'lucide-react';

const icons = {
  package: Package,
};

/**
 * @param {{ icon?: keyof typeof icons, message?: string, action?: { label: string, onClick: () => void }, className?: string }} props
 */
export default function EmptyState({ icon = 'package', message, action, className = '' }) {
  const { t } = useLocale();
  const Icon = icons[icon] || Package;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-bg-neutral-100 dark:bg-bg-neutral-800 flex items-center justify-center">
        <Icon className="w-8 h-8 text-bg-text-secondary" strokeWidth={1.5} />
      </div>
      <p className="text-bg-text-secondary text-body max-w-xs">
        {message || t('common.nothing')}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary mt-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}