export const SOCIAL_COLOR_OPTIONS = [
  {
    value: 'green',
    label: 'Успешно',
    description: 'Справя се добре',
    tone: 'success',
  },
  {
    value: 'orange',
    label: 'Насочване',
    description: 'Има нужда от насока',
    tone: 'warning',
  },
  {
    value: 'red',
    label: 'Внимание',
    description: 'Има нужда от внимание',
    tone: 'danger',
  },
];

export const DAY_OF_WEEK_LABELS_BG = {
  1: 'Понеделник',
  2: 'Вторник',
  3: 'Сряда',
  4: 'Четвъртък',
  5: 'Петък',
  6: 'Събота',
  7: 'Неделя',
};

export function getSocialColorMeta(color) {
  return SOCIAL_COLOR_OPTIONS.find((option) => option.value === color) || null;
}

export function formatDailyStatus(status) {
  if (status === 'green') {
    return 'Успешен ден';
  }

  if (status === 'orange') {
    return 'Нужда от насочване';
  }

  if (status === 'red') {
    return 'Нужда от внимание';
  }

  return 'Няма данни';
}

export function getDailyStatusTone(status) {
  if (status === 'green') {
    return 'success';
  }

  if (status === 'orange') {
    return 'warning';
  }

  if (status === 'red') {
    return 'danger';
  }

  return 'neutral';
}

export function formatWeeklyStatus(status) {
  if (status === 'target_reached') {
    return 'Таргетът е постигнат';
  }

  if (status === 'target_not_reached') {
    return 'Нужно е още насърчаване';
  }

  return 'Няма данни';
}

export function getWeeklyStatusTone(status) {
  if (status === 'target_reached') {
    return 'success';
  }

  if (status === 'target_not_reached') {
    return 'warning';
  }

  return 'neutral';
}
