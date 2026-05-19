export const CHALLENGE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Чернова' },
  { value: 'active', label: 'Активно' },
  { value: 'completed', label: 'Завършено' },
  { value: 'archived', label: 'Архивирано' },
];

export const CHALLENGE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Всички' },
  ...CHALLENGE_STATUS_OPTIONS,
];

export function formatChallengeStatus(status) {
  const found = CHALLENGE_STATUS_OPTIONS.find((option) => option.value === status);
  return found ? found.label : 'Неизвестен статус';
}

export function getChallengeStatusTone(status) {
  if (status === 'active') {
    return 'success';
  }

  if (status === 'completed') {
    return 'info';
  }

  if (status === 'archived') {
    return 'neutral';
  }

  return 'warning';
}

export function formatFinalStatus(finalStatus) {
  if (finalStatus === 'passed') {
    return 'Целта е постигната';
  }

  if (finalStatus === 'not_passed') {
    return 'Нужни са още опити';
  }

  return 'Няма данни';
}

export function getFinalStatusTone(finalStatus) {
  if (finalStatus === 'passed') {
    return 'success';
  }

  if (finalStatus === 'not_passed') {
    return 'warning';
  }

  return 'neutral';
}

export function formatGroupTargetReached(value) {
  return value ? 'Груповият таргет е постигнат' : 'Има още възможност за напредък';
}

export function formatFailSafeReached(value) {
  return value
    ? 'Fail-safe условието е постигнато'
    : 'Нужно е още насърчаване';
}

export function formatResultDirection(value) {
  if (value === 'higher_is_better') {
    return 'По-висока стойност е по-добра';
  }

  if (value === 'lower_is_better') {
    return 'По-ниска стойност е по-добра';
  }

  return 'Няма данни';
}

export function formatDefinitionStatus(isActive) {
  return isActive ? 'Активен тип' : 'Неактивен тип';
}

export function looksCorruptedText(value) {
  if (typeof value !== 'string' || value.length < 3) {
    return false;
  }

  const questionMarksCount = value.match(/\?/g)?.length || 0;
  return questionMarksCount / value.length > 0.3;
}
