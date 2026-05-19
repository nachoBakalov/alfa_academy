export function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatPercent(value) {
  return `${Math.max(0, Math.round(toNumber(value, 0)))}%`;
}

export function formatBalls(balls, maxBalls) {
  return `${toNumber(balls, 0)} / ${toNumber(maxBalls, 0)}`;
}

export function formatDate(value) {
  if (!value) {
    return '-';
  }

  return String(value).slice(0, 10);
}

export function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}
