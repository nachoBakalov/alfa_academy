const SPORTS_FINAL_STATUSES = Object.freeze({
  PASSED: 'passed',
  NOT_PASSED: 'not_passed',
});

const SPORTS_RESULT_DIRECTIONS = Object.freeze({
  HIGHER_IS_BETTER: 'higher_is_better',
  LOWER_IS_BETTER: 'lower_is_better',
});

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function assertValidPercent(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  if (value < 0 || value > 1) {
    throw new Error(`${fieldName} must be between 0 and 1`);
  }
}

function normalizeMeasurementValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    throw new Error('Measurement value must be a finite number');
  }

  if (numericValue < 0) {
    throw new Error('Measurement value cannot be negative');
  }

  return numericValue;
}

function normalizeResultDirection(resultDirection) {
  if (resultDirection === undefined || resultDirection === null || resultDirection === '') {
    return SPORTS_RESULT_DIRECTIONS.HIGHER_IS_BETTER;
  }

  if (
    resultDirection !== SPORTS_RESULT_DIRECTIONS.HIGHER_IS_BETTER &&
    resultDirection !== SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER
  ) {
    throw new Error('Invalid resultDirection');
  }

  return resultDirection;
}

function calculateIndividualTarget({
  baselineValue,
  targetReductionPercent = 0.1,
  resultDirection = SPORTS_RESULT_DIRECTIONS.HIGHER_IS_BETTER,
}) {
  const normalizedBaselineValue = normalizeMeasurementValue(baselineValue);
  const normalizedResultDirection = normalizeResultDirection(resultDirection);

  if (normalizedBaselineValue === null) {
    return null;
  }

  assertValidPercent(targetReductionPercent, 'targetReductionPercent');

  if (normalizedResultDirection === SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER) {
    return roundToTwo(normalizedBaselineValue * (1 + targetReductionPercent));
  }

  return roundToTwo(normalizedBaselineValue * (1 - targetReductionPercent));
}

function calculateIndividualResult({
  baselineValue,
  finalValue,
  targetReductionPercent = 0.1,
  resultDirection = SPORTS_RESULT_DIRECTIONS.HIGHER_IS_BETTER,
}) {
  const normalizedBaselineValue = normalizeMeasurementValue(baselineValue);
  const normalizedFinalValue = normalizeMeasurementValue(finalValue);
  const normalizedResultDirection = normalizeResultDirection(resultDirection);

  if (normalizedBaselineValue === null) {
    return {
      baselineValue: null,
      finalValue: normalizedFinalValue,
      individualTargetValue: null,
      individualTargetReached: null,
      repeatedOrImprovedBaseline: null,
      differenceFromBaseline: null,
      differenceFromTarget: null,
    };
  }

  const individualTargetValue = calculateIndividualTarget({
    baselineValue: normalizedBaselineValue,
    targetReductionPercent,
    resultDirection: normalizedResultDirection,
  });

  if (normalizedFinalValue === null) {
    return {
      baselineValue: normalizedBaselineValue,
      finalValue: null,
      individualTargetValue,
      individualTargetReached: false,
      repeatedOrImprovedBaseline: false,
      differenceFromBaseline: null,
      differenceFromTarget: null,
    };
  }

  if (normalizedResultDirection === SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER) {
    const differenceFromBaseline = roundToTwo(normalizedBaselineValue - normalizedFinalValue);
    const differenceFromTarget = roundToTwo(individualTargetValue - normalizedFinalValue);

    return {
      baselineValue: normalizedBaselineValue,
      finalValue: normalizedFinalValue,
      individualTargetValue,
      individualTargetReached: normalizedFinalValue <= individualTargetValue,
      repeatedOrImprovedBaseline: normalizedFinalValue <= normalizedBaselineValue,
      differenceFromBaseline,
      differenceFromTarget,
    };
  }

  const differenceFromBaseline = roundToTwo(normalizedFinalValue - normalizedBaselineValue);
  const differenceFromTarget = roundToTwo(normalizedFinalValue - individualTargetValue);

  return {
    baselineValue: normalizedBaselineValue,
    finalValue: normalizedFinalValue,
    individualTargetValue,
    individualTargetReached: normalizedFinalValue >= individualTargetValue,
    repeatedOrImprovedBaseline: normalizedFinalValue >= normalizedBaselineValue,
    differenceFromBaseline,
    differenceFromTarget,
  };
}

