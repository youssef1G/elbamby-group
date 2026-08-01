import { Sun, Moon } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { useTheme } from '@/context/ThemeContext.jsx';

export default function ThemeToggle() {
  const { t } = useLocale();
  const { mode, toggle } = useTheme();
  const isDark = mode === 'dark';
  const label = isDark ? t('theme.toggleToLight') : t('theme.toggleToDark');

  return (
    <button
      onClick={toggle}
      className="btn-ghost !min-h-0 h-12 w-12 flex items-center justify-center rounded-md"
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun size={28} strokeWidth={1.5} /> : <Moon size={28} strokeWidth={1.5} />}
    </button>
  );
}