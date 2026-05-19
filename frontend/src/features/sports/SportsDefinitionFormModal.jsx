import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import FormModal from '../../components/ui/FormModal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';

function toPercentValue(decimalValue, fallback = '') {
  if (decimalValue === null || decimalValue === undefined || Number.isNaN(Number(decimalValue))) {
    return fallback;
  }

  return String(Math.round(Number(decimalValue) * 100));
}

function buildInitialForm(mode, definition) {
  if (mode === 'edit' && definition) {
    return {
      code: definition.code || '',
      name: definition.name || '',
      description: definition.description || '',
      unit: definition.unit || '',
      resultDirection: definition.resultDirection || 'higher_is_better',
      defaultTargetReductionPercent: toPercentValue(definition.defaultTargetReductionPercent, '10'),
      defaultFailSafeThresholdPercent: toPercentValue(
        definition.defaultFailSafeThresholdPercent,
        '50'
      ),
    };
  }

  return {
    code: '',
    name: '',
    description: '',
    unit: '',
    resultDirection: 'higher_is_better',
    defaultTargetReductionPercent: '10',
    defaultFailSafeThresholdPercent: '50',
  };
}

function isEmpty(value) {
  return value === '' || value === null || value === undefined;
}

const RESULT_DIRECTION_OPTIONS = [
  { value: 'higher_is_better', label: 'По-висока стойност е по-добра' },
  { value: 'lower_is_better', label: 'По-ниска стойност е по-добра' },
];

export default function SportsDefinitionFormModal({
  mode,
  isOpen,
  definition,
  isSaving,
  onClose,
  onSubmit,
}) {
  const isCreateMode = mode === 'create';
  const [form, setForm] = useState(() => buildInitialForm(mode, definition));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setForm(buildInitialForm(mode, definition));
    setErrors({});
  }, [definition, isOpen, mode]);

  function validate() {
    const nextErrors = {};

    if (isCreateMode) {
      const normalizedCode = form.code.trim().toLowerCase();

      if (!normalizedCode) {
        nextErrors.code = 'Кодът е задължителен.';
      } else if (!/^[a-z0-9_]+$/.test(normalizedCode)) {
        nextErrors.code = 'Използвайте малки латински букви, цифри и долна черта.';
      }
    }

    if (!form.name.trim()) {
      nextErrors.name = 'Името е задължително.';
    }

    if (!form.unit.trim()) {
      nextErrors.unit = 'Единицата е задължителна.';
    }

    const targetPercent = Number(form.defaultTargetReductionPercent);

    if (
      !isEmpty(form.defaultTargetReductionPercent) &&
      (Number.isNaN(targetPercent) || targetPercent < 0 || targetPercent > 100)
    ) {
      nextErrors.defaultTargetReductionPercent = 'Стойността трябва да е между 0 и 100%.';
    }

    const failSafePercent = Number(form.defaultFailSafeThresholdPercent);

    if (
      !isEmpty(form.defaultFailSafeThresholdPercent) &&
      (Number.isNaN(failSafePercent) || failSafePercent < 0 || failSafePercent > 100)
    ) {
      nextErrors.defaultFailSafeThresholdPercent = 'Стойността трябва да е между 0 и 100%.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      unit: form.unit.trim(),
      resultDirection: form.resultDirection,
      defaultTargetReductionPercent: Number(form.defaultTargetReductionPercent),
      defaultFailSafeThresholdPercent: Number(form.defaultFailSafeThresholdPercent),
    };

    if (isCreateMode) {
      payload.code = form.code.trim().toLowerCase();
    }

    await onSubmit(payload);
  }

  const targetPercent = Number(form.defaultTargetReductionPercent || 0);

  return (
    <FormModal
      title={isCreateMode ? 'Нов тип предизвикателство' : 'Редакция на тип предизвикателство'}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Отказ
          </Button>
          <Button type="submit" form="sports-definition-form" loading={isSaving} disabled={isSaving}>
            Запази
          </Button>
        </>
      }
    >
      <form id="sports-definition-form" className="modal-form" onSubmit={handleSubmit}>
        {isCreateMode ? (
          <>
            <Input
              label="Код"
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value.toLowerCase() }))
              }
              placeholder="push_ups"
              error={errors.code}
            />
            <p className="sports-helper-note">
              Използвайте малки латински букви, цифри и долна черта. Пример: push_ups
            </p>
          </>
        ) : (
          <Input label="Код" value={form.code} disabled />
        )}

        <Input
          label="Име"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          error={errors.name}
        />

        <Textarea
          label="Описание"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          rows={3}
          placeholder="Кратко описание"
        />

        <div className="form-grid-2">
          <Input
            label="Единица"
            value={form.unit}
            onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
            placeholder="cm, sec, reps, points"
            error={errors.unit}
          />

          <Select
            label="Посока"
            value={form.resultDirection}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, resultDirection: event.target.value }))
            }
            options={RESULT_DIRECTION_OPTIONS}
          />
        </div>

        {form.resultDirection === 'higher_is_better' ? (
          <p className="sports-helper-note">
            Подходящо за скок, хвърляне, точки, повторения.
          </p>
        ) : (
          <p className="sports-helper-note">
            Подходящо за време, където по-ниска стойност е по-добра.
          </p>
        )}

        <div className="form-grid-2">
          <Input
            label="Таргет (%)"
            type="number"
            min={0}
            max={100}
            step={1}
            value={form.defaultTargetReductionPercent}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, defaultTargetReductionPercent: event.target.value }))
            }
            error={errors.defaultTargetReductionPercent}
          />

          <Input
            label="Fail-safe (%)"
            type="number"
            min={0}
            max={100}
            step={1}
            value={form.defaultFailSafeThresholdPercent}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, defaultFailSafeThresholdPercent: event.target.value }))
            }
            error={errors.defaultFailSafeThresholdPercent}
          />
        </div>

        <p className="sports-helper-note">
          {form.resultDirection === 'lower_is_better'
            ? `Таргетът позволява до ${targetPercent}% над първоначалното време.`
            : `Таргетът позволява до ${targetPercent}% под първоначалния резултат.`}
        </p>
      </form>
    </FormModal>
  );
}