function calculateGroupTarget({
  baselineTotal,
  targetReductionPercent = 0.1,
  resultDirection = SPORTS_RESULT_DIRECTIONS.HIGHER_IS_BETTER,
}) {
  const normalizedBaselineTotal = normalizeMeasurementValue(baselineTotal);
  const safeBaselineTotal = normalizedBaselineTotal === null ? 0 : normalizedBaselineTotal;
  const normalizedResultDirection = normalizeResultDirection(resultDirection);

  assertValidPercent(targetReductionPercent, 'targetReductionPercent');

  if (normalizedResultDirection === SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER) {
    return roundToTwo(safeBaselineTotal * (1 + targetReductionPercent));
  }

  return roundToTwo(safeBaselineTotal * (1 - targetReductionPercent));
}

function calculateFailSafe({
  repeatedOrImprovedCount,
  participantsCount,
  failSafeThresholdPercent = 0.5,
}) {
  assertValidPercent(failSafeThresholdPercent, 'failSafeThresholdPercent');

  const normalizedRepeatedCount = Number(repeatedOrImprovedCount);
  const normalizedParticipantsCount = Number(participantsCount);

  if (!Number.isFinite(normalizedRepeatedCount) || normalizedRepeatedCount < 0) {
    throw new Error('repeatedOrImprovedCount must be a non-negative number');
  }

  if (!Number.isFinite(normalizedParticipantsCount) || normalizedParticipantsCount < 0) {
    throw new Error('participantsCount must be a non-negative number');
  }

  if (normalizedParticipantsCount <= 0) {
    return {
      repeatedOrImprovedPercentage: 0,
      failSafeReached: false,
    };
  }

  const ratio = normalizedRepeatedCount / normalizedParticipantsCount;

  return {
    repeatedOrImprovedPercentage: roundToTwo(ratio * 100),
    failSafeReached: ratio >= failSafeThresholdPercent,
  };
}

function calculateSportsChallengeSummary({
  results,
  targetReductionPercent = 0.1,
  failSafeThresholdPercent = 0.5,
  resultDirection = SPORTS_RESULT_DIRECTIONS.HIGHER_IS_BETTER,
}) {
  if (!Array.isArray(results)) {
    throw new Error('results must be an array');
  }

  const normalizedResultDirection = normalizeResultDirection(resultDirection);

  assertValidPercent(targetReductionPercent, 'targetReductionPercent');
  assertValidPercent(failSafeThresholdPercent, 'failSafeThresholdPercent');

  const normalizedResults = results.map((result) => {
    const individual = calculateIndividualResult({
      baselineValue: result.baselineValue,
      finalValue: result.finalValue,
      targetReductionPercent,
      resultDirection: normalizedResultDirection,
    });

    return {
      childId: result.childId,
      ...individual,
    };
  });

  const participants = normalizedResults.filter((result) => result.baselineValue !== null);

  const participantsCount = participants.length;
  const finalResultsCount = participants.filter((result) => result.finalValue !== null).length;

  const baselineTotal = roundToTwo(
    participants.reduce((sum, result) => sum + result.baselineValue, 0)
  );

  const groupTargetTotal = calculateGroupTarget({
    baselineTotal,
    targetReductionPercent,
    resultDirection: normalizedResultDirection,
  });

  const finalTotal = roundToTwo(
    participants.reduce((sum, result) => {
      if (normalizedResultDirection === SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER) {
        return result.finalValue === null ? sum : sum + result.finalValue;
      }

      return sum + (result.finalValue || 0);
    }, 0)
  );

  const groupTargetReached =
    participantsCount > 0 &&
    (normalizedResultDirection === SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER
      ? finalResultsCount === participantsCount && finalTotal <= groupTargetTotal
      : finalTotal >= groupTargetTotal);

  const repeatedOrImprovedCount = participants.filter(
    (result) => result.repeatedOrImprovedBaseline === true
  ).length;

  const failSafe = calculateFailSafe({
    repeatedOrImprovedCount,
    participantsCount,
    failSafeThresholdPercent,
  });

  const finalStatus =
    participantsCount > 0 && (groupTargetReached || failSafe.failSafeReached)
      ? SPORTS_FINAL_STATUSES.PASSED
      : SPORTS_FINAL_STATUSES.NOT_PASSED;

  return {
    participantsCount,
    finalResultsCount,
    baselineTotal,
    groupTargetTotal,
    finalTotal,
    groupTargetReached,
    repeatedOrImprovedCount,
    repeatedOrImprovedPercentage: failSafe.repeatedOrImprovedPercentage,
    failSafeReached: failSafe.failSafeReached,
    finalStatus,
    targetReductionPercent,
    failSafeThresholdPercent,
    results: normalizedResults,
  };
}

module.exports = {
  SPORTS_FINAL_STATUSES,
  SPORTS_RESULT_DIRECTIONS,
  roundToTwo,
  assertValidPercent,
  normalizeMeasurementValue,
  normalizeResultDirection,
  calculateIndividualTarget,
  calculateIndividualResult,
  calculateGroupTarget,
  calculateFailSafe,
  calculateSportsChallengeSummary,
};
