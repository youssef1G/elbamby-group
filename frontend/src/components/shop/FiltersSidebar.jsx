import { useLocale } from '@/context/LocaleContext.jsx';

export default function FiltersSidebar({ categories = [], selected, onSelect, compact = false }) {
  const { t, isAr } = useLocale();

  const name = (c) => (isAr ? c.nameAr : c.nameEn);

  return (
    <div className={compact ? '' : 'p-4 rounded-lg border border-bg-border bg-bg-surface'}>
      <h3 className={compact ? 'text-body-sm font-semibold text-bg-text-primary mb-3' : 'text-body font-semibold text-bg-text-primary mb-4'}>
        {t('shop:categories')}
      </h3>
      <ul className="space-y-1">
        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              onClick={() => onSelect(cat.slug)}
              className={`w-full text-start px-3 py-2 rounded-md text-body-sm transition-colors ${
                selected === cat.slug
                  ? 'bg-bg-primary-50 text-bg-primary-700 font-medium'
                  : 'text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-neutral-100'
              }`}
            >
              {name(cat)}
            </button>
          </li>
        ))}
        {categories.length === 0 && (
          <p className="text-caption text-bg-text-secondary px-3 py-2">{t('shop:noCategories')}</p>
        )}
      </ul>
    </div>
  );
}
