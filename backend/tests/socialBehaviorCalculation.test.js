const test = require('node:test');
const assert = require('node:assert/strict');

const {
  WEEKLY_STATUSES,
  colorToInternalPoints,
  calculateChildDailyResult,
  calculateDailySummary,
  calculateWeeklyAlphaBalls,
  calculateWeeklyStatus,
  calculateWeeklySummary,
} = require('../src/services/socialBehaviorCalculation.service');

test('colorToInternalPoints maps green/orange/red and throws on invalid color', () => {
  assert.equal(colorToInternalPoints('green'), 1);
  assert.equal(colorToInternalPoints('orange'), 0);
  assert.equal(colorToInternalPoints('red'), -1);
  assert.throws(() => colorToInternalPoints('blue'));
});

test('calculateChildDailyResult returns expected values for key combinations', () => {
  assert.deepEqual(
    calculateChildDailyResult({
      coachRelationColor: 'green',
      childrenRelationColor: 'green',
      rulesColor: 'green',
    }),
    {
      internalScore: 3,
      dailyStatus: 'green',
      externalPoints: 1,
    }
  );

  assert.deepEqual(
    calculateChildDailyResult({
      coachRelationColor: 'green',
      childrenRelationColor: 'orange',
      rulesColor: 'green',
    }),
    {
      internalScore: 2,
      dailyStatus: 'green',
      externalPoints: 1,
    }
  );

  assert.deepEqual(
    calculateChildDailyResult({
      coachRelationColor: 'green',
      childrenRelationColor: 'orange',
      rulesColor: 'orange',
    }),
    {
      internalScore: 1,
      dailyStatus: 'orange',
      externalPoints: 0,
    }
  );

  assert.deepEqual(
    calculateChildDailyResult({
      coachRelationColor: 'orange',
      childrenRelationColor: 'orange',
      rulesColor: 'orange',
    }),
    {
      internalScore: 0,
      dailyStatus: 'orange',
      externalPoints: 0,
    }
  );

  assert.deepEqual(
    calculateChildDailyResult({
      coachRelationColor: 'red',
      childrenRelationColor: 'red',
      rulesColor: 'green',
    }),
    {
      internalScore: -1,
      dailyStatus: 'red',
      externalPoints: -1,
    }
  );

  assert.deepEqual(
    calculateChildDailyResult({
      coachRelationColor: 'red',
      childrenRelationColor: 'red',
      rulesColor: 'red',
    }),
    {
      internalScore: -3,
      dailyStatus: 'red',
      externalPoints: -1,
    }
  );
});

test('calculateDailySummary aggregates 3 children correctly', () => {
  const summary = calculateDailySummary([
    {
      coachRelationColor: 'green',
      childrenRelationColor: 'green',
      rulesColor: 'orange',
    },
    {
      coachRelationColor: 'green',
      childrenRelationColor: 'orange',
      rulesColor: 'red',
    },
    {
      coachRelationColor: 'red',
      childrenRelationColor: 'red',
      rulesColor: 'green',
    },
  ]);

  assert.equal(summary.numberOfChildren, 3);
  assert.equal(summary.internalDailyMaximum, 9);
  assert.equal(summary.externalDailyMaximum, 3);
  assert.equal(summary.dailySocialResult, 0);
  assert.equal(summary.greenChildrenCount, 1);
  assert.equal(summary.orangeChildrenCount, 1);
  assert.equal(summary.redChildrenCount, 1);
  assert.equal(summary.evaluations.length, 3);
});

test('calculateWeeklyAlphaBalls applies floor and clamps between 0 and 10', () => {
  assert.equal(
    calculateWeeklyAlphaBalls({ weeklySocialResult: 65, weeklyMaximum: 75 }),
    8
  );
  assert.equal(
    calculateWeeklyAlphaBalls({ weeklySocialResult: 75, weeklyMaximum: 75 }),
    10
  );
  assert.equal(
    calculateWeeklyAlphaBalls({ weeklySocialResult: -5, weeklyMaximum: 75 }),
    0
  );
  assert.equal(
    calculateWeeklyAlphaBalls({ weeklySocialResult: 100, weeklyMaximum: 75 }),
    10
  );
  assert.equal(
    calculateWeeklyAlphaBalls({ weeklySocialResult: 10, weeklyMaximum: 0 }),
    0
  );
});

test('calculateWeeklyStatus returns target_reached for 8..10', () => {
  assert.equal(calculateWeeklyStatus(8), WEEKLY_STATUSES.TARGET_REACHED);
  assert.equal(calculateWeeklyStatus(10), WEEKLY_STATUSES.TARGET_REACHED);
  assert.equal(calculateWeeklyStatus(7), WEEKLY_STATUSES.TARGET_NOT_REACHED);
  assert.equal(calculateWeeklyStatus(0), WEEKLY_STATUSES.TARGET_NOT_REACHED);
});

test('calculateWeeklySummary returns expected totals and status', () => {
  const weekly = calculateWeeklySummary({
    numberOfChildren: 15,
    activeDaysCount: 5,
    dailySummaries: [
      {
        isActiveDay: true,
        dailySocialResult: 13,
        externalDailyMaximum: 15,
      },
      {
        isActiveDay: true,
        dailySocialResult: 11,
        externalDailyMaximum: 15,
      },
      {
        isActiveDay: true,
        dailySocialResult: 14,
        externalDailyMaximum: 15,
      },
      {
        isActiveDay: true,
        dailySocialResult: 12,
        externalDailyMaximum: 15,
      },
      {
        isActiveDay: true,
        dailySocialResult: 15,
        externalDailyMaximum: 15,
      },
    ],
  });

  assert.equal(weekly.weeklySocialResult, 65);
  assert.equal(weekly.weeklyMaximum, 75);
  assert.equal(weekly.weeklyAlphaBalls, 8);
  assert.equal(weekly.weeklyStatus, WEEKLY_STATUSES.TARGET_REACHED);
  assert.equal(weekly.weeklyPercentage, 86.67);
});
