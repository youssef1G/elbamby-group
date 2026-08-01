import { Languages } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';

export default function LanguageSwitcher() {
  const { t, lang, setLang } = useLocale();
  const current = lang === 'en' ? 'en' : 'ar';
  const next = current === 'ar' ? 'en' : 'ar';
  const label = next === 'en' ? t('language.switchToEnglish') : t('language.switchToArabic');

  return (
    <button
      onClick={() => setLang(next)}
      className="btn-ghost !min-h-0 h-10 w-10 flex items-center justify-center rounded-md"
      aria-label={label}
      title={label}
    >
      <Languages size={24} strokeWidth={1.5} />
      <span className="text-caption font-semibold ms-1 hidden sm:inline">
        {next.toUpperCase()}
      </span>
    </button>
  );
}
