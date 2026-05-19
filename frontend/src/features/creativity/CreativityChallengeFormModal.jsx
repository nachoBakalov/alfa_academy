import { useEffect, useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { CREATIVE_ACTIVITY_TYPE_OPTIONS } from './creativityLabels';
import { addDaysToDateString, getIsoDayOfWeek } from './creativityDateUtils';

function buildInitialState(mode, initialValues, weekStartDate) {
  const startsOn = initialValues?.startsOn || weekStartDate || '';
  const endsOn = initialValues?.endsOn || addDaysToDateString(startsOn, 4);

  return {
    title: initialValues?.title || '',
    activityType: initialValues?.activityType || CREATIVE_ACTIVITY_TYPE_OPTIONS[0]?.value || '',
    description: initialValues?.description || '',
    startsOn,
    endsOn,
  };
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export default function CreativityChallengeFormModal({
  mode,
  isOpen,
  selectedGroup,
  weekStartDate,
  initialValues,
  isSaving,
  onClose,
  onSubmit,
}) {
  const isEditMode = mode === 'edit';
  const [form, setForm] = useState(() => buildInitialState(mode, initialValues, weekStartDate));
  const [errors, setErrors] = useState({});

  const selectedAcademyName = selectedGroup?.academy?.name || '';
  const canSubmit = isEditMode || Boolean(selectedGroup?.academy?.id);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(mode, initialValues, weekStartDate));
      setErrors({});
    }
  }, [isOpen, mode, initialValues, weekStartDate]);

  const helperEndsOn = useMemo(() => {
    if (!hasValue(form.startsOn)) {
      return '';
    }

    return addDaysToDateString(form.startsOn, 4);
  }, [form.startsOn]);

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Заглавието е задължително.';
    }

    if (!form.activityType) {
      nextErrors.activityType = 'Изберете вид активност.';
    }

    if (!form.startsOn) {
      nextErrors.startsOn = 'Началната дата е задължителна.';
    }

    if (!form.endsOn) {
      nextErrors.endsOn = 'Крайната дата е задължителна.';
    }

    if (form.startsOn && getIsoDayOfWeek(form.startsOn) !== 1) {
      nextErrors.startsOn = 'Началната дата трябва да е понеделник.';
    }

    if (form.endsOn && getIsoDayOfWeek(form.endsOn) !== 5) {
      nextErrors.endsOn = 'Крайната дата трябва да е петък.';
    }

    if (form.startsOn && form.endsOn && form.endsOn < form.startsOn) {
      nextErrors.endsOn = 'Крайната дата трябва да е след началната.';
    }

    if (form.startsOn && form.endsOn) {
      const expectedEnd = addDaysToDateString(form.startsOn, 4);

      if (expectedEnd && form.endsOn !== expectedEnd) {
        nextErrors.endsOn = 'Крайната дата трябва да е 4 дни след началната.';
      }
    }

    if (!isEditMode && !selectedGroup?.academy?.id) {
      nextErrors.academyId = 'Изберете група с активна академия.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      title: form.title.trim(),
      activityType: form.activityType,
      description: form.description.trim() || undefined,
      startsOn: form.startsOn,
      endsOn: form.endsOn,
    };

    if (!isEditMode) {
      payload.academyId = Number(selectedGroup.academy.id);
      payload.status = 'active';
    }

    await onSubmit(payload);
  }

  return (
    <FormModal
      title={isEditMode ? 'Редакция на креативно предизвикателство' : 'Ново креативно предизвикателство'}
      isOpen={isOpen}
      onClose={onClose}
      size={560}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button
            type="submit"
            form="creativity-challenge-form"
            loading={isSaving}
            disabled={isSaving || !canSubmit}
          >
            Запази
          </Button>
        </>
      }
    >
      <form id="creativity-challenge-form" className="modal-form" onSubmit={handleSubmit}>
        {!isEditMode ? (
          <Alert type="info">
            Предизвикателството ще бъде достъпно за всички групи в избраната академия.
            {selectedAcademyName ? ` Академия: ${selectedAcademyName}.` : ''}
          </Alert>
        ) : null}

        {errors.academyId ? <Alert type="error">{errors.academyId}</Alert> : null}

        <Input
          label="Заглавие"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          error={errors.title}
          placeholder="Пример: Танци - седмица 1"
        />

        <Select
          label="Вид активност"
          value={form.activityType}
          onChange={(event) => setForm((prev) => ({ ...prev, activityType: event.target.value }))}
          options={CREATIVE_ACTIVITY_TYPE_OPTIONS}
          placeholder="Изберете активност"
          error={errors.activityType}
        />

        <Textarea
          label="Описание"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={4}
          placeholder="Кратко описание на седмичната креативна задача."
        />

        <div className="form-grid-2">
          <Input
            label="Начало"
            type="date"
            value={form.startsOn}
            onChange={(event) => {
              const nextStartsOn = event.target.value;

              setForm((prev) => ({
                ...prev,
                startsOn: nextStartsOn,
                endsOn: addDaysToDateString(nextStartsOn, 4),
              }));
            }}
            error={errors.startsOn}
          />

          <Input
            label="Край"
            type="date"
            value={form.endsOn}
            onChange={(event) => setForm((prev) => ({ ...prev, endsOn: event.target.value }))}
            error={errors.endsOn}
          />
        </div>

        {helperEndsOn ? (
          <p className="creativity-helper-note">
            Препоръчителен край за избраната седмица: {helperEndsOn} (петък).
          </p>
        ) : null}
      </form>
    </FormModal>
  );
}
