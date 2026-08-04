import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext.jsx';
import useFocusTrap from '@/hooks/useFocusTrap.js';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4',
};

export default function Modal({ isOpen, onClose, children, size = 'md', className = '' }) {
  const { t } = useLocale();
  const panelRef = useRef(null);
  useFocusTrap({ isOpen, ref: panelRef, onClose });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`relative w-full ${sizes[size] || sizes.md} max-h-[85vh] overflow-y-auto rounded-xl bg-bg-surface border border-bg-border shadow-xl ${className}`}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={onClose}
              className="absolute top-3 end-3 w-8 h-8 rounded-full bg-bg-surface-sunken flex items-center justify-center hover:bg-bg-neutral-200 transition-colors z-10"
              aria-label={t('common:common.close')}
            >
              <X size={16} aria-hidden="true" focusable="false" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
