const GENDER_LABELS = {
  male: 'Момче',
  female: 'Момиче',
  other: 'Друго',
  prefer_not_to_say: 'Предпочитам да не посочвам',
};

const QUESTIONNAIRE_STATUS_LABELS = {
  pending: 'Очаква попълване',
  submitted: 'Попълнен въпросник',
  expired: 'Нужен е нов линк',
  revoked: 'Нужен е нов линк',
};

const ZONE_LABELS = {
  green: 'Комфортна зона',
  yellow: 'Зона на развитие',
  red: 'Нужда от подкрепа',
  behavior_indicator: 'Поведенчески индикатор',
  neutral: 'Информация',
};

export function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

export function formatFullName(person = {}) {
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || '-';
}

export function formatGender(gender) {
  return GENDER_LABELS[gender] || '-';
}

export function formatQuestionnaireStatus(status) {
  if (!status) {
    return 'Няма линк';
  }

  return QUESTIONNAIRE_STATUS_LABELS[status] || 'Информация';
}

export function formatZoneLabel(zone) {
  return ZONE_LABELS[zone] || 'Информация';
}

export function getQuestionnaireTone(status) {
  if (status === 'pending') {
    return 'warning';
  }

  if (status === 'submitted') {
    return 'success';
  }

  if (status === 'expired' || status === 'revoked') {
    return 'info';
  }

  return 'neutral';
}

export function getZoneTone(zone) {
  if (zone === 'green') {
    return 'success';
  }

  if (zone === 'yellow') {
    return 'warning';
  }

  if (zone === 'red') {
    return 'danger';
  }

  if (zone === 'behavior_indicator') {
    return 'info';
  }

  return 'neutral';
}
