export const CREATIVE_ACTIVITY_TYPE_OPTIONS = [
  { value: 'Танци', label: 'Танци' },
  { value: 'Обща рисунка', label: 'Обща рисунка' },
  { value: 'Бит и техника', label: 'Бит и техника' },
  { value: 'Театър', label: 'Театър' },
  { value: 'Музика', label: 'Музика' },
  { value: 'Друго', label: 'Друго' },
];

export const CREATIVITY_CHALLENGE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Чернова' },
  { value: 'active', label: 'Активно' },
  { value: 'completed', label: 'Завършено' },
  { value: 'archived', label: 'Архивирано' },
];

export const CREATIVITY_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Всички статуси' },
  ...CREATIVITY_CHALLENGE_STATUS_OPTIONS,
];

const CHALLENGE_STATUS_LABELS = {
  draft: 'Чернова',
  active: 'Активно',
  completed: 'Завършено',
  archived: 'Архивирано',
};

const CHALLENGE_STATUS_TONES = {
  draft: 'neutral',
  active: 'info',
  completed: 'success',
  archived: 'warning',
};

const TARGET_STATUS_LABELS = {
  pending: 'Очаква оценка',
  target_reached: 'Целта е постигната',
  target_not_reached: 'Нужно е още насърчаване',
};

const TARGET_STATUS_TONES = {
  pending: 'neutral',
  target_reached: 'success',
  target_not_reached: 'warning',
};

export function formatCreativityChallengeStatus(value) {
  return CHALLENGE_STATUS_LABELS[value] || value || '-';
}

export function getCreativityChallengeStatusTone(value) {
  return CHALLENGE_STATUS_TONES[value] || 'neutral';
}

export function formatCreativityTargetStatus(value) {
  return TARGET_STATUS_LABELS[value] || TARGET_STATUS_LABELS.pending;
}

export function getCreativityTargetStatusTone(value) {
  return TARGET_STATUS_TONES[value] || 'neutral';
}

export function formatAlphaBalls(alphaBalls) {
  if (alphaBalls === null || alphaBalls === undefined) {
    return '- / 10';
  }

  return `${Number(alphaBalls)} / 10`;
}
