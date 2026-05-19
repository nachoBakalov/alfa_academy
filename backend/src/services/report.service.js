const AppError = require('../utils/AppError');
const groupRepository = require('../repositories/group.repository');
const reportRepository = require('../repositories/report.repository');

const ALLOWED_REPORT_ROLES = ['super_admin', 'admin', 'manager', 'coach'];

function parseDateOrThrow(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, 'Invalid date');
  }

  return parsed;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getIsoDayOfWeek(dateString) {
  const parsed = parseDateOrThrow(dateString);
  const day = parsed.getUTCDay();
  return day === 0 ? 7 : day;
}

function ensureCanViewReports(actor) {
  if (!ALLOWED_REPORT_ROLES.includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCanViewGroupReports(actor, groupId) {
  ensureCanViewReports(actor);

  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await groupRepository.coachCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'You do not have access to this group');
  }
}

function getCurrentMonday() {
  const now = new Date();
  const utcToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = utcToday.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  return formatDate(addDays(utcToday, diffToMonday));
}

function getWeekEndDate(weekStartDate) {
  const start = parseDateOrThrow(weekStartDate);
  return formatDate(addDays(start, 6));
}

function ensureWeekStartIsMonday(weekStartDate) {
  if (getIsoDayOfWeek(weekStartDate) !== 1) {
    throw new AppError(400, 'weekStartDate must be a Monday');
  }
}

function roundToTwo(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.round(numericValue * 100) / 100;
}

function calculatePercentage(part, total) {
  const numericPart = Number(part);
  const numericTotal = Number(total);

  if (!Number.isFinite(numericPart) || !Number.isFinite(numericTotal) || numericTotal <= 0) {
    return 0;
  }

  return roundToTwo((numericPart / numericTotal) * 100);
}

function resolveWeekStartDate(inputWeekStartDate) {
  const weekStartDate = inputWeekStartDate || getCurrentMonday();
  ensureWeekStartIsMonday(weekStartDate);
  return weekStartDate;
}

function buildZeroDashboard(scope) {
  return {
    dashboard: {
      scope,
      counts: {
        activeAcademies: 0,
        activeSeasons: 0,
        activeGroups: 0,
        activeChildren: 0,
        activeCoaches: 0,
      },
      questionnaires: {
        pending: 0,
        submitted: 0,
        expired: 0,
        revoked: 0,
        expiringSoon: 0,
      },
      comfortZone: {
        childrenWithProfile: 0,
        childrenWithoutProfile: 0,
        profileCompletionPercentage: 0,
      },
      social: {
        weekStartDate: scope.weekStartDate,
        groupsWithWeeklySummary: 0,
        targetReachedGroups: 0,
        targetNotReachedGroups: 0,
        averageAlphaBalls: 0,
      },
      sports: {
        activeChallenges: 0,
        completedChallenges: 0,
        passedChallenges: 0,
        notPassedChallenges: 0,
      },
    },
  };
}

function normalizeQuestionnaireStatus(status, expiresAt) {
  if (!status) {
    return null;
  }

  if (status !== 'pending' || !expiresAt) {
    return status;
  }

  const expiresAtDate = new Date(expiresAt);

  if (Number.isNaN(expiresAtDate.getTime())) {
    return status;
  }

  return expiresAtDate.getTime() < Date.now() ? 'expired' : status;
}

async function getDashboard(filters, actor) {
  ensureCanViewReports(actor);

  const weekStartDate = resolveWeekStartDate(filters.weekStartDate);
  const weekEndDate = getWeekEndDate(weekStartDate);

  if (filters.groupId !== undefined) {
    const group = await groupRepository.findByIdWithSeasonAndAcademy(filters.groupId);

    if (!group) {
      throw new AppError(404, 'Group not found');
    }

    await ensureCanViewGroupReports(actor, filters.groupId);
  }

  const accessibleGroupIds = await reportRepository.getAccessibleGroupIds(actor, filters);

  const scope = {
    academyId: filters.academyId ?? null,
    seasonId: filters.seasonId ?? null,
    groupId: filters.groupId ?? null,
    weekStartDate,
    weekEndDate,
  };

  if (accessibleGroupIds.length === 0) {
    return buildZeroDashboard(scope);
  }

  const [counts, questionnaires, comfortZone, social, sports] = await Promise.all([
    reportRepository.getDashboardCounts(accessibleGroupIds),
    reportRepository.getQuestionnaireStats(accessibleGroupIds),
    reportRepository.getComfortZoneStats(accessibleGroupIds),
    reportRepository.getSocialWeeklyStats(accessibleGroupIds, weekStartDate),
    reportRepository.getSportsStats(accessibleGroupIds),
  ]);

  const childrenWithProfile = Number(comfortZone.childrenWithProfile || 0);
  const childrenWithoutProfile = Math.max(0, Number(counts.activeChildren || 0) - childrenWithProfile);

  return {
    dashboard: {
      scope,
      counts: {
        activeAcademies: Number(counts.activeAcademies || 0),
        activeSeasons: Number(counts.activeSeasons || 0),
        activeGroups: Number(counts.activeGroups || 0),
        activeChildren: Number(counts.activeChildren || 0),
        activeCoaches: Number(counts.activeCoaches || 0),
      },
      questionnaires: {
        pending: Number(questionnaires.pending || 0),
        submitted: Number(questionnaires.submitted || 0),
        expired: Number(questionnaires.expired || 0),
        revoked: Number(questionnaires.revoked || 0),
        expiringSoon: Number(questionnaires.expiringSoon || 0),
      },
      comfortZone: {
        childrenWithProfile,
        childrenWithoutProfile,
        profileCompletionPercentage: calculatePercentage(
          childrenWithProfile,
          Number(counts.activeChildren || 0)
        ),
      },
      social: {
        weekStartDate,
        groupsWithWeeklySummary: Number(social.groupsWithWeeklySummary || 0),
        targetReachedGroups: Number(social.targetReachedGroups || 0),
        targetNotReachedGroups: Number(social.targetNotReachedGroups || 0),
        averageAlphaBalls: roundToTwo(social.averageAlphaBalls || 0),
      },
      sports: {
        activeChallenges: Number(sports.activeChallenges || 0),
        completedChallenges: Number(sports.completedChallenges || 0),
        passedChallenges: Number(sports.passedChallenges || 0),
        notPassedChallenges: Number(sports.notPassedChallenges || 0),
      },
    },
  };
}

async function getGroupDashboard(groupId, filters, actor) {
  ensureCanViewReports(actor);

  const group = await reportRepository.getGroupDashboardBase(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  await ensureCanViewGroupReports(actor, groupId);

  const weekStartDate = resolveWeekStartDate(filters.weekStartDate);
  const requestedWeekEndDate = getWeekEndDate(weekStartDate);

  const [children, questionnaires, comfortZone, zoneSummary, socialSummary, sportsStats, latestChallenges] =
    await Promise.all([
      reportRepository.getGroupChildrenCounts(groupId),
      reportRepository.getQuestionnaireStats([groupId]),
      reportRepository.getComfortZoneStats([groupId]),
      reportRepository.getGroupComfortZoneZoneSummary(groupId),
      reportRepository.getGroupSocialWeeklySummary(groupId, weekStartDate),
      reportRepository.getSportsStats([groupId]),
      reportRepository.getGroupLatestSportsChallenges(groupId, 5),
    ]);

  const childrenWithProfile = Number(comfortZone.childrenWithProfile || 0);
  const activeChildren = Number(children.activeChildren || 0);

  return {
    groupDashboard: {
      group: {
        id: Number(group.id),
        name: group.name,
        season: {
          id: Number(group.season_id),
          name: group.season_name,
        },
        academy: {
          id: Number(group.academy_id),
          name: group.academy_name,
        },
      },
      children: {
        activeChildren,
        inactiveChildren: Number(children.inactiveChildren || 0),
      },
      questionnaires: {
        pending: Number(questionnaires.pending || 0),
        submitted: Number(questionnaires.submitted || 0),
        expired: Number(questionnaires.expired || 0),
        revoked: Number(questionnaires.revoked || 0),
        expiringSoon: Number(questionnaires.expiringSoon || 0),
      },
      comfortZone: {
        childrenWithProfile,
        childrenWithoutProfile: Math.max(0, activeChildren - childrenWithProfile),
        profileCompletionPercentage: calculatePercentage(childrenWithProfile, activeChildren),
        zoneSummary: {
          green: Number(zoneSummary.green || 0),
          yellow: Number(zoneSummary.yellow || 0),
          red: Number(zoneSummary.red || 0),
          behaviorIndicator: Number(zoneSummary.behaviorIndicator || 0),
          neutral: Number(zoneSummary.neutral || 0),
        },
      },
      social: {
        weekStartDate,
        weekEndDate: socialSummary ? socialSummary.week_end_date : requestedWeekEndDate,
        hasWeeklySummary: Boolean(socialSummary),
        weeklyAlphaBalls: socialSummary ? Number(socialSummary.weekly_alpha_balls) : null,
        weeklyStatus: socialSummary ? socialSummary.weekly_status : null,
        weeklySocialResult: socialSummary ? Number(socialSummary.weekly_social_result) : null,
        weeklyMaximum: socialSummary ? Number(socialSummary.weekly_maximum) : null,
        weeklyPercentage: socialSummary ? Number(socialSummary.weekly_percentage) : null,
      },
      sports: {
        activeChallenges: Number(sportsStats.activeChallenges || 0),
        completedChallenges: Number(sportsStats.completedChallenges || 0),
        latestChallenges: latestChallenges.map((row) => ({
          id: Number(row.id),
          title: row.title,
          status: row.status,
          finalStatus: row.final_status || null,
          participantsCount: Number(row.participants_count || 0),
          finalResultsCount: Number(row.final_results_count || 0),
        })),
      },
    },
  };
}

async function getGroupChildrenOverview(groupId, filters, actor) {
  ensureCanViewReports(actor);

  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  await ensureCanViewGroupReports(actor, groupId);

  const [rows, total] = await Promise.all([
    reportRepository.listGroupChildrenOverview(groupId, filters),
    reportRepository.countGroupChildrenOverview(groupId, filters),
  ]);

  return {
    children: rows.map((row) => ({
      id: Number(row.id),
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: Boolean(row.is_active),
      questionnaire: {
        status: normalizeQuestionnaireStatus(row.questionnaire_status, row.questionnaire_expires_at),
        expiresAt: row.questionnaire_expires_at || null,
        submittedAt: row.questionnaire_submitted_at || null,
      },
      comfortZone: {
        hasProfile: Boolean(row.comfort_has_profile),
        completedAt: row.comfort_completed_at || null,
      },
      social: {
        latestEvaluationDate: row.social_latest_evaluation_date || null,
        latestDailyStatus: row.social_latest_daily_status || null,
      },
      sports: {
        activeChallengesCount: Number(row.active_challenges_count || 0),
        completedResultsCount: Number(row.sports_completed_results_count || 0),
      },
    })),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

module.exports = {
  getDashboard,
  getGroupDashboard,
  getGroupChildrenOverview,
  ensureCanViewReports,
  ensureCanViewGroupReports,
  getCurrentMonday,
  getWeekEndDate,
  ensureWeekStartIsMonday,
  roundToTwo,
  calculatePercentage,
};
