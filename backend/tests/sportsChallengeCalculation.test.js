const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SPORTS_FINAL_STATUSES,
  SPORTS_RESULT_DIRECTIONS,
  calculateIndividualTarget,
  calculateIndividualResult,
  calculateGroupTarget,
  calculateFailSafe,
  calculateSportsChallengeSummary,
} = require('../src/services/sportsChallengeCalculation.service');

test('calculateIndividualTarget calculates -10 percent target', () => {
  assert.equal(
    calculateIndividualTarget({ baselineValue: 100, targetReductionPercent: 0.1 }),
    90
  );

  assert.equal(
    calculateIndividualTarget({ baselineValue: 123.45, targetReductionPercent: 0.1 }),
    111.11
  );

  assert.equal(
    calculateIndividualTarget({
      baselineValue: 10,
      targetReductionPercent: 0.1,
      resultDirection: SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER,
    }),
    11
  );
});

test('calculateIndividualResult calculates target and repeat conditions', () => {
  assert.deepEqual(
    calculateIndividualResult({ baselineValue: 100, finalValue: 95, targetReductionPercent: 0.1 }),
    {
      baselineValue: 100,
      finalValue: 95,
      individualTargetValue: 90,
      individualTargetReached: true,
      repeatedOrImprovedBaseline: false,
      differenceFromBaseline: -5,
      differenceFromTarget: 5,
    }
  );

  const equalToBaseline = calculateIndividualResult({
    baselineValue: 100,
    finalValue: 100,
    targetReductionPercent: 0.1,
  });
  assert.equal(equalToBaseline.individualTargetReached, true);
  assert.equal(equalToBaseline.repeatedOrImprovedBaseline, true);

  const belowTarget = calculateIndividualResult({
    baselineValue: 100,
    finalValue: 89,
    targetReductionPercent: 0.1,
  });
  assert.equal(belowTarget.individualTargetReached, false);
  assert.equal(belowTarget.repeatedOrImprovedBaseline, false);

  assert.deepEqual(
    calculateIndividualResult({ baselineValue: 100, finalValue: null, targetReductionPercent: 0.1 }),
    {
      baselineValue: 100,
      finalValue: null,
      individualTargetValue: 90,
      individualTargetReached: false,
      repeatedOrImprovedBaseline: false,
      differenceFromBaseline: null,
      differenceFromTarget: null,
    }
  );

  assert.deepEqual(
    calculateIndividualResult({ baselineValue: null, finalValue: 100, targetReductionPercent: 0.1 }),
    {
      baselineValue: null,
      finalValue: 100,
      individualTargetValue: null,
      individualTargetReached: null,
      repeatedOrImprovedBaseline: null,
      differenceFromBaseline: null,
      differenceFromTarget: null,
    }
  );
});

test('calculateGroupTarget calculates group target with reduction', () => {
  assert.equal(calculateGroupTarget({ baselineTotal: 300, targetReductionPercent: 0.1 }), 270);
});

test('calculateFailSafe calculates percentage and threshold result', () => {
  assert.deepEqual(
    calculateFailSafe({
      repeatedOrImprovedCount: 2,
      participantsCount: 3,
      failSafeThresholdPercent: 0.5,
    }),
    {
      repeatedOrImprovedPercentage: 66.67,
      failSafeReached: true,
    }
  );

  assert.deepEqual(
    calculateFailSafe({
      repeatedOrImprovedCount: 1,
      participantsCount: 3,
      failSafeThresholdPercent: 0.5,
    }),
    {
      repeatedOrImprovedPercentage: 33.33,
      failSafeReached: false,
    }
  );

  assert.deepEqual(
    calculateFailSafe({
      repeatedOrImprovedCount: 0,
      participantsCount: 0,
      failSafeThresholdPercent: 0.5,
    }),
    {
      repeatedOrImprovedPercentage: 0,
      failSafeReached: false,
    }
  );
});

test('calculateSportsChallengeSummary passes when group target is reached', () => {
  const summary = calculateSportsChallengeSummary({
    results: [
      { childId: 1, baselineValue: 100, finalValue: 90 },
      { childId: 2, baselineValue: 120, finalValue: 108 },
      { childId: 3, baselineValue: 80, finalValue: 72 },
    ],
    targetReductionPercent: 0.1,
    failSafeThresholdPercent: 0.5,
  });

  assert.equal(summary.participantsCount, 3);
  assert.equal(summary.baselineTotal, 300);
  assert.equal(summary.groupTargetTotal, 270);
  assert.equal(summary.finalTotal, 270);
  assert.equal(summary.groupTargetReached, true);
  assert.equal(summary.finalStatus, SPORTS_FINAL_STATUSES.PASSED);
});

