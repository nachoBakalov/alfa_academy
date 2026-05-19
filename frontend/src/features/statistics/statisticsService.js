import apiClient from '../../services/apiClient';
import { sanitizeParams, toNumber } from './statisticsFormatters';

function normalizePeriod(period = {}) {
  return {
    preset: period.preset || 'current_week',
    startDate: period.startDate || null,
    endDate: period.endDate || null,
    weeksCount: toNumber(period.weeksCount, 1),
  };
}

function normalizeCategory(category = {}, fallbackMax = 0) {
  return {
    balls: toNumber(category.balls, 0),
    maxBalls: toNumber(category.maxBalls, fallbackMax),
    percentage: toNumber(category.percentage, 0),
  };
}

function normalizeOverviewGroup(group = {}) {
  const weeksCount = toNumber(group?.weeklyBreakdown?.length, 0);
  const categoryMax = weeksCount * 10;

  return {
    id: toNumber(group.id),
    name: group.name || '',
    academy: {
      id: toNumber(group.academy?.id),
      name: group.academy?.name || '',
    },
    totalBalls: toNumber(group.totalBalls, 0),
    maxBalls: toNumber(group.maxBalls, weeksCount * 30),
    percentage: toNumber(group.percentage, 0),
    categories: {
      social: normalizeCategory(group.categories?.social, categoryMax),
      sports: normalizeCategory(group.categories?.sports, categoryMax),
      creativity: normalizeCategory(group.categories?.creativity, categoryMax),
    },
    weeklyBreakdown: (group.weeklyBreakdown || []).map((row) => ({
      weekStartDate: row.weekStartDate || null,
      weekEndDate: row.weekEndDate || null,
      socialBalls: toNumber(row.socialBalls, 0),
      sportsBalls: toNumber(row.sportsBalls, 0),
      creativityBalls: toNumber(row.creativityBalls, 0),
      totalBalls: toNumber(row.totalBalls, 0),
      maxBalls: toNumber(row.maxBalls, 30),
    })),
  };
}

function normalizeLeaderboardGroup(group = {}, fallbackMax = 0) {
  return {
    rank: toNumber(group.rank, 0),
    id: toNumber(group.id),
    name: group.name || '',
    academy: {
      id: toNumber(group.academy?.id),
      name: group.academy?.name || '',
    },
    totalBalls: toNumber(group.totalBalls, 0),
    maxBalls: toNumber(group.maxBalls, fallbackMax),
    percentage: toNumber(group.percentage, 0),
    categories: {
      social: toNumber(group.categories?.social, 0),
      sports: toNumber(group.categories?.sports, 0),
      creativity: toNumber(group.categories?.creativity, 0),
    },
  };
}

async function getGroupOverview(params = {}) {
  const { data } = await apiClient.get('/statistics/group-overview', {
    params: sanitizeParams(params),
  });

  const period = normalizePeriod(data.period || {});
  const categoryMax = toNumber(period.weeksCount, 1) * 10;
  const groups = (data.groups || []).map(normalizeOverviewGroup);

  return {
    period,
    academy: data.academy
      ? {
          id: toNumber(data.academy.id),
          name: data.academy.name || '',
        }
      : null,
    totals: {
      groupsCount: toNumber(data.totals?.groupsCount, groups.length),
      totalBalls: toNumber(data.totals?.totalBalls, 0),
      maxBalls: toNumber(data.totals?.maxBalls, 0),
      percentage: toNumber(data.totals?.percentage, 0),
    },
    categoryTotals: {
      social: normalizeCategory(data.categoryTotals?.social, categoryMax),
      sports: normalizeCategory(data.categoryTotals?.sports, categoryMax),
      creativity: normalizeCategory(data.categoryTotals?.creativity, categoryMax),
    },
    groups,
  };
}

async function getGroupLeaderboard(params = {}) {
  const { data } = await apiClient.get('/statistics/group-leaderboard', {
    params: sanitizeParams(params),
  });

  const period = normalizePeriod(data.period || {});
  const maxBalls = toNumber(data.maxBalls, period.weeksCount * 30);

  return {
    period,
    maxBalls,
    groups: (data.groups || []).map((group) => normalizeLeaderboardGroup(group, maxBalls)),
  };
}

export default {
  getGroupOverview,
  getGroupLeaderboard,
};
