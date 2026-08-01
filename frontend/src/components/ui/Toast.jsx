import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const { t } = useLocale();
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.slice(-3);
    });
    timers.current[id] = setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast: add, removeToast: remove }}>
      {children}
      {createPortal(
        <div
          className="fixed bottom-4 inset-x-4 sm:bottom-6 sm:inset-x-auto sm:end-6 z-[100] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          aria-label={t('toast.notifications')}
        >
          <AnimatePresence mode="popLayout">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={() => remove(t.id)} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { t } = useLocale();
  const typeStyles = {
    success: 'bg-bg-success text-white',
    error: 'bg-bg-error text-white',
    info: 'bg-bg-neutral-900 dark:bg-bg-surface-raised text-bg-text-primary',
  };

  const role = toast.type === 'error' ? 'alert' : 'status';
  const live = toast.type === 'error' ? 'assertive' : 'polite';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      role={role}
      aria-live={live}
      className={`pointer-events-auto flex items-center gap-3 rounded-md px-4 py-3 shadow-card text-body-sm font-medium max-w-sm ${typeStyles[toast.type] || typeStyles.info}`}
    >
      <span className="flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label={t('common:common.close')}>
        <X size={16} aria-hidden="true" focusable="false" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}