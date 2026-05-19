import { useEffect, useMemo, useState } from 'react';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { formatResultDirection, looksCorruptedText } from './sportsLabels';

function toPercentValue(decimalValue) {
  if (decimalValue === null || decimalValue === undefined || Number.isNaN(Number(decimalValue))) {
    return '';
  }

  return String(Math.round(Number(decimalValue) * 100));
}

function findDefinitionByCode(definitions, code) {
  return (definitions || []).find((definition) => definition.code === code) || null;
}

function buildInitialState(mode, definitions, initialValues) {
  const firstDefinitionCode = definitions[0]?.code || '';
  const defaultDefinitionCode = initialValues?.definitionCode || firstDefinitionCode;
  const definition = findDefinitionByCode(definitions, defaultDefinitionCode);

  const defaultTargetPercent = Math.round(Number(definition?.defaultTargetReductionPercent || 0) * 100);

  const defaultFailSafePercent = Math.round(
    Number(definition?.defaultFailSafeThresholdPercent || 0) * 100
  );

  return {
    definitionCode: defaultDefinitionCode,
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    startsOn: initialValues?.startsOn || '',
    endsOn: initialValues?.endsOn || '',
    targetReductionPercent:
      mode === 'edit'
        ? toPercentValue(initialValues?.targetReductionPercent)
        : initialValues?.targetReductionPercent !== undefined
          ? toPercentValue(initialValues?.targetReductionPercent)
          : String(defaultTargetPercent),
    failSafeThresholdPercent:
      mode === 'edit'
        ? toPercentValue(initialValues?.failSafeThresholdPercent)
        : initialValues?.failSafeThresholdPercent !== undefined
          ? toPercentValue(initialValues?.failSafeThresholdPercent)
          : String(defaultFailSafePercent),
  };
}

function isEmpty(value) {
  return value === '' || value === null || value === undefined;
}

