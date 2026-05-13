const SOCIAL_COLORS = Object.freeze({
  GREEN: 'green',
  ORANGE: 'orange',
  RED: 'red',
});

const DAILY_STATUSES = Object.freeze({
  GREEN: 'green',
  ORANGE: 'orange',
  RED: 'red',
});

const WEEKLY_STATUSES = Object.freeze({
  TARGET_REACHED: 'target_reached',
  TARGET_NOT_REACHED: 'target_not_reached',
});

function assertFiniteNumber(value, fieldName) {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
}

function colorToInternalPoints(color) {
  if (color === SOCIAL_COLORS.GREEN) {
    return 1;
  }

  if (color === SOCIAL_COLORS.ORANGE) {
    return 0;
  }

  if (color === SOCIAL_COLORS.RED) {
    return -1;
  }

  throw new Error(`Invalid social color: ${color}`);
}

function calculateChildInternalScore({
  coachRelationColor,
  childrenRelationColor,
  rulesColor,
}) {
  return (
    colorToInternalPoints(coachRelationColor) +
    colorToInternalPoints(childrenRelationColor) +
    colorToInternalPoints(rulesColor)
  );
}

function calculateChildDailyStatus(internalScore) {
  assertFiniteNumber(internalScore, 'internalScore');

  if (internalScore < -3 || internalScore > 3) {
    throw new Error(`internalScore is out of range: ${internalScore}`);
  }

  if (internalScore >= 2) {
    return DAILY_STATUSES.GREEN;
  }

  if (internalScore >= 0) {
    return DAILY_STATUSES.ORANGE;
  }

  return DAILY_STATUSES.RED;
}

function childStatusToExternalPoints(status) {
  if (status === DAILY_STATUSES.GREEN) {
    return 1;
  }

  if (status === DAILY_STATUSES.ORANGE) {
    return 0;
  }

  if (status === DAILY_STATUSES.RED) {
    return -1;
  }

  throw new Error(`Invalid daily status: ${status}`);
}

function calculateChildDailyResult({
  coachRelationColor,
  childrenRelationColor,
  rulesColor,
}) {
  const internalScore = calculateChildInternalScore({
    coachRelationColor,
    childrenRelationColor,
    rulesColor,
  });
  const dailyStatus = calculateChildDailyStatus(internalScore);
  const externalPoints = childStatusToExternalPoints(dailyStatus);

  return {
    internalScore,
    dailyStatus,
    externalPoints,
  };
}

function calculateDailySummary(evaluations) {
  if (!Array.isArray(evaluations)) {
    throw new Error('evaluations must be an array');
  }

  const calculatedEvaluations = evaluations.map((evaluation) =>
    calculateChildDailyResult(evaluation)
  );

  const numberOfChildren = calculatedEvaluations.length;
  const internalDailyMaximum = numberOfChildren * 3;
  const externalDailyMaximum = numberOfChildren;

  let dailySocialResult = 0;
  let greenChildrenCount = 0;
  let orangeChildrenCount = 0;
  let redChildrenCount = 0;

  for (const evaluation of calculatedEvaluations) {
    dailySocialResult += evaluation.externalPoints;

    if (evaluation.dailyStatus === DAILY_STATUSES.GREEN) {
      greenChildrenCount += 1;
    } else if (evaluation.dailyStatus === DAILY_STATUSES.ORANGE) {
      orangeChildrenCount += 1;
    } else if (evaluation.dailyStatus === DAILY_STATUSES.RED) {
      redChildrenCount += 1;
    }
  }

  return {
    numberOfChildren,
    internalDailyMaximum,
    externalDailyMaximum,
    dailySocialResult,
    greenChildrenCount,
    orangeChildrenCount,
    redChildrenCount,
    evaluations: calculatedEvaluations,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundToTwoDecimals(value) {
  return Math.round(value * 100) / 100;
}

function calculateWeeklyAlphaBalls({ weeklySocialResult, weeklyMaximum }) {
  assertFiniteNumber(weeklySocialResult, 'weeklySocialResult');
  assertFiniteNumber(weeklyMaximum, 'weeklyMaximum');

  if (weeklyMaximum <= 0) {
    return 0;
  }

  const rawAlphaBalls = Math.floor((weeklySocialResult / weeklyMaximum) * 10);
  return clamp(rawAlphaBalls, 0, 10);
}

function calculateWeeklyStatus(alphaBalls) {
  assertFiniteNumber(alphaBalls, 'alphaBalls');

  if (alphaBalls >= 8) {
    return WEEKLY_STATUSES.TARGET_REACHED;
  }

  return WEEKLY_STATUSES.TARGET_NOT_REACHED;
}

function calculateWeeklySummary({
  dailySummaries,
  numberOfChildren,
  activeDaysCount,
}) {
  if (!Array.isArray(dailySummaries)) {
    throw new Error('dailySummaries must be an array');
  }

  const activeDailySummaries = dailySummaries.filter((summary) => summary.isActiveDay);

  const resolvedActiveDaysCount =
    activeDaysCount !== undefined && activeDaysCount !== null
      ? activeDaysCount
      : activeDailySummaries.length;

  assertFiniteNumber(resolvedActiveDaysCount, 'activeDaysCount');

  const weeklySocialResult = activeDailySummaries.reduce(
    (sum, summary) => sum + (Number(summary.dailySocialResult) || 0),
    0
  );

  const hasNumberOfChildren = numberOfChildren !== undefined && numberOfChildren !== null;

  if (hasNumberOfChildren) {
    assertFiniteNumber(numberOfChildren, 'numberOfChildren');
  }

  const weeklyMaximum = hasNumberOfChildren
    ? numberOfChildren * resolvedActiveDaysCount
    : activeDailySummaries.reduce(
        (sum, summary) => sum + (Number(summary.externalDailyMaximum) || 0),
        0
      );

  const rawWeeklyPercentage =
    weeklyMaximum <= 0 ? 0 : (weeklySocialResult / weeklyMaximum) * 100;
  const weeklyPercentage = roundToTwoDecimals(clamp(rawWeeklyPercentage, 0, 100));

  const weeklyAlphaBalls = calculateWeeklyAlphaBalls({
    weeklySocialResult,
    weeklyMaximum,
  });
  const weeklyStatus = calculateWeeklyStatus(weeklyAlphaBalls);

  return {
    activeDaysCount: resolvedActiveDaysCount,
    numberOfChildren: hasNumberOfChildren ? numberOfChildren : null,
    weeklyMaximum,
    weeklySocialResult,
    weeklyPercentage,
    weeklyAlphaBalls,
    weeklyStatus,
  };
}

module.exports = {
  SOCIAL_COLORS,
  DAILY_STATUSES,
  WEEKLY_STATUSES,
  colorToInternalPoints,
  calculateChildInternalScore,
  calculateChildDailyStatus,
  childStatusToExternalPoints,
  calculateChildDailyResult,
  calculateDailySummary,
  calculateWeeklyAlphaBalls,
  calculateWeeklyStatus,
  calculateWeeklySummary,
};
