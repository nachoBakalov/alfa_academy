import { formatChallengeStatus, formatFinalStatus } from './sportsLabels';

export function formatDate(value) {
  return value ? String(value).slice(0, 10) : '-';
}

export function formatNumber(value, unit = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '-';
  }

  const numeric = Number(value);
  const normalized = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);

  return unit ? `${normalized} ${unit}` : normalized;
}

export function formatPercent(decimal) {
  if (decimal === null || decimal === undefined || Number.isNaN(Number(decimal))) {
    return '-';
  }

  return `${(Number(decimal) * 100).toFixed(0)}%`;
}

export function formatDateRange(startsOn, endsOn) {
  return `${formatDate(startsOn)} - ${formatDate(endsOn)}`;
}

export function formatStatus(status) {
  return formatChallengeStatus(status);
}

export function formatFinalStatusLabel(finalStatus) {
  return formatFinalStatus(finalStatus);
}
