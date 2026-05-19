export function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

function parseDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function formatIso(date) {
  return date.toISOString().slice(0, 10);
}

export function getIsoDayOfWeek(dateString) {
  const date = parseDate(dateString);

  if (!date) {
    return null;
  }

  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function isMonday(dateString) {
  return getIsoDayOfWeek(dateString) === 1;
}

export function getCurrentMondayDateString() {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);

  return formatIso(monday);
}

export function addDaysToDateString(dateString, days) {
  const parsed = parseDate(dateString);

  if (!parsed) {
    return '';
  }

  return formatIso(addDays(parsed, days));
}

export function formatDateRange(startsOn, endsOn) {
  if (!startsOn && !endsOn) {
    return '-';
  }

  if (!startsOn) {
    return `до ${formatDate(endsOn)}`;
  }

  if (!endsOn) {
    return `от ${formatDate(startsOn)}`;
  }

  return `${formatDate(startsOn)} - ${formatDate(endsOn)}`;
}
