import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Select from '../../components/ui/Select';
import { CHALLENGE_STATUS_OPTIONS } from './sportsLabels';

export default function SportsChallengeStatusModal({
  isOpen,
  currentStatus,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [status, setStatus] = useState(currentStatus || 'draft');

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus || 'draft');
    }
  }, [currentStatus, isOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(status);
  }

  return (
    <FormModal
      title="Обновяване на статус"
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="sports-status-form" loading={isSaving} disabled={isSaving}>
            Запази статус
          </Button>
        </>
      }
    >
      <form id="sports-status-form" className="modal-form" onSubmit={handleSubmit}>
        <Select
          label="Статус"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={CHALLENGE_STATUS_OPTIONS}
          placeholder="Изберете статус"
        />
      </form>
    </FormModal>
  );
}