export default function SportsChallengeFormModal({
  mode,
  isOpen,
  definitions = [],
  initialValues,
  isSaving,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => buildInitialState(mode, definitions, initialValues));
  const [errors, setErrors] = useState({});

  const isCreateMode = mode === 'create';
  const isSubmitDisabled = isSaving || (isCreateMode && !definitions.length);
  const selectedDefinition = useMemo(
    () => findDefinitionByCode(definitions, form.definitionCode),
    [definitions, form.definitionCode]
  );

  const definitionOptions = useMemo(
    () =>
      definitions.map((definition) => ({
        value: definition.code,
        label: looksCorruptedText(definition.name)
          ? `${definition.name} (Проверете името)`
          : definition.name,
      })),
    [definitions]
  );

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(mode, definitions, initialValues));
      setErrors({});
    }
  }, [definitions, initialValues, isOpen, mode]);

  function validateForm() {
    const nextErrors = {};

    if (isCreateMode && !form.definitionCode) {
      nextErrors.definitionCode = 'Изберете тип предизвикателство.';
    }

    if (!form.title.trim()) {
      nextErrors.title = 'Заглавието е задължително.';
    }

    if (!form.startsOn) {
      nextErrors.startsOn = 'Началната дата е задължителна.';
    }

    if (!form.endsOn) {
      nextErrors.endsOn = 'Крайната дата е задължителна.';
    }

    if (form.startsOn && form.endsOn && form.endsOn < form.startsOn) {
      nextErrors.endsOn = 'Крайната дата трябва да е след или равна на началната.';
    }

    if (!isEmpty(form.targetReductionPercent)) {
      const numeric = Number(form.targetReductionPercent);

      if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
        nextErrors.targetReductionPercent = 'Стойността трябва да е между 0 и 100%.';
      }
    }

    if (!isEmpty(form.failSafeThresholdPercent)) {
      const numeric = Number(form.failSafeThresholdPercent);

      if (Number.isNaN(numeric) || numeric < 0 || numeric > 100) {
        nextErrors.failSafeThresholdPercent = 'Стойността трябва да е между 0 и 100%.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isCreateMode && !definitions.length) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startsOn: form.startsOn,
      endsOn: form.endsOn,
    };

    if (!isEmpty(form.targetReductionPercent)) {
      payload.targetReductionPercent = Number(form.targetReductionPercent) / 100;
    }

    if (!isEmpty(form.failSafeThresholdPercent)) {
      payload.failSafeThresholdPercent = Number(form.failSafeThresholdPercent) / 100;
    }

    if (isCreateMode) {
      payload.definitionCode = form.definitionCode;
    }

    await onSubmit(payload);
  }

  const selectedTargetPercent = Number(form.targetReductionPercent || 0);

  return (
    <FormModal
      title={isCreateMode ? 'Ново спортно предизвикателство' : 'Редакция на предизвикателство'}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button
            type="submit"
            form="sports-challenge-form"
            loading={isSaving}
            disabled={isSubmitDisabled}
          >
            Запази
          </Button>
        </>
      }
    >
      <form id="sports-challenge-form" className="modal-form" onSubmit={handleSubmit}>
        {isCreateMode ? (
          <Alert type="info">
            Типът е шаблон и може да се използва за повече от едно предизвикателство.
          </Alert>
        ) : null}

        {isCreateMode && !definitions.length ? (
          <Alert type="info">
            Няма активни типове предизвикателства. Създайте нов тип.
          </Alert>
        ) : null}

        {isCreateMode ? (
          <Select
            label="Тип предизвикателство"
            value={form.definitionCode}
            onChange={(event) => {
              const nextCode = event.target.value;
              const definition = findDefinitionByCode(definitions, nextCode);

              setForm((prev) => ({
                ...prev,
                definitionCode: nextCode,
                targetReductionPercent: String(
                  Math.round(Number(definition?.defaultTargetReductionPercent || 0) * 100)
                ),
                failSafeThresholdPercent: String(
                  Math.round(Number(definition?.defaultFailSafeThresholdPercent || 0) * 100)
                ),
              }));
            }}
            options={definitionOptions}
            placeholder="Изберете тип"
            error={errors.definitionCode}
          />
        ) : null}

        {selectedDefinition ? (
          <p className="sports-helper-note">
            Избрана единица: {selectedDefinition.unit || '-'} | Посока:{' '}
            {formatResultDirection(selectedDefinition.resultDirection)}
          </p>
        ) : null}

        {selectedDefinition && looksCorruptedText(selectedDefinition.name) ? (
          <Alert type="info">Името изглежда повредено. Редактирайте типа.</Alert>
        ) : null}

        {selectedDefinition?.resultDirection === 'higher_is_better' ? (
          <p className="sports-helper-note">
            Подходящо за скок, хвърляне, точки и повторения.
          </p>
        ) : null}

        {selectedDefinition?.resultDirection === 'lower_is_better' ? (
          <p className="sports-helper-note">
            Подходящо за време, където по-ниска стойност е по-добра.
          </p>
        ) : null}

        <Input
          label="Заглавие"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          error={errors.title}
        />

        <Textarea
          label="Описание"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={3}
          placeholder="Кратко описание на предизвикателството"
        />

        <div className="form-grid-2">
          <Input
            label="Начало"
            type="date"
            value={form.startsOn}
            onChange={(event) => setForm((prev) => ({ ...prev, startsOn: event.target.value }))}
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

        <div className="form-grid-2">
          <Input
            label="Индивидуален/групов таргет (%)"
            type="number"
            value={form.targetReductionPercent}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, targetReductionPercent: event.target.value }))
            }
            min={0}
            max={100}
            step={1}
            error={errors.targetReductionPercent}
            placeholder="10"
          />
          <Input
            label="Fail-safe праг (%)"
            type="number"
            value={form.failSafeThresholdPercent}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, failSafeThresholdPercent: event.target.value }))
            }
            min={0}
            max={100}
            step={1}
            error={errors.failSafeThresholdPercent}
            placeholder="50"
          />
        </div>

        <p className="sports-helper-note">
          {selectedDefinition?.resultDirection === 'lower_is_better'
            ? `Таргетът позволява до ${selectedTargetPercent}% над първоначалното време.`
            : `Таргетът позволява до ${selectedTargetPercent}% под първоначалния резултат.`}
        </p>
        <p className="sports-helper-note">
          Пример: 10% се изпраща като 0.1 към API. Fail-safe 50% се изпраща като 0.5.
        </p>
      </form>
    </FormModal>
  );
}
