const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function toNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isValidDateString(value) {
  if (!dateRegex.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

function formatDateObject(date) {
  return date.toISOString().slice(0, 10);
}

export function formatNumber(value) {
  const numeric = toNumber(value);

  if (numeric === null) {
    return '-';
  }

  if (Number.isInteger(numeric)) {
    return String(numeric);
  }

  return numeric.toFixed(2);
}

export function formatPercent(value) {
  const numeric = toNumber(value);

  if (numeric === null) {
    return '-';
  }

  const rounded = Math.abs(numeric % 1) < 0.001 ? String(Math.round(numeric)) : numeric.toFixed(1);
  return `${rounded}%`;
}

export function formatAlphaBalls(value) {
  const numeric = toNumber(value);

  if (numeric === null) {
    return '- / 10';
  }

  return `${formatNumber(numeric)} / 10`;
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  return String(value).slice(0, 10);
}

export function getCurrentMondayDateString() {
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utcToday.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  utcToday.setUTCDate(utcToday.getUTCDate() + diffToMonday);
  return formatDateObject(utcToday);
}

export function isMonday(dateString) {
  if (!isValidDateString(dateString)) {
    return false;
  }

  const parsed = new Date(`${dateString}T00:00:00.000Z`);
  return parsed.getUTCDay() === 1;
}
