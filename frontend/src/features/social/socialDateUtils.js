import { DAY_OF_WEEK_LABELS_BG } from './socialLabels';

export function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function getIsoDayOfWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
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
  const offset = currentDay === 0 ? -6 : 1 - currentDay;

  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + offset);

  return monday.toISOString().slice(0, 10);
}

export function formatDayOfWeek(dayOfWeek) {
  return DAY_OF_WEEK_LABELS_BG[dayOfWeek] || '-';
}
