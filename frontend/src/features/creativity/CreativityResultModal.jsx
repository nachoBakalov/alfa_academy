import { useEffect, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';

function buildInitialState(initialValues) {
  return {
    alphaBalls:
      initialValues?.alphaBalls === null || initialValues?.alphaBalls === undefined
        ? ''
        : String(initialValues.alphaBalls),
    resultNote: initialValues?.resultNote || '',
  };
}

export default function CreativityResultModal({
  isOpen,
  selectedGroup,
  initialValues,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => buildInitialState(initialValues));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(initialValues));
      setErrors({});
    }
  }, [initialValues, isOpen]);

  function validate() {
    const nextErrors = {};

    if (form.alphaBalls === '') {
      nextErrors.alphaBalls = 'Алфа топките са задължителни.';
    } else {
      const numeric = Number(form.alphaBalls);

      if (!Number.isInteger(numeric) || numeric < 0 || numeric > 10) {
        nextErrors.alphaBalls = 'Стойността трябва да е цяло число от 0 до 10.';
      }
    }

    if (form.resultNote.length > 2000) {
      nextErrors.resultNote = 'Бележката може да е до 2000 символа.';
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
      alphaBalls: Number(form.alphaBalls),
      resultNote: form.resultNote.trim() || undefined,
    });
  }

  return (
    <FormModal
      title={`Алфа топки за ${selectedGroup?.name || 'избраната група'}`}
      isOpen={isOpen}
      onClose={onClose}
      size={500}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="creativity-result-form" loading={isSaving} disabled={isSaving}>
            Запази
          </Button>
        </>
      }
    >
      <form id="creativity-result-form" className="modal-form" onSubmit={handleSubmit}>
        <Alert type="info">8 до 10 Алфа топки означава, че целта е постигната.</Alert>

        <Input
          label="Алфа топки"
          type="number"
          value={form.alphaBalls}
          min={0}
          max={10}
          step={1}
          onChange={(event) => setForm((prev) => ({ ...prev, alphaBalls: event.target.value }))}
          error={errors.alphaBalls}
          placeholder="0 до 10"
        />

        <Textarea
          label="Бележка"
          value={form.resultNote}
          onChange={(event) => setForm((prev) => ({ ...prev, resultNote: event.target.value }))}
          rows={4}
          error={errors.resultNote}
          placeholder="Допълнително наблюдение за участието на групата."
        />
      </form>
    </FormModal>
  );
}
