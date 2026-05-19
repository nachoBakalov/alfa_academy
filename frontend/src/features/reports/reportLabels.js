export function formatQuestionnaireStatus(status) {
  if (status === 'pending') {
    return 'Очаква попълване';
  }

  if (status === 'submitted') {
    return 'Попълнени';
  }

  if (status === 'expired') {
    return 'Изтекли';
  }

  if (status === 'revoked') {
    return 'Отменени';
  }

  return 'Няма данни';
}

export function formatQuestionnaireOverviewStatus(status) {
  if (status === 'pending') {
    return 'Очаква';
  }

  if (status === 'submitted') {
    return 'Попълнен';
  }

  if (status === 'expired') {
    return 'Изтекъл';
  }

  if (status === 'revoked') {
    return 'Отменен';
  }

  return 'Няма данни';
}

export function getQuestionnaireTone(status) {
  if (status === 'submitted') {
    return 'success';
  }

  if (status === 'pending') {
    return 'warning';
  }

  if (status === 'expired' || status === 'revoked') {
    return 'info';
  }

  return 'neutral';
}

export function formatComfortZoneProfileStatus(hasProfile) {
  return hasProfile ? 'Има профил' : 'Очаква профил';
}

export function getComfortZoneProfileTone(hasProfile) {
  return hasProfile ? 'success' : 'warning';
}

export function formatZoneSummaryLabel(zone) {
  if (zone === 'green') {
    return 'Комфортна зона';
  }

  if (zone === 'yellow') {
    return 'Зона на развитие';
  }

  if (zone === 'red') {
    return 'Нужда от подкрепа';
  }

  if (zone === 'behaviorIndicator') {
    return 'Поведенчески индикатори';
  }

  return 'Неутрална зона';
}

export function getZoneSummaryTone(zone) {
  if (zone === 'green') {
    return 'success';
  }

  if (zone === 'yellow') {
    return 'warning';
  }

  if (zone === 'red') {
    return 'danger';
  }

  if (zone === 'behaviorIndicator') {
    return 'info';
  }

  return 'neutral';
}

export function formatSocialDailyStatus(status) {
  if (status === 'green') {
    return 'Успешен ден';
  }

  if (status === 'orange') {
    return 'Нужда от насочване';
  }

  if (status === 'red') {
    return 'Нужда от внимание';
  }

  return 'Няма оценка';
}

export function getSocialDailyTone(status) {
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
    return 'Таргет постигнат';
  }

  if (status === 'target_not_reached') {
    return 'Нужда от насърчаване';
  }

  return 'Няма седмично обобщение';
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

export function formatSportsChallengeStatus(status) {
  if (status === 'active') {
    return 'Активно';
  }

  if (status === 'completed') {
    return 'Завършено';
  }

  if (status === 'draft') {
    return 'Чернова';
  }

  if (status === 'archived') {
    return 'Архивирано';
  }

  return 'Няма данни';
}

export function getSportsChallengeStatusTone(status) {
  if (status === 'active') {
    return 'success';
  }

  if (status === 'completed') {
    return 'info';
  }

  if (status === 'draft') {
    return 'warning';
  }

  return 'neutral';
}

export function formatSportsFinalStatus(status) {
  if (status === 'passed') {
    return 'Целта е постигната';
  }

  if (status === 'not_passed') {
    return 'Нужни още опити';
  }

  return 'Няма данни';
}

export function getSportsFinalStatusTone(status) {
  if (status === 'passed') {
    return 'success';
  }

  if (status === 'not_passed') {
    return 'warning';
  }

  return 'neutral';
}
