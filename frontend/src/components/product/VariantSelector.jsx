import { useLocale } from '@/context/LocaleContext.jsx';

const SWATCH = 'h-10 w-10 shrink-0 rounded-full overflow-hidden border-2 transition-all duration-150';

/**
 * Color-variant swatch list for ProductDetail (docs/14 §5).
 *
 * @param {{ variants: object[], selectedId: string|null, onSelect: (variantId: string) => void }} props
 *   Each variant object expects: { id, labelEn, labelAr, hexCode, imageUrl, isDefault, isActive }.
 *   Field casing matches the camelCase API contract (docs/04 §4 + toCamelCase transform).
 */
export default function VariantSelector({ variants = [], selectedId = null, onSelect }) {
  const { t, isAr } = useLocale();
  if (!variants.length) return null;

  const labelFor = (v) => (isAr ? v.labelAr || v.labelEn : v.labelEn || v.labelAr);
  const selected = variants.find((v) => v.id === selectedId) || null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-body-sm font-medium text-bg-text-secondary">
        {t('variant:color')}
      </span>

      <div
        role="radiogroup"
        aria-label={t('variant:color')}
        className="flex items-start gap-4 overflow-x-auto pb-1"
      >
        {variants.map((v) => {
          const isSelected = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={labelFor(v)}
              onClick={() => onSelect(v.id)}
              className="group flex flex-col items-center gap-1.5 shrink-0 focus:outline-none"
            >
              <span
                className={[
                  SWATCH,
                  isSelected
                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                    : 'border-bg-border group-hover:border-bg-text-secondary',
                ].join(' ')}
              >
                <img
                  src={v.imageUrl}
                  alt={labelFor(v)}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </span>
              <span
                className={`text-caption whitespace-nowrap ${
                  isSelected
                    ? 'text-bg-text-primary font-semibold'
                    : 'text-bg-text-secondary group-hover:text-bg-text-primary'
                }`}
              >
                {labelFor(v)}
              </span>
            </button>
          );
        })}
      </div>

      {selected ? (
        <span className="text-body-sm text-bg-text-primary" aria-live="polite">
          {t('variant:selected', { label: labelFor(selected) })}
        </span>
      ) : (
        <span className="text-body-sm text-bg-text-secondary">{t('variant:selectColor')}</span>
      )}
    </div>
  );
}
