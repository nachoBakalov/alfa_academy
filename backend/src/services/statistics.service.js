const AppError = require('../utils/AppError');
const statisticsRepository = require('../repositories/statistics.repository');

const ALLOWED_ROLES = ['super_admin', 'admin', 'manager', 'coach'];
const CATEGORY_KEYS = ['social', 'sports', 'creativity'];
const PERIOD_PRESETS = ['current_week', 'previous_week', 'current_month', 'all', 'custom'];

function ensureCanViewStatistics(actor) {
  if (!ALLOWED_ROLES.includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function parseDateOrThrow(value) {
  const normalized = String(value || '');
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new AppError(400, 'Invalid date');
  }

  return parsed;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeDateString(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  return String(value).slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getMonday(date) {
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(date, diffToMonday);
}

function getCurrentUtcDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getCurrentWeekBounds() {
  const today = getCurrentUtcDate();
  const startDate = getMonday(today);
  const endDate = addDays(startDate, 6);

  return {
    startDate,
    endDate,
  };
}

function getPreviousWeekBounds() {
  const currentWeek = getCurrentWeekBounds();
  const startDate = addDays(currentWeek.startDate, -7);
  const endDate = addDays(startDate, 6);

  return {
    startDate,
    endDate,
  };
}

function getCurrentMonthBounds() {
  const today = getCurrentUtcDate();
  const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

  return {
    startDate,
    endDate,
  };
}

async function resolvePeriod(filters, groupIds) {
  const preset = PERIOD_PRESETS.includes(filters.preset) ? filters.preset : 'current_week';

  if (preset === 'current_week') {
    const bounds = getCurrentWeekBounds();
    return {
      preset,
      startDate: formatDate(bounds.startDate),
      endDate: formatDate(bounds.endDate),
    };
  }

  if (preset === 'previous_week') {
    const bounds = getPreviousWeekBounds();
    return {
      preset,
      startDate: formatDate(bounds.startDate),
      endDate: formatDate(bounds.endDate),
    };
  }

  if (preset === 'current_month') {
    const bounds = getCurrentMonthBounds();
    return {
      preset,
      startDate: formatDate(bounds.startDate),
      endDate: formatDate(bounds.endDate),
    };
  }

  if (preset === 'custom') {
    if (!filters.startDate || !filters.endDate) {
      throw new AppError(400, 'startDate and endDate are required for custom preset');
    }

    const startDate = parseDateOrThrow(filters.startDate);
    const endDate = parseDateOrThrow(filters.endDate);

    if (startDate.getTime() > endDate.getTime()) {
      throw new AppError(400, 'startDate must be before or equal to endDate');
    }

    return {
      preset,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  }

  const bounds = await statisticsRepository.getDataDateBounds(groupIds);

  if (bounds.minDate && bounds.maxDate) {
    return {
      preset,
      startDate: normalizeDateString(bounds.minDate),
      endDate: normalizeDateString(bounds.maxDate),
    };
  }

  const fallback = getCurrentWeekBounds();

  return {
    preset,
    startDate: formatDate(fallback.startDate),
    endDate: formatDate(fallback.endDate),
  };
}

function buildWeekBuckets(periodStartDate, periodEndDate) {
  const periodStart = parseDateOrThrow(periodStartDate);
  const periodEnd = parseDateOrThrow(periodEndDate);

  const firstWeekStart = getMonday(periodStart);
  const lastWeekStart = getMonday(periodEnd);

  const buckets = [];
  let cursor = new Date(firstWeekStart.getTime());

  while (cursor.getTime() <= lastWeekStart.getTime()) {
    const weekStartDate = formatDate(cursor);
    const weekEndDate = formatDate(addDays(cursor, 6));

    buckets.push({
      weekStartDate,
      weekEndDate,
    });

    cursor = addDays(cursor, 7);
  }

  return {
    firstWeekStartDate: formatDate(firstWeekStart),
    lastWeekStartDate: formatDate(lastWeekStart),
    weeksCount: buckets.length,
    weekBuckets: buckets,
  };
}

function clampCategoryBalls(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  const rounded = Math.round(numericValue);

  if (rounded < 0) {
    return 0;
  }

  if (rounded > 10) {
    return 10;
  }

  return rounded;
}

function calculatePercentage(part, total) {
  const numericPart = Number(part);
  const numericTotal = Number(total);

  if (!Number.isFinite(numericPart) || !Number.isFinite(numericTotal) || numericTotal <= 0) {
    return 0;
  }

  return Math.round((numericPart / numericTotal) * 100);
}

function buildCategoryTotalsShape() {
  return {
    social: 0,
    sports: 0,
    creativity: 0,
  };
}

function createEmptyWeeklyRecord(bucket) {
  return {
    weekStartDate: bucket.weekStartDate,
    weekEndDate: bucket.weekEndDate,
    socialBalls: 0,
    sportsBalls: 0,
    creativityBalls: 0,
  };
}

function buildGroupWeekMap(groups, weekBuckets) {
  const result = new Map();

  for (const group of groups) {
    const weeklyMap = new Map();

    for (const bucket of weekBuckets) {
      weeklyMap.set(bucket.weekStartDate, createEmptyWeeklyRecord(bucket));
    }

    result.set(group.id, weeklyMap);
  }

  return result;
}

function applyCategoryRows(groupWeekMap, rows, rowField, weeklyFieldName) {
  for (const row of rows || []) {
    const groupId = Number(row.group_id);
    const weekStartDate = normalizeDateString(row.week_start_date);

    if (!groupWeekMap.has(groupId) || !weekStartDate) {
      continue;
    }

    const weeklyMap = groupWeekMap.get(groupId);

    if (!weeklyMap.has(weekStartDate)) {
      continue;
    }

    const record = weeklyMap.get(weekStartDate);
    record[weeklyFieldName] = clampCategoryBalls(row[rowField]);
  }
}

function resolveAcademyPayload(groups, requestedAcademyId) {
  if (requestedAcademyId !== undefined) {
    const match = groups.find((group) => Number(group.academy.id) === Number(requestedAcademyId));
    return match ? { ...match.academy } : null;
  }

  const academyMap = new Map();

  for (const group of groups) {
    academyMap.set(Number(group.academy.id), group.academy);
  }

  if (academyMap.size === 1) {
    return { ...Array.from(academyMap.values())[0] };
  }

  return null;
}

function buildGroupStatistics(groups, weekBuckets, groupWeekMap, weeksCount) {
  const periodCategoryMax = weeksCount * 10;
  const periodGroupMax = weeksCount * 30;

  return groups.map((group) => {
    const weeklyMap = groupWeekMap.get(group.id);
    const categoryTotals = buildCategoryTotalsShape();

    const weeklyBreakdown = weekBuckets.map((bucket) => {
      const record = weeklyMap.get(bucket.weekStartDate) || createEmptyWeeklyRecord(bucket);
      const totalBalls = record.socialBalls + record.sportsBalls + record.creativityBalls;

      categoryTotals.social += record.socialBalls;
      categoryTotals.sports += record.sportsBalls;
      categoryTotals.creativity += record.creativityBalls;

      return {
        weekStartDate: bucket.weekStartDate,
        weekEndDate: bucket.weekEndDate,
        socialBalls: record.socialBalls,
        sportsBalls: record.sportsBalls,
        creativityBalls: record.creativityBalls,
        totalBalls,
        maxBalls: 30,
      };
    });

    const totalBalls = weeklyBreakdown.reduce((sum, row) => sum + row.totalBalls, 0);

    return {
      id: Number(group.id),
      name: group.name,
      academy: {
        id: Number(group.academy.id),
        name: group.academy.name,
      },
      totalBalls,
      maxBalls: periodGroupMax,
      percentage: calculatePercentage(totalBalls, periodGroupMax),
      categories: {
        social: {
          balls: categoryTotals.social,
          maxBalls: periodCategoryMax,
          percentage: calculatePercentage(categoryTotals.social, periodCategoryMax),
        },
        sports: {
          balls: categoryTotals.sports,
          maxBalls: periodCategoryMax,
          percentage: calculatePercentage(categoryTotals.sports, periodCategoryMax),
        },
        creativity: {
          balls: categoryTotals.creativity,
          maxBalls: periodCategoryMax,
          percentage: calculatePercentage(categoryTotals.creativity, periodCategoryMax),
        },
      },
      weeklyBreakdown,
    };
  });
}

function buildOverviewTotals(groupStatistics, weeksCount) {
  const groupsCount = groupStatistics.length;
  const maxBalls = groupsCount * weeksCount * 30;

  const totalBalls = groupStatistics.reduce((sum, group) => sum + group.totalBalls, 0);

  const categoryBalls = {
    social: 0,
    sports: 0,
    creativity: 0,
  };

  for (const group of groupStatistics) {
    categoryBalls.social += group.categories.social.balls;
    categoryBalls.sports += group.categories.sports.balls;
    categoryBalls.creativity += group.categories.creativity.balls;
  }

  const categoryMax = groupsCount * weeksCount * 10;

  return {
    totals: {
      groupsCount,
      totalBalls,
      maxBalls,
      percentage: calculatePercentage(totalBalls, maxBalls),
    },
    categoryTotals: {
      social: {
        balls: categoryBalls.social,
        maxBalls: categoryMax,
        percentage: calculatePercentage(categoryBalls.social, categoryMax),
      },
      sports: {
        balls: categoryBalls.sports,
        maxBalls: categoryMax,
        percentage: calculatePercentage(categoryBalls.sports, categoryMax),
      },
      creativity: {
        balls: categoryBalls.creativity,
        maxBalls: categoryMax,
        percentage: calculatePercentage(categoryBalls.creativity, categoryMax),
      },
    },
  };
}

function sortLeaderboardGroups(groups) {
  return [...groups].sort((left, right) => {
    if (right.totalBalls !== left.totalBalls) {
      return right.totalBalls - left.totalBalls;
    }

    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage;
    }

    return left.name.localeCompare(right.name, 'bg');
  });
}

async function buildStatisticsContext(filters, actor) {
  ensureCanViewStatistics(actor);

  const accessibleGroupsRows = await statisticsRepository.listAccessibleGroups(actor, {
    academyId: filters.academyId,
    groupId: filters.groupId,
  });

  if (filters.groupId !== undefined && accessibleGroupsRows.length === 0) {
    if (actor.role === 'coach') {
      throw new AppError(403, 'Нямате достъп до тази група.');
    }

    throw new AppError(404, 'Group not found');
  }

  const groups = accessibleGroupsRows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    academy: {
      id: Number(row.academy_id),
      name: row.academy_name,
    },
  }));

  const groupIds = groups.map((group) => group.id);
  const period = await resolvePeriod(filters, groupIds);

  const { firstWeekStartDate, lastWeekStartDate, weeksCount, weekBuckets } = buildWeekBuckets(
    period.startDate,
    period.endDate
  );

  const [socialRows, sportsRows, creativityRows] = await Promise.all([
    statisticsRepository.getSocialWeeklyBuckets(groupIds, firstWeekStartDate, lastWeekStartDate),
    statisticsRepository.getSportsWeeklyBuckets(groupIds, firstWeekStartDate, lastWeekStartDate),
    statisticsRepository.getCreativityWeeklyBuckets(groupIds, firstWeekStartDate, lastWeekStartDate),
  ]);

  const groupWeekMap = buildGroupWeekMap(groups, weekBuckets);

  applyCategoryRows(groupWeekMap, socialRows, 'social_balls', 'socialBalls');
  applyCategoryRows(groupWeekMap, sportsRows, 'sports_balls', 'sportsBalls');
  applyCategoryRows(groupWeekMap, creativityRows, 'creativity_balls', 'creativityBalls');

  const groupStatistics = buildGroupStatistics(groups, weekBuckets, groupWeekMap, weeksCount);

  return {
    period: {
      ...period,
      weeksCount,
    },
    groups,
    groupStatistics,
  };
}

