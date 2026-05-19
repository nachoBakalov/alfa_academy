import { useEffect, useMemo, useState } from 'react';
import FormModal from '../../components/ui/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Момче' },
  { value: 'female', label: 'Момиче' },
  { value: 'other', label: 'Друго' },
  { value: 'prefer_not_to_say', label: 'Предпочитам да не посочвам' },
];

const NOTES_MAX_LENGTH = 5000;

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapValues(initialValues, mode) {
  return {
    firstName: initialValues?.firstName || '',
    lastName: initialValues?.lastName || '',
    birthDate: initialValues?.birthDate || '',
    gender: initialValues?.gender || '',
    parentName: initialValues?.parentName || '',
    parentEmail: initialValues?.parentEmail || '',
    parentPhone: initialValues?.parentPhone || '',
    medicalNotes: initialValues?.medicalNotes || '',
    generalNotes: initialValues?.generalNotes || '',
    groupId: initialValues?.groupId ? String(initialValues.groupId) : '',
    startsOn: mode === 'create' ? initialValues?.startsOn || getTodayDate() : '',
  };
}

function isEmailValid(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function ChildFormModal({
  mode,
  isOpen,
  onClose,
  onSubmit,
  isSaving,
  groupOptions,
  initialValues,
}) {
  const [form, setForm] = useState(() => mapValues(initialValues, mode));
  const [errors, setErrors] = useState({});

  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (isOpen) {
      setForm(mapValues(initialValues, mode));
      setErrors({});
    }
  }, [initialValues, isOpen, mode]);

  const title = useMemo(() => (isEditMode ? 'Редакция на дете' : 'Ново дете'), [isEditMode]);

  function validateForm() {
    const nextErrors = {};

    if (!form.firstName.trim()) {
      nextErrors.firstName = 'Името е задължително.';
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = 'Фамилията е задължителна.';
    }

    if (!isEditMode && !form.groupId) {
      nextErrors.groupId = 'Групата е задължителна при създаване.';
    }

    if (form.parentEmail.trim() && !isEmailValid(form.parentEmail.trim())) {
      nextErrors.parentEmail = 'Въведете валиден имейл.';
    }

    if (form.medicalNotes.length > NOTES_MAX_LENGTH) {
      nextErrors.medicalNotes = `Максимум ${NOTES_MAX_LENGTH} символа.`;
    }

    if (form.generalNotes.length > NOTES_MAX_LENGTH) {
      nextErrors.generalNotes = `Максимум ${NOTES_MAX_LENGTH} символа.`;
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
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      birthDate: form.birthDate || undefined,
      gender: form.gender || undefined,
      parentName: form.parentName.trim() || undefined,
      parentEmail: form.parentEmail.trim() || undefined,
      parentPhone: form.parentPhone.trim() || undefined,
      medicalNotes: form.medicalNotes.trim() || undefined,
      generalNotes: form.generalNotes.trim() || undefined,
    };

    if (!isEditMode) {
      payload.groupId = Number(form.groupId);
      payload.startsOn = form.startsOn || undefined;
    }

    await onSubmit(payload);
  }

  return (
    <FormModal
      title={title}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="child-form" loading={isSaving} disabled={isSaving}>
            Запази
          </Button>
        </>
      }
    >
      <form id="child-form" className="modal-form" onSubmit={handleSubmit}>
        <div className="form-grid-2">
          <Input
            label="Име"
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            error={errors.firstName}
          />
          <Input
            label="Фамилия"
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            error={errors.lastName}
          />
        </div>

        <div className="form-grid-2">
          <Input
            label="Дата на раждане"
            type="date"
            value={form.birthDate}
            onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
          />
          <Select
            label="Пол"
            value={form.gender}
            onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
            options={GENDER_OPTIONS}
            placeholder="Изберете"
          />
        </div>

        {!isEditMode ? (
          <div className="form-grid-2">
            <Select
              label="Група"
              value={form.groupId}
              onChange={(event) => setForm((prev) => ({ ...prev, groupId: event.target.value }))}
              options={groupOptions}
              placeholder="Изберете група"
              error={errors.groupId}
            />
            <Input
              label="Начало"
              type="date"
              value={form.startsOn}
              onChange={(event) => setForm((prev) => ({ ...prev, startsOn: event.target.value }))}
            />
          </div>
        ) : null}

        <div className="form-grid-2">
          <Input
            label="Родител/настойник"
            value={form.parentName}
            onChange={(event) => setForm((prev) => ({ ...prev, parentName: event.target.value }))}
          />
          <Input
            label="Имейл на родител"
            type="email"
            value={form.parentEmail}
            onChange={(event) => setForm((prev) => ({ ...prev, parentEmail: event.target.value }))}
            error={errors.parentEmail}
          />
        </div>

        <Input
          label="Телефон на родител"
          value={form.parentPhone}
          onChange={(event) => setForm((prev) => ({ ...prev, parentPhone: event.target.value }))}
        />

        <Textarea
          label="Медицински бележки"
          value={form.medicalNotes}
          onChange={(event) => setForm((prev) => ({ ...prev, medicalNotes: event.target.value }))}
          error={errors.medicalNotes}
          placeholder="Алергии, особености, важна информация"
        />

        <Textarea
          label="Общи бележки"
          value={form.generalNotes}
          onChange={(event) => setForm((prev) => ({ ...prev, generalNotes: event.target.value }))}
          error={errors.generalNotes}
          placeholder="Допълнителни насоки за работа"
        />
      </form>
    </FormModal>
  );
}
