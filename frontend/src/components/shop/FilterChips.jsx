import { useLocale } from '@/context/LocaleContext.jsx';
import { X } from 'lucide-react';

export default function FilterChips({ filters = [], onRemove, onClearAll }) {
  const { t } = useLocale();
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      {filters.map((f) => (
        <span
          key={f.key}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-primary-50 text-bg-primary-700 text-body-sm"
        >
          {f.label}
          <button
            onClick={() => onRemove(f.key)}
            className="hover:text-bg-primary-900 transition-colors"
            aria-label={`${t('common:common.remove')} ${f.label}`}
          >
            <X size={14} />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-body-sm text-bg-text-secondary hover:text-bg-primary-600 transition-colors underline ms-1"
      >
        {t('shop:filters.clearAll')}
      </button>
    </div>
  );
}
