export const CATEGORY_LABELS = {
  social: 'Социално поведение',
  sports: 'Спорт',
  creativity: 'Креативност',
  total: 'Общо',
};

export const CATEGORY_SHORT_LABELS = {
  social: 'Социално',
  sports: 'Спорт',
  creativity: 'Креативност',
};

export const PERIOD_OPTIONS = [
  { value: 'current_week', label: 'Текуща седмица' },
  { value: 'previous_week', label: 'Предишна седмица' },
  { value: 'current_month', label: 'Текущ месец' },
  { value: 'all', label: 'Цял период' },
  { value: 'custom', label: 'Ръчен период' },
];

export function getPresetLabel(preset) {
  return PERIOD_OPTIONS.find((option) => option.value === preset)?.label || 'Текуща седмица';
}

export function getLeaderboardMessage(percentage) {
  const score = Number(percentage || 0);

  if (score >= 90) {
    return 'Чудесен напредък';
  }

  if (score >= 70) {
    return 'Силен ритъм на развитие';
  }

  if (score >= 50) {
    return 'Продължаваме напред';
  }

  return 'Събрани Алфа топки';
}
