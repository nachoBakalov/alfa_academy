import { useEffect, useState } from 'react';
import FormModal from '../../components/ui/FormModal';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';

function todayAsDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AssignChildToGroupModal({
  isOpen,
  onClose,
  onSubmit,
  groupOptions,
  child,
  isSaving,
}) {
  const [groupId, setGroupId] = useState('');
  const [startsOn, setStartsOn] = useState(todayAsDate());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setGroupId('');
    setStartsOn(todayAsDate());
    setErrors({});
  }, [isOpen, child?.id]);

  function validate() {
    const nextErrors = {};

    if (!groupId) {
      nextErrors.groupId = 'Изберете група.';
    }

    if (!startsOn) {
      nextErrors.startsOn = 'Началната дата е задължителна.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      groupId: Number(groupId),
      startsOn,
    });
  }

  return (
    <FormModal
      title={
        child
          ? `Преместване на ${child.firstName} ${child.lastName}`
          : 'Преместване към друга група'
      }
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="assign-child-group-form" loading={isSaving} disabled={isSaving}>
            Запази
          </Button>
        </>
      }
    >
      <form id="assign-child-group-form" className="modal-form" onSubmit={handleSubmit}>
        <Alert type="info">
          Преместването започва от избраната дата. Старите оценки и спортни резултати остават към старата група. Новите резултати ще се въвеждат към новата група.
        </Alert>
        <Select
          label="Нова група"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          options={groupOptions}
          placeholder="Изберете група"
          error={errors.groupId}
        />
        <Input
          label="Начална дата"
          type="date"
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          error={errors.startsOn}
        />
      </form>
    </FormModal>
  );
}