async function getGroupOverview(filters, actor) {
  const context = await buildStatisticsContext(filters, actor);
  const sortedGroups = [...context.groupStatistics].sort((left, right) =>
    left.name.localeCompare(right.name, 'bg')
  );

  const overviewTotals = buildOverviewTotals(sortedGroups, context.period.weeksCount);

  return {
    period: context.period,
    academy: resolveAcademyPayload(context.groups, filters.academyId),
    totals: overviewTotals.totals,
    categoryTotals: overviewTotals.categoryTotals,
    groups: sortedGroups,
  };
}

async function getGroupLeaderboard(filters, actor) {
  const context = await buildStatisticsContext(filters, actor);
  const sorted = sortLeaderboardGroups(context.groupStatistics);

  const groups = sorted.map((group, index) => ({
    rank: index + 1,
    id: group.id,
    name: group.name,
    academy: group.academy,
    totalBalls: group.totalBalls,
    maxBalls: group.maxBalls,
    percentage: group.percentage,
    categories: {
      social: group.categories.social.balls,
      sports: group.categories.sports.balls,
      creativity: group.categories.creativity.balls,
    },
  }));

  return {
    period: context.period,
    maxBalls: context.period.weeksCount * 30,
    groups,
  };
}

module.exports = {
  getGroupOverview,
  getGroupLeaderboard,
};
