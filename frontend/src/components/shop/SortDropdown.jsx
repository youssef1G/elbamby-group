import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from '@/context/LocaleContext.jsx';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'featured'];

export default function SortDropdown({ value, onChange }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const ref = useRef(null);
  const listboxRef = useRef(null);
  const triggerRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const maxIdx = SORT_OPTIONS.length - 1;
          if (prev === -1) return 0;
          if (e.key === 'ArrowDown') return prev >= maxIdx ? 0 : prev + 1;
          return prev <= 0 ? maxIdx : prev - 1;
        });
      }
      if ((e.key === 'Enter' || e.key === ' ') && focusedIndex >= 0) {
        e.preventDefault();
        onChange(SORT_OPTIONS[focusedIndex]);
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, focusedIndex, onChange, close]);

  useEffect(() => {
    if (!open || !listboxRef.current || focusedIndex < 0) return;
    const items = listboxRef.current.querySelectorAll('[role="option"]');
    items[focusedIndex]?.focus();
  }, [open, focusedIndex]);

  const selectedIndex = SORT_OPTIONS.indexOf(value);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('shop:filters.sortBy')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-bg-border bg-bg-surface text-body-sm text-bg-text-primary hover:border-bg-primary-300 transition whitespace-nowrap"
      >
        {t(`shop.filters.${value}`)}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listboxRef}
            role="listbox"
            aria-label={t('shop:filters.sortBy')}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 top-full mt-1 w-44 rounded-lg border border-bg-border bg-bg-surface shadow-lg z-20 py-1"
          >
            {SORT_OPTIONS.map((key, idx) => (
              <button
                key={key}
                role="option"
                aria-selected={value === key}
                tabIndex={focusedIndex === idx ? 0 : -1}
                onClick={() => { onChange(key); close(); }}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`w-full text-start px-3 py-2 text-body-sm transition-colors ${
                  value === key
                    ? 'bg-bg-primary-50 text-bg-primary-700 font-medium'
                    : 'text-bg-text-secondary hover:text-bg-text-primary hover:bg-bg-neutral-100'
                }`}
              >
                {t(`shop.filters.${key}`)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
