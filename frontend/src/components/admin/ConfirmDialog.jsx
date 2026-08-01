import { useLocale } from '@/context/LocaleContext.jsx';
import Modal from '@/components/ui/Modal.jsx';
import Button from '@/components/ui/Button.jsx';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant = 'danger',
  loading = false,
}) {
  const { t } = useLocale();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <h3 className="text-body font-semibold text-bg-text-primary mb-2">
          {title || t('admin:common.confirmDelete')}
        </h3>
        <p className="text-body-sm text-bg-text-secondary mb-6">
          {description || t('admin:common.confirmDeleteDesc')}
        </p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>{t('admin:common.cancel')}</Button>
          <Button
            variant={variant}
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}