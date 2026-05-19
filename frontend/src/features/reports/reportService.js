import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizePagination(pagination = {}, defaults = {}) {
  return {
    limit: toNumber(pagination.limit, defaults.limit ?? 50),
    offset: toNumber(pagination.offset, defaults.offset ?? 0),
    total: toNumber(pagination.total, defaults.total ?? 0),
  };
}

function normalizeCoach(coach = {}) {
  return {
    id: toNumber(coach.id || coach.coachId),
    email: coach.email || '',
    firstName: coach.firstName || '',
    lastName: coach.lastName || '',
    isPrimary: Boolean(coach.isPrimary),
  };
}

function normalizeGroup(group = {}) {
  return {
    id: toNumber(group.id),
    name: group.name || '',
    isActive: Boolean(group.isActive),
    season: group.season
      ? {
          id: toNumber(group.season.id),
          name: group.season.name || '',
        }
      : null,
    academy: group.academy
      ? {
          id: toNumber(group.academy.id),
          name: group.academy.name || '',
        }
      : null,
    coaches: (group.coaches || []).map(normalizeCoach),
  };
}

function normalizeDashboard(dashboard = {}) {
  return {
    scope: {
      academyId: dashboard.scope?.academyId ?? null,
      seasonId: dashboard.scope?.seasonId ?? null,
      groupId: dashboard.scope?.groupId ?? null,
      weekStartDate: dashboard.scope?.weekStartDate || null,
      weekEndDate: dashboard.scope?.weekEndDate || null,
    },
    counts: {
      activeAcademies: toNumber(dashboard.counts?.activeAcademies),
      activeSeasons: toNumber(dashboard.counts?.activeSeasons),
      activeGroups: toNumber(dashboard.counts?.activeGroups),
      activeChildren: toNumber(dashboard.counts?.activeChildren),
      activeCoaches: toNumber(dashboard.counts?.activeCoaches),
    },
    questionnaires: {
      pending: toNumber(dashboard.questionnaires?.pending),
      submitted: toNumber(dashboard.questionnaires?.submitted),
      expired: toNumber(dashboard.questionnaires?.expired),
      revoked: toNumber(dashboard.questionnaires?.revoked),
      expiringSoon: toNumber(dashboard.questionnaires?.expiringSoon),
    },
    comfortZone: {
      childrenWithProfile: toNumber(dashboard.comfortZone?.childrenWithProfile),
      childrenWithoutProfile: toNumber(dashboard.comfortZone?.childrenWithoutProfile),
      profileCompletionPercentage: toNumber(dashboard.comfortZone?.profileCompletionPercentage),
    },
    social: {
      weekStartDate: dashboard.social?.weekStartDate || dashboard.scope?.weekStartDate || null,
      groupsWithWeeklySummary: toNumber(dashboard.social?.groupsWithWeeklySummary),
      targetReachedGroups: toNumber(dashboard.social?.targetReachedGroups),
      targetNotReachedGroups: toNumber(dashboard.social?.targetNotReachedGroups),
      averageAlphaBalls: toNumber(dashboard.social?.averageAlphaBalls),
    },
    sports: {
      activeChallenges: toNumber(dashboard.sports?.activeChallenges),
      completedChallenges: toNumber(dashboard.sports?.completedChallenges),
      passedChallenges: toNumber(dashboard.sports?.passedChallenges),
      notPassedChallenges: toNumber(dashboard.sports?.notPassedChallenges),
    },
  };
}

