import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Select from '../../components/ui/Select';
import { CREATIVITY_CHALLENGE_STATUS_OPTIONS } from './creativityLabels';

export default function CreativityChallengeStatusModal({
  isOpen,
  currentStatus,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [status, setStatus] = useState(currentStatus || 'active');

  useEffect(() => {
    if (isOpen) {
      setStatus(currentStatus || 'active');
    }
  }, [currentStatus, isOpen]);

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(status);
  }

  return (
    <FormModal
      title="Промяна на статус"
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="creativity-status-form" loading={isSaving} disabled={isSaving}>
            Запази статус
          </Button>
        </>
      }
    >
      <form id="creativity-status-form" className="modal-form" onSubmit={handleSubmit}>
        <Select
          label="Статус"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={CREATIVITY_CHALLENGE_STATUS_OPTIONS}
          placeholder="Изберете статус"
        />
      </form>
    </FormModal>
  );
}
