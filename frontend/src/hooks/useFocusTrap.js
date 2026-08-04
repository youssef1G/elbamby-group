import { useEffect, useRef } from 'react';

/**
 * Focus trap hook for dialogs, drawers, and menus.
 * Implements the ARIA APG dialog pattern:
 *   - stores the active element before opening, restores on close
 *   - moves focus into the panel on open
 *   - traps Tab/Shift+Tab within the panel
 *   - closes on Escape (optional)
 *
 * Usage:
 *   const ref = useRef(null);
 *   useFocusTrap({ isOpen, ref, onClose });
 *   return <aside ref={ref} role="dialog" aria-modal="true">...</aside>;
 */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function useFocusTrap({ isOpen, ref, onClose, initialFocus }) {
  const triggerRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Save trigger, move focus in; restore on close
  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const panel = ref.current;
      if (!panel) return;
      const target = initialFocus?.current && ref.current.contains(initialFocus.current)
        ? initialFocus.current
        : panel.querySelector(FOCUSABLE_SELECTOR);
      target?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(raf);
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus({ preventScroll: true });
        triggerRef.current = null;
      }
    };
  }, [isOpen, ref, initialFocus]);

  // Tab trap + Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const focusable = ref.current.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, ref]);
}
