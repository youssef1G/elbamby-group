import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';

export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  disabled = false,
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const display = selected?.label || placeholder;
  const listboxId = useRef(`select-listbox-${Math.random().toString(36).slice(2)}`).current;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border bg-bg-surface px-3.5 py-2 text-body-sm text-bg-text-primary transition-colors ${
          open ? 'border-bg-primary-500 ring-1 ring-bg-primary-500' : 'border-bg-border'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${!selected ? 'text-bg-text-secondary/50' : ''}`}>{display}</span>
        <ChevronDown size={14} className={`text-bg-text-secondary shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full bg-bg-surface border border-bg-border rounded-lg shadow-card overflow-hidden"
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                disabled={opt.disabled}
                onClick={() => { onChange?.(opt.value); setOpen(false); }}
                className={`w-full text-start px-3.5 py-2.5 text-body-sm transition-colors ${
                  opt.value === value
                    ? 'bg-bg-primary-500/10 text-bg-primary-500 font-semibold'
                    : 'text-bg-text-primary hover:bg-bg-surface-sunken'
                } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {opt.label}
              </button>
            ))}
            {options.length === 0 && (
              <p className="px-3.5 py-2.5 text-body-sm text-bg-text-secondary text-center">{t('common:select.empty')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}