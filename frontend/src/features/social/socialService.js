import apiClient from '../../services/apiClient';
import { formatDayOfWeek } from './socialDateUtils';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeGroup(group = {}) {
  return {
    id: Number(group.id),
    name: group.name || '',
    isActive: Boolean(group.isActive),
    season: group.season
      ? {
          id: Number(group.season.id),
          name: group.season.name || '',
        }
      : null,
    academy: group.academy
      ? {
          id: Number(group.academy.id),
          name: group.academy.name || '',
        }
      : null,
  };
}

function normalizeDailySummary(summary = {}) {
  return {
    numberOfChildren: Number(summary.numberOfChildren || 0),
    internalDailyMaximum: Number(summary.internalDailyMaximum || 0),
    externalDailyMaximum: Number(summary.externalDailyMaximum || 0),
    dailySocialResult: Number(summary.dailySocialResult || 0),
    greenChildrenCount: Number(summary.greenChildrenCount || 0),
    orangeChildrenCount: Number(summary.orangeChildrenCount || 0),
    redChildrenCount: Number(summary.redChildrenCount || 0),
    completedChildrenCount: Number(summary.completedChildrenCount || 0),
    missingChildrenCount: Number(summary.missingChildrenCount || 0),
  };
}

function normalizeDailyChild(child = {}) {
  return {
    id: Number(child.id),
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    evaluation: child.evaluation
      ? {
          coachRelationColor: child.evaluation.coachRelationColor || null,
          childrenRelationColor: child.evaluation.childrenRelationColor || null,
          rulesColor: child.evaluation.rulesColor || null,
          internalScore: child.evaluation.internalScore,
          dailyStatus: child.evaluation.dailyStatus || null,
          externalPoints: child.evaluation.externalPoints,
          optionalComment: child.evaluation.optionalComment || '',
        }
      : null,
  };
}

function normalizeGroupMeta(group = {}) {
  return {
    id: Number(group.id),
    name: group.name || '',
    season: group.season
      ? {
          id: Number(group.season.id),
          name: group.season.name || '',
        }
      : null,
    academy: group.academy
      ? {
          id: Number(group.academy.id),
          name: group.academy.name || '',
        }
      : null,
  };
}

function normalizeWeeklyDay(day = {}) {
  const dayOfWeek = Number(day.dayOfWeek || 0);

  return {
    date: day.date || null,
    dayOfWeek,
    label: day.label || formatDayOfWeek(dayOfWeek),
    isActiveDay: Boolean(day.isActiveDay),
    numberOfChildren: Number(day.numberOfChildren || 0),
    externalDailyMaximum: Number(day.externalDailyMaximum || 0),
    dailySocialResult: Number(day.dailySocialResult || 0),
    greenChildrenCount: Number(day.greenChildrenCount || 0),
    orangeChildrenCount: Number(day.orangeChildrenCount || 0),
    redChildrenCount: Number(day.redChildrenCount || 0),
    completedChildrenCount: Number(day.completedChildrenCount || 0),
    missingChildrenCount: Number(day.missingChildrenCount || 0),
  };
}

function normalizeWeeklySummary(summary = {}) {
  return {
    activeDaysCount: Number(summary.activeDaysCount || 0),
    numberOfChildren: Number(summary.numberOfChildren || 0),
    weeklyMaximum: Number(summary.weeklyMaximum || 0),
    weeklySocialResult: Number(summary.weeklySocialResult || 0),
    weeklyPercentage: Number(summary.weeklyPercentage || 0),
    weeklyAlphaBalls: Number(summary.weeklyAlphaBalls || 0),
    weeklyStatus: summary.weeklyStatus || null,
    targetAlphaBalls: Number(summary.targetAlphaBalls || 8),
    maxAlphaBalls: Number(summary.maxAlphaBalls || 10),
  };
}

async function listGroups(params = {}) {
  const mergedParams = {
    isActive: true,
    limit: 100,
    offset: 0,
    ...params,
  };

  const { data } = await apiClient.get('/groups', {
    params: sanitizeParams(mergedParams),
  });

  return {
    groups: (data.groups || []).map(normalizeGroup),
    pagination: data.pagination || { limit: 100, offset: 0, total: 0 },
  };
}

async function getGroupActiveDays(groupId) {
  const { data } = await apiClient.get(`/social/groups/${groupId}/active-days`);

  return {
    groupId: Number(data.groupId),
    activeDays: (data.activeDays || []).map((day) => ({
      dayOfWeek: Number(day.dayOfWeek),
      label: day.label || formatDayOfWeek(Number(day.dayOfWeek)),
      isActive: Boolean(day.isActive),
    })),
  };
}

async function updateGroupActiveDays(groupId, activeDays) {
  const { data } = await apiClient.put(`/social/groups/${groupId}/active-days`, {
    activeDays,
  });

  return {
    groupId: Number(data.groupId),
    activeDays: (data.activeDays || []).map((day) => ({
      dayOfWeek: Number(day.dayOfWeek),
      label: day.label || formatDayOfWeek(Number(day.dayOfWeek)),
      isActive: Boolean(day.isActive),
    })),
  };
}

async function getDailyEvaluation(groupId, date) {
  const { data } = await apiClient.get(`/social/groups/${groupId}/daily`, {
    params: { date },
  });

  return {
    group: normalizeGroupMeta(data.group || {}),
    date: data.date || date,
    dayOfWeek: Number(data.dayOfWeek || 0),
    isActiveDay: Boolean(data.isActiveDay),
    children: (data.children || []).map(normalizeDailyChild),
    summary: normalizeDailySummary(data.summary || {}),
  };
}

async function saveDailyEvaluations(groupId, payload) {
  const { data } = await apiClient.put(`/social/groups/${groupId}/daily`, payload);

  return {
    date: data.date || payload.date,
    savedCount: Number(data.savedCount || 0),
    evaluations: (data.evaluations || []).map((evaluation) => ({
      childId: Number(evaluation.childId),
      internalScore: evaluation.internalScore,
      dailyStatus: evaluation.dailyStatus || null,
      externalPoints: evaluation.externalPoints,
    })),
    summary: normalizeDailySummary(data.summary || {}),
  };
}

async function getDailySummary(groupId, date) {
  const { data } = await apiClient.get(`/social/groups/${groupId}/daily/summary`, {
    params: { date },
  });

  return {
    groupId: Number(data.groupId),
    date: data.date || date,
    isActiveDay: Boolean(data.isActiveDay),
    summary: normalizeDailySummary(data.summary || {}),
  };
}

async function getWeeklySummary(groupId, weekStartDate) {
  const { data } = await apiClient.get(`/social/groups/${groupId}/weekly`, {
    params: { weekStartDate },
  });

  return {
    group: normalizeGroupMeta(data.group || {}),
    week: {
      weekStartDate: data.week?.weekStartDate || weekStartDate,
      weekEndDate: data.week?.weekEndDate || null,
    },
    days: (data.days || []).map(normalizeWeeklyDay),
    summary: normalizeWeeklySummary(data.summary || {}),
    persisted: {
      exists: Boolean(data.persisted?.exists),
      calculatedAt: data.persisted?.calculatedAt || null,
    },
  };
}

async function recalculateWeeklySummary(groupId, weekStartDate) {
  const { data } = await apiClient.post(`/social/groups/${groupId}/weekly/recalculate`, {
    weekStartDate,
  });

  return {
    message: data.message || 'Weekly social summary recalculated successfully',
    group: normalizeGroupMeta(data.group || {}),
    week: {
      weekStartDate: data.week?.weekStartDate || weekStartDate,
      weekEndDate: data.week?.weekEndDate || null,
    },
    days: (data.days || []).map(normalizeWeeklyDay),
    summary: normalizeWeeklySummary(data.summary || {}),
  };
}

export default {
  listGroups,
  getGroupActiveDays,
  updateGroupActiveDays,
  getDailyEvaluation,
  saveDailyEvaluations,
  getDailySummary,
  getWeeklySummary,
  recalculateWeeklySummary,
};
