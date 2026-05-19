import Button from './Button';
import FormModal from './FormModal';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Потвърди',
  cancelLabel = 'Отказ',
  isOpen,
  onConfirm,
  onClose,
  isLoading = false,
}) {
  return (
    <FormModal
      title={title}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant="secondary" onClick={onConfirm} loading={isLoading} disabled={isLoading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm-message">{message}</p>
    </FormModal>
  );
}