test('calculateSportsChallengeSummary passes when fail-safe is reached', () => {
  const summary = calculateSportsChallengeSummary({
    results: [
      { childId: 1, baselineValue: 100, finalValue: 100 },
      { childId: 2, baselineValue: 120, finalValue: 120 },
      { childId: 3, baselineValue: 80, finalValue: 20 },
    ],
    targetReductionPercent: 0.1,
    failSafeThresholdPercent: 0.5,
  });

  assert.equal(summary.baselineTotal, 300);
  assert.equal(summary.groupTargetTotal, 270);
  assert.equal(summary.finalTotal, 240);
  assert.equal(summary.groupTargetReached, false);
  assert.equal(summary.repeatedOrImprovedCount, 2);
  assert.equal(summary.failSafeReached, true);
  assert.equal(summary.finalStatus, SPORTS_FINAL_STATUSES.PASSED);
});

test('calculateSportsChallengeSummary returns not_passed when target and fail-safe are not reached', () => {
  const summary = calculateSportsChallengeSummary({
    results: [
      { childId: 1, baselineValue: 100, finalValue: 80 },
      { childId: 2, baselineValue: 120, finalValue: 90 },
      { childId: 3, baselineValue: 80, finalValue: 70 },
    ],
    targetReductionPercent: 0.1,
    failSafeThresholdPercent: 0.5,
  });

  assert.equal(summary.groupTargetReached, false);
  assert.equal(summary.failSafeReached, false);
  assert.equal(summary.finalStatus, SPORTS_FINAL_STATUSES.NOT_PASSED);
});

test('calculateSportsChallengeSummary handles missing final values', () => {
  const summary = calculateSportsChallengeSummary({
    results: [
      { childId: 1, baselineValue: 100, finalValue: null },
      { childId: 2, baselineValue: 120, finalValue: 120 },
    ],
    targetReductionPercent: 0.1,
    failSafeThresholdPercent: 0.5,
  });

  assert.equal(summary.participantsCount, 2);
  assert.equal(summary.finalResultsCount, 1);
  assert.equal(summary.repeatedOrImprovedCount, 1);
  assert.equal(summary.repeatedOrImprovedPercentage, 50);
  assert.equal(summary.failSafeReached, true);
  assert.equal(summary.finalStatus, SPORTS_FINAL_STATUSES.PASSED);
});

test('calculateIndividualResult supports lower_is_better direction', () => {
  const reached = calculateIndividualResult({
    baselineValue: 10,
    finalValue: 10.5,
    targetReductionPercent: 0.1,
    resultDirection: SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER,
  });

  assert.equal(reached.individualTargetValue, 11);
  assert.equal(reached.individualTargetReached, true);
  assert.equal(reached.repeatedOrImprovedBaseline, false);

  const notReached = calculateIndividualResult({
    baselineValue: 10,
    finalValue: 12,
    targetReductionPercent: 0.1,
    resultDirection: SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER,
  });

  assert.equal(notReached.individualTargetReached, false);

  const improved = calculateIndividualResult({
    baselineValue: 10,
    finalValue: 9.8,
    targetReductionPercent: 0.1,
    resultDirection: SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER,
  });

  assert.equal(improved.repeatedOrImprovedBaseline, true);
  assert.equal(improved.differenceFromBaseline, 0.2);
  assert.equal(improved.differenceFromTarget, 1.2);
});

test('calculateSportsChallengeSummary supports lower_is_better target checks', () => {
  const summary = calculateSportsChallengeSummary({
    results: [
      { childId: 1, baselineValue: 10, finalValue: 10.5 },
      { childId: 2, baselineValue: 12, finalValue: 12.1 },
    ],
    targetReductionPercent: 0.1,
    failSafeThresholdPercent: 0.5,
    resultDirection: SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER,
  });

  assert.equal(summary.baselineTotal, 22);
  assert.equal(summary.groupTargetTotal, 24.2);
  assert.equal(summary.finalTotal, 22.6);
  assert.equal(summary.finalResultsCount, 2);
  assert.equal(summary.groupTargetReached, true);
});

test('calculateSportsChallengeSummary lower_is_better requires all final values', () => {
  const summary = calculateSportsChallengeSummary({
    results: [
      { childId: 1, baselineValue: 10, finalValue: 10.5 },
      { childId: 2, baselineValue: 12, finalValue: null },
    ],
    targetReductionPercent: 0.1,
    failSafeThresholdPercent: 0.5,
    resultDirection: SPORTS_RESULT_DIRECTIONS.LOWER_IS_BETTER,
  });

  assert.equal(summary.finalResultsCount, 1);
  assert.equal(summary.groupTargetReached, false);
});

test('calculateSportsChallengeSummary with no participants returns not_passed', () => {
  const summary = calculateSportsChallengeSummary({
    results: [],
    targetReductionPercent: 0.1,
    failSafeThresholdPercent: 0.5,
  });

  assert.equal(summary.participantsCount, 0);
  assert.equal(summary.baselineTotal, 0);
  assert.equal(summary.groupTargetTotal, 0);
  assert.equal(summary.finalTotal, 0);
  assert.equal(summary.groupTargetReached, false);
  assert.equal(summary.failSafeReached, false);
  assert.equal(summary.finalStatus, SPORTS_FINAL_STATUSES.NOT_PASSED);
});