function normalizeGroupDashboard(groupDashboard = {}) {
  return {
    group: {
      id: toNumber(groupDashboard.group?.id),
      name: groupDashboard.group?.name || '',
      season: {
        id: toNumber(groupDashboard.group?.season?.id),
        name: groupDashboard.group?.season?.name || '',
      },
      academy: {
        id: toNumber(groupDashboard.group?.academy?.id),
        name: groupDashboard.group?.academy?.name || '',
      },
    },
    children: {
      activeChildren: toNumber(groupDashboard.children?.activeChildren),
      inactiveChildren: toNumber(groupDashboard.children?.inactiveChildren),
    },
    questionnaires: {
      pending: toNumber(groupDashboard.questionnaires?.pending),
      submitted: toNumber(groupDashboard.questionnaires?.submitted),
      expired: toNumber(groupDashboard.questionnaires?.expired),
      revoked: toNumber(groupDashboard.questionnaires?.revoked),
      expiringSoon: toNumber(groupDashboard.questionnaires?.expiringSoon),
    },
    comfortZone: {
      childrenWithProfile: toNumber(groupDashboard.comfortZone?.childrenWithProfile),
      childrenWithoutProfile: toNumber(groupDashboard.comfortZone?.childrenWithoutProfile),
      profileCompletionPercentage: toNumber(groupDashboard.comfortZone?.profileCompletionPercentage),
      zoneSummary: {
        green: toNumber(groupDashboard.comfortZone?.zoneSummary?.green),
        yellow: toNumber(groupDashboard.comfortZone?.zoneSummary?.yellow),
        red: toNumber(groupDashboard.comfortZone?.zoneSummary?.red),
        behaviorIndicator: toNumber(groupDashboard.comfortZone?.zoneSummary?.behaviorIndicator),
        neutral: toNumber(groupDashboard.comfortZone?.zoneSummary?.neutral),
      },
    },
    social: {
      weekStartDate: groupDashboard.social?.weekStartDate || null,
      weekEndDate: groupDashboard.social?.weekEndDate || null,
      hasWeeklySummary: Boolean(groupDashboard.social?.hasWeeklySummary),
      weeklyAlphaBalls:
        groupDashboard.social?.weeklyAlphaBalls === null ||
        groupDashboard.social?.weeklyAlphaBalls === undefined
          ? null
          : toNumber(groupDashboard.social?.weeklyAlphaBalls),
      weeklyStatus: groupDashboard.social?.weeklyStatus || null,
      weeklySocialResult:
        groupDashboard.social?.weeklySocialResult === null ||
        groupDashboard.social?.weeklySocialResult === undefined
          ? null
          : toNumber(groupDashboard.social?.weeklySocialResult),
      weeklyMaximum:
        groupDashboard.social?.weeklyMaximum === null ||
        groupDashboard.social?.weeklyMaximum === undefined
          ? null
          : toNumber(groupDashboard.social?.weeklyMaximum),
      weeklyPercentage:
        groupDashboard.social?.weeklyPercentage === null ||
        groupDashboard.social?.weeklyPercentage === undefined
          ? null
          : toNumber(groupDashboard.social?.weeklyPercentage),
    },
    sports: {
      activeChallenges: toNumber(groupDashboard.sports?.activeChallenges),
      completedChallenges: toNumber(groupDashboard.sports?.completedChallenges),
      latestChallenges: (groupDashboard.sports?.latestChallenges || []).map((challenge) => ({
        id: toNumber(challenge.id),
        title: challenge.title || '',
        status: challenge.status || null,
        finalStatus: challenge.finalStatus || null,
        participantsCount: toNumber(challenge.participantsCount),
        finalResultsCount: toNumber(challenge.finalResultsCount),
      })),
    },
  };
}

function normalizeChildrenOverviewRow(child = {}) {
  return {
    id: toNumber(child.id),
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    isActive: Boolean(child.isActive),
    questionnaire: {
      status: child.questionnaire?.status || null,
      expiresAt: child.questionnaire?.expiresAt || null,
      submittedAt: child.questionnaire?.submittedAt || null,
    },
    comfortZone: {
      hasProfile: Boolean(child.comfortZone?.hasProfile),
      completedAt: child.comfortZone?.completedAt || null,
    },
    social: {
      latestEvaluationDate: child.social?.latestEvaluationDate || null,
      latestDailyStatus: child.social?.latestDailyStatus || null,
    },
    sports: {
      activeChallengesCount: toNumber(child.sports?.activeChallengesCount),
      completedResultsCount: toNumber(child.sports?.completedResultsCount),
    },
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
    pagination: normalizePagination(data.pagination, {
      limit: mergedParams.limit,
      offset: mergedParams.offset,
      total: 0,
    }),
  };
}

async function getDashboard(params = {}) {
  const { data } = await apiClient.get('/reports/dashboard', {
    params: sanitizeParams(params),
  });

  return {
    dashboard: normalizeDashboard(data.dashboard || {}),
  };
}

async function getGroupDashboard(groupId, params = {}) {
  const { data } = await apiClient.get(`/reports/groups/${groupId}/dashboard`, {
    params: sanitizeParams(params),
  });

  return {
    groupDashboard: normalizeGroupDashboard(data.groupDashboard || {}),
  };
}

async function getGroupChildrenOverview(groupId, params = {}) {
  const mergedParams = {
    limit: 50,
    offset: 0,
    ...params,
  };

  const { data } = await apiClient.get(`/reports/groups/${groupId}/children-overview`, {
    params: sanitizeParams(mergedParams),
  });

  return {
    children: (data.children || []).map(normalizeChildrenOverviewRow),
    pagination: normalizePagination(data.pagination, {
      limit: mergedParams.limit,
      offset: mergedParams.offset,
      total: 0,
    }),
  };
}

export default {
  listGroups,
  getDashboard,
  getGroupDashboard,
  getGroupChildrenOverview,
};
