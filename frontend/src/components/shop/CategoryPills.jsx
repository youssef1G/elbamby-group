import { useLocale } from '@/context/LocaleContext.jsx';

export default function CategoryPills({ categories = [], selected, onSelect }) {
  const { t, isAr } = useLocale();

  const name = (c) => (isAr ? c.nameAr : c.nameEn);

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
      <button
        onClick={() => onSelect(null)}
        aria-pressed={!selected}
        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-body-sm border transition-colors flex-shrink-0 ${
          !selected
            ? 'bg-bg-primary-500 text-white border-bg-primary-500'
            : 'bg-bg-surface text-bg-text-secondary border-bg-border hover:border-bg-primary-300'
        }`}
      >
        {t('shop:filters.allCategories')}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.slug)}
          aria-pressed={selected === cat.slug}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-body-sm border transition-colors flex-shrink-0 ${
            selected === cat.slug
              ? 'bg-bg-primary-500 text-white border-bg-primary-500'
              : 'bg-bg-surface text-bg-text-secondary border-bg-border hover:border-bg-primary-300'
          }`}
        >
          {name(cat)}
        </button>
      ))}
    </div>
  );
}
