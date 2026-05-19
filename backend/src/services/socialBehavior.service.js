const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const socialBehaviorRepository = require('../repositories/socialBehavior.repository');
const auditLogRepository = require('../repositories/auditLog.repository');
const {
  calculateChildDailyResult,
  calculateWeeklyAlphaBalls,
  calculateWeeklyStatus,
} = require('./socialBehaviorCalculation.service');

const DAY_LABELS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

function parseDateOrThrow(date) {
  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new AppError(400, 'Invalid date');
  }

  return parsed;
}

function getIsoDayOfWeek(date) {
  const parsed = parseDateOrThrow(date);
  const day = parsed.getUTCDay();
  return day === 0 ? 7 : day;
}

function formatDate(date) {
  if (typeof date === 'string') {
    return parseDateOrThrow(date).toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function getWeekEndDate(weekStartDate) {
  const start = parseDateOrThrow(weekStartDate);
  return formatDate(addDays(start, 6));
}

function buildWeekDates(weekStartDate) {
  const start = parseDateOrThrow(weekStartDate);
  const days = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const currentDate = addDays(start, offset);
    const dayOfWeek = getIsoDayOfWeek(formatDate(currentDate));

    days.push({
      date: formatDate(currentDate),
      dayOfWeek,
      label: DAY_LABELS[dayOfWeek],
    });
  }

  return days;
}

function ensureWeekStartIsMonday(weekStartDate) {
  if (getIsoDayOfWeek(weekStartDate) !== 1) {
    throw new AppError(400, 'weekStartDate must be a Monday');
  }
}

function getDefaultActiveDays() {
  return [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
    dayOfWeek,
    isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
  }));
}

function mapActiveDaysWithLabels(activeDays) {
  return activeDays.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    label: DAY_LABELS[day.dayOfWeek],
    isActive: day.isActive,
  }));
}

function buildResolvedActiveDays(rows) {
  const defaults = getDefaultActiveDays();

  if (!rows || rows.length === 0) {
    return defaults;
  }

  const map = new Map(defaults.map((day) => [day.dayOfWeek, day.isActive]));

  for (const row of rows) {
    map.set(Number(row.day_of_week), Boolean(row.is_active));
  }

  return defaults.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    isActive: Boolean(map.get(day.dayOfWeek)),
  }));
}

async function ensureGroupExists(groupId) {
  const group = await socialBehaviorRepository.getGroupWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  return group;
}

async function ensureCanViewGroupSocial(actor, groupId) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }

  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await socialBehaviorRepository.coachCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'You do not have access to this group');
  }
}

async function ensureCanEditGroupSocial(actor, groupId) {
  if (!['super_admin', 'admin', 'coach'].includes(actor.role)) {
    throw new AppError(
      403,
      'You do not have permission to edit social evaluations for this group'
    );
  }

  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await socialBehaviorRepository.coachCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'You do not have access to this group');
  }
}

function ensureCanEditActiveDays(actor) {
  if (!['super_admin', 'admin'].includes(actor.role)) {
    throw new AppError(
      403,
      'You do not have permission to edit social evaluations for this group'
    );
  }
}

async function resolveIsActiveDay(groupId, date, client) {
  const dayOfWeek = getIsoDayOfWeek(date);
  const activeDaysRows = await socialBehaviorRepository.getActiveDaysForGroup(groupId, client);
  const activeDays = buildResolvedActiveDays(activeDaysRows);
  const dayConfig = activeDays.find((day) => day.dayOfWeek === dayOfWeek);
  return dayConfig ? dayConfig.isActive : false;
}

function buildSummaryFromEvaluations(numberOfChildren, evaluations) {
  const summary = {
    numberOfChildren,
    internalDailyMaximum: numberOfChildren * 3,
    externalDailyMaximum: numberOfChildren,
    dailySocialResult: 0,
    greenChildrenCount: 0,
    orangeChildrenCount: 0,
    redChildrenCount: 0,
    completedChildrenCount: evaluations.length,
    missingChildrenCount: Math.max(0, numberOfChildren - evaluations.length),
  };

  for (const evaluation of evaluations) {
    summary.dailySocialResult += Number(evaluation.external_points) || 0;

    if (evaluation.daily_status === 'green') {
      summary.greenChildrenCount += 1;
    } else if (evaluation.daily_status === 'orange') {
      summary.orangeChildrenCount += 1;
    } else if (evaluation.daily_status === 'red') {
      summary.redChildrenCount += 1;
    }
  }

  return summary;
}

async function buildReadOnlyDailySummary(groupId, date, isActiveDay, client) {
  const children = await socialBehaviorRepository.getChildrenForGroupOnDate(groupId, date, client);
  const evaluations = await socialBehaviorRepository.getDailyEvaluationsForGroupDate(
    groupId,
    date,
    client
  );

  const childIds = new Set(children.map((child) => Number(child.id)));
  const evaluationsForChildren = evaluations.filter((evaluation) =>
    childIds.has(Number(evaluation.child_id))
  );

  const summary = buildSummaryFromEvaluations(children.length, evaluationsForChildren);

  return {
    isActiveDay,
    numberOfChildren: summary.numberOfChildren,
    externalDailyMaximum: summary.externalDailyMaximum,
    dailySocialResult: summary.dailySocialResult,
    greenChildrenCount: summary.greenChildrenCount,
    orangeChildrenCount: summary.orangeChildrenCount,
    redChildrenCount: summary.redChildrenCount,
    completedChildrenCount: summary.completedChildrenCount,
    missingChildrenCount: summary.missingChildrenCount,
  };
}

function calculateWeeklyFromDays(days) {
  const activeDays = days.filter((day) => day.isActiveDay);
  const activeDaysCount = activeDays.length;

  const weeklyMaximum = activeDays.reduce(
    (sum, day) => sum + (Number(day.externalDailyMaximum) || 0),
    0
  );

  const weeklySocialResult = activeDays.reduce(
    (sum, day) => sum + (Number(day.dailySocialResult) || 0),
    0
  );

  const numberOfChildren = activeDays.reduce(
    (maxValue, day) => Math.max(maxValue, Number(day.numberOfChildren) || 0),
    0
  );

  let weeklyPercentage = 0;

  if (weeklyMaximum > 0) {
    const rawPercentage = (weeklySocialResult / weeklyMaximum) * 100;
    weeklyPercentage = Math.round(Math.max(0, Math.min(100, rawPercentage)) * 100) / 100;
  }

  const weeklyAlphaBalls = calculateWeeklyAlphaBalls({
    weeklySocialResult,
    weeklyMaximum,
  });
  const weeklyStatus = calculateWeeklyStatus(weeklyAlphaBalls);

  return {
    activeDaysCount,
    numberOfChildren,
    weeklyMaximum,
    weeklySocialResult,
    weeklyPercentage,
    weeklyAlphaBalls,
    weeklyStatus,
    targetAlphaBalls: 8,
    maxAlphaBalls: 10,
  };
}

async function buildWeeklyDailyBreakdown(groupId, weekStartDate, client) {
  const weekDates = buildWeekDates(weekStartDate);
  const weekEndDate = weekDates[weekDates.length - 1].date;

  const [activeDayRows, persistedDailyRows] = await Promise.all([
    socialBehaviorRepository.getActiveDaysForGroup(groupId, client),
    socialBehaviorRepository.getDailySummariesForGroupRange(
      groupId,
      weekStartDate,
      weekEndDate,
      client
    ),
  ]);

  const resolvedActiveDays = buildResolvedActiveDays(activeDayRows);
  const isActiveByDayOfWeek = new Map(
    resolvedActiveDays.map((day) => [day.dayOfWeek, day.isActive])
  );
  const persistedByDate = new Map(
    persistedDailyRows.map((row) => [formatDate(row.summary_date), row])
  );

  const days = [];

  for (const weekDay of weekDates) {
    const isActiveDay = Boolean(isActiveByDayOfWeek.get(weekDay.dayOfWeek));
    const persisted = persistedByDate.get(weekDay.date);

    if (persisted) {
      const readOnly = await buildReadOnlyDailySummary(groupId, weekDay.date, isActiveDay, client);

      days.push({
        date: weekDay.date,
        dayOfWeek: weekDay.dayOfWeek,
        label: weekDay.label,
        isActiveDay,
        numberOfChildren: Number(persisted.number_of_children) || 0,
        externalDailyMaximum: Number(persisted.external_daily_maximum) || 0,
        dailySocialResult: Number(persisted.daily_social_result) || 0,
        greenChildrenCount: Number(persisted.green_children_count) || 0,
        orangeChildrenCount: Number(persisted.orange_children_count) || 0,
        redChildrenCount: Number(persisted.red_children_count) || 0,
        completedChildrenCount: readOnly.completedChildrenCount,
        missingChildrenCount: Math.max(
          0,
          (Number(persisted.number_of_children) || 0) - readOnly.completedChildrenCount
        ),
      });

      continue;
    }

    const readOnly = await buildReadOnlyDailySummary(groupId, weekDay.date, isActiveDay, client);

    days.push({
      date: weekDay.date,
      dayOfWeek: weekDay.dayOfWeek,
      label: weekDay.label,
      isActiveDay: readOnly.isActiveDay,
      numberOfChildren: readOnly.numberOfChildren,
      externalDailyMaximum: readOnly.externalDailyMaximum,
      dailySocialResult: readOnly.dailySocialResult,
      greenChildrenCount: readOnly.greenChildrenCount,
      orangeChildrenCount: readOnly.orangeChildrenCount,
      redChildrenCount: readOnly.redChildrenCount,
      completedChildrenCount: readOnly.completedChildrenCount,
      missingChildrenCount: readOnly.missingChildrenCount,
    });
  }

  return days;
}

function buildDailyScreen(children, evaluations, summary) {
  const evaluationsByChildId = new Map(
    evaluations.map((evaluation) => [Number(evaluation.child_id), evaluation])
  );

  return {
    children: children.map((child) => {
      const childId = Number(child.id);
      const evaluation = evaluationsByChildId.get(childId);

      return {
        id: childId,
        firstName: child.first_name,
        lastName: child.last_name,
        evaluation: evaluation
          ? {
              coachRelationColor: evaluation.coach_relation_color,
              childrenRelationColor: evaluation.children_relation_color,
              rulesColor: evaluation.rules_color,
              internalScore: evaluation.internal_score,
              dailyStatus: evaluation.daily_status,
              externalPoints: evaluation.external_points,
              optionalComment: evaluation.optional_comment,
            }
          : null,
      };
    }),
    summary,
  };
}

function ensureNoDuplicateChildEvaluations(evaluations) {
  const seen = new Set();

  for (const evaluation of evaluations) {
    if (seen.has(evaluation.childId)) {
      throw new AppError(409, 'Duplicate child evaluation in request');
    }

    seen.add(evaluation.childId);
  }
}

function ensureChildrenBelongToGroupForDate(evaluations, childrenForDate) {
  const allowedIds = new Set(childrenForDate.map((child) => Number(child.id)));

  for (const evaluation of evaluations) {
    if (!allowedIds.has(evaluation.childId)) {
      throw new AppError(404, 'Child is not assigned to this group for the selected date');
    }
  }
}

async function recalculateDailySummary(groupId, date, isActiveDay, client) {
  const children = await socialBehaviorRepository.getChildrenForGroupOnDate(groupId, date, client);
  const evaluations = await socialBehaviorRepository.getEvaluationsForGroupDate(groupId, date, client);

  const validChildIds = new Set(children.map((child) => Number(child.id)));
  const evaluationsForActiveChildren = evaluations.filter((evaluation) =>
    validChildIds.has(Number(evaluation.child_id))
  );

  const summary = buildSummaryFromEvaluations(children.length, evaluationsForActiveChildren);

  await socialBehaviorRepository.upsertDailySummary(
    {
      groupId,
      date,
      isActiveDay,
      numberOfChildren: summary.numberOfChildren,
      internalDailyMaximum: summary.internalDailyMaximum,
      externalDailyMaximum: summary.externalDailyMaximum,
      dailySocialResult: summary.dailySocialResult,
      greenChildrenCount: summary.greenChildrenCount,
      orangeChildrenCount: summary.orangeChildrenCount,
      redChildrenCount: summary.redChildrenCount,
    },
    client
  );

  return summary;
}

async function getGroupActiveDays(groupId, actor) {
  await ensureGroupExists(groupId);
  await ensureCanViewGroupSocial(actor, groupId);

  const rows = await socialBehaviorRepository.getActiveDaysForGroup(groupId);
  const activeDays = buildResolvedActiveDays(rows);

  return {
    groupId,
    activeDays: mapActiveDaysWithLabels(activeDays),
  };
}

async function updateGroupActiveDays(groupId, payload, context) {
  await ensureGroupExists(groupId);
  ensureCanEditActiveDays(context.actor);

  return withTransaction(async (client) => {
    await socialBehaviorRepository.upsertActiveDays(
      groupId,
      payload.activeDays,
      context.actor.id,
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'group',
        entityId: groupId,
        action: 'social.active_days_updated',
        metadata: {
          activeDays: payload.activeDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            isActive: day.isActive,
          })),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    const activeDayRows = await socialBehaviorRepository.getActiveDaysForGroup(groupId, client);

    return {
      groupId,
      activeDays: mapActiveDaysWithLabels(buildResolvedActiveDays(activeDayRows)),
    };
  });
}

async function getDailyEvaluationScreen(groupId, date, actor) {
  await ensureGroupExists(groupId);
  await ensureCanViewGroupSocial(actor, groupId);

  const group = await socialBehaviorRepository.getGroupWithSeasonAndAcademy(groupId);
  const dayOfWeek = getIsoDayOfWeek(date);
  const isActiveDay = await resolveIsActiveDay(groupId, date);

  const children = await socialBehaviorRepository.getChildrenForGroupOnDate(groupId, date);
  const evaluations = await socialBehaviorRepository.getDailyEvaluationsForGroupDate(groupId, date);
  const childIds = new Set(children.map((child) => Number(child.id)));
  const evaluationsForChildren = evaluations.filter((evaluation) =>
    childIds.has(Number(evaluation.child_id))
  );

  const summary = buildSummaryFromEvaluations(children.length, evaluationsForChildren);
  const screen = buildDailyScreen(children, evaluationsForChildren, summary);

  return {
    group: {
      id: group.id,
      name: group.name,
      season: {
        id: group.season_id,
        name: group.season_name,
      },
      academy: {
        id: group.academy_id,
        name: group.academy_name,
      },
    },
    date,
    dayOfWeek,
    isActiveDay,
    children: screen.children,
    summary: screen.summary,
  };
}

async function saveDailyEvaluations(groupId, payload, context) {
  const group = await ensureGroupExists(groupId);
  await ensureCanEditGroupSocial(context.actor, groupId);

  if (!group.is_active) {
    throw new AppError(409, 'Group is not active');
  }

  if (!group.season_is_active) {
    throw new AppError(409, 'Season is not active');
  }

  if (!group.academy_is_active) {
    throw new AppError(409, 'Academy is not active');
  }

  ensureNoDuplicateChildEvaluations(payload.evaluations);

  return withTransaction(async (client) => {
    const childrenForDate = await socialBehaviorRepository.getChildrenForGroupOnDate(
      groupId,
      payload.date,
      client
    );

    ensureChildrenBelongToGroupForDate(payload.evaluations, childrenForDate);

    const savedEvaluations = [];

    for (const evaluation of payload.evaluations) {
      const calculated = calculateChildDailyResult({
        coachRelationColor: evaluation.coachRelationColor,
        childrenRelationColor: evaluation.childrenRelationColor,
        rulesColor: evaluation.rulesColor,
      });

      await socialBehaviorRepository.upsertDailyEvaluation(
        {
          childId: evaluation.childId,
          groupId,
          date: payload.date,
          coachRelationColor: evaluation.coachRelationColor,
          childrenRelationColor: evaluation.childrenRelationColor,
          rulesColor: evaluation.rulesColor,
          internalScore: calculated.internalScore,
          dailyStatus: calculated.dailyStatus,
          externalPoints: calculated.externalPoints,
          optionalComment: evaluation.optionalComment,
          evaluatedBy: context.actor.id,
        },
        client
      );

      savedEvaluations.push({
        childId: evaluation.childId,
        internalScore: calculated.internalScore,
        dailyStatus: calculated.dailyStatus,
        externalPoints: calculated.externalPoints,
      });
    }

    const isActiveDay = await resolveIsActiveDay(groupId, payload.date, client);
    const summary = await recalculateDailySummary(groupId, payload.date, isActiveDay, client);

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'social_daily',
        entityId: groupId,
        action: 'social.daily_saved',
        metadata: {
          groupId,
          date: payload.date,
          savedCount: savedEvaluations.length,
          evaluatedChildIds: savedEvaluations.map((evaluation) => evaluation.childId),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return {
      date: payload.date,
      savedCount: savedEvaluations.length,
      evaluations: savedEvaluations,
      summary,
    };
  });
}

async function getDailySummary(groupId, date, actor) {
  await ensureGroupExists(groupId);
  await ensureCanViewGroupSocial(actor, groupId);

  const isActiveDay = await resolveIsActiveDay(groupId, date);
  const children = await socialBehaviorRepository.getChildrenForGroupOnDate(groupId, date);
  const evaluations = await socialBehaviorRepository.getEvaluationsForGroupDate(groupId, date);
  const childIds = new Set(children.map((child) => Number(child.id)));
  const evaluationsForChildren = evaluations.filter((evaluation) =>
    childIds.has(Number(evaluation.child_id))
  );

  const persistedSummary = await socialBehaviorRepository.getDailySummary(groupId, date);

  let summary = buildSummaryFromEvaluations(children.length, evaluationsForChildren);

  if (persistedSummary) {
    summary = {
      numberOfChildren: persistedSummary.number_of_children,
      internalDailyMaximum: persistedSummary.internal_daily_maximum,
      externalDailyMaximum: persistedSummary.external_daily_maximum,
      dailySocialResult: persistedSummary.daily_social_result,
      greenChildrenCount: persistedSummary.green_children_count,
      orangeChildrenCount: persistedSummary.orange_children_count,
      redChildrenCount: persistedSummary.red_children_count,
      completedChildrenCount: evaluationsForChildren.length,
      missingChildrenCount: Math.max(
        0,
        Number(persistedSummary.number_of_children) - evaluationsForChildren.length
      ),
    };
  }

  return {
    groupId,
    date,
    isActiveDay,
    summary,
  };
}

async function getWeeklySummary(groupId, weekStartDate, actor) {
  ensureWeekStartIsMonday(weekStartDate);

  const group = await ensureGroupExists(groupId);
  await ensureCanViewGroupSocial(actor, groupId);

  const weekEndDate = getWeekEndDate(weekStartDate);
  const days = await buildWeeklyDailyBreakdown(groupId, weekStartDate);
  const summary = calculateWeeklyFromDays(days);
  const persisted = await socialBehaviorRepository.getWeeklySummary(groupId, weekStartDate);

  return {
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
    week: {
      weekStartDate,
      weekEndDate,
    },
    days,
    summary,
    persisted: {
      exists: Boolean(persisted),
      calculatedAt: persisted ? persisted.calculated_at : null,
    },
  };
}

async function recalculateWeeklySummary(groupId, payload, context) {
  ensureWeekStartIsMonday(payload.weekStartDate);

  const group = await ensureGroupExists(groupId);
  await ensureCanEditGroupSocial(context.actor, groupId);

  const weekStartDate = payload.weekStartDate;
  const weekEndDate = getWeekEndDate(weekStartDate);

  return withTransaction(async (client) => {
    const days = await buildWeeklyDailyBreakdown(groupId, weekStartDate, client);
    const summary = calculateWeeklyFromDays(days);

    await socialBehaviorRepository.upsertWeeklySummary(
      {
        groupId,
        weekStartDate,
        weekEndDate,
        activeDaysCount: summary.activeDaysCount,
        numberOfChildren: summary.numberOfChildren,
        weeklyMaximum: summary.weeklyMaximum,
        weeklySocialResult: summary.weeklySocialResult,
        weeklyPercentage: summary.weeklyPercentage,
        weeklyAlphaBalls: summary.weeklyAlphaBalls,
        weeklyStatus: summary.weeklyStatus,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'social_weekly',
        entityId: groupId,
        action: 'social.weekly_recalculated',
        metadata: {
          groupId,
          weekStartDate,
          weekEndDate,
          activeDaysCount: summary.activeDaysCount,
          weeklyMaximum: summary.weeklyMaximum,
          weeklySocialResult: summary.weeklySocialResult,
          weeklyAlphaBalls: summary.weeklyAlphaBalls,
          weeklyStatus: summary.weeklyStatus,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return {
      message: 'Weekly social summary recalculated successfully',
      group: {
        id: Number(group.id),
        name: group.name,
      },
      week: {
        weekStartDate,
        weekEndDate,
      },
      summary,
      days,
    };
  });
}

module.exports = {
  getGroupActiveDays,
  updateGroupActiveDays,
  getDailyEvaluationScreen,
  saveDailyEvaluations,
  getDailySummary,
  getWeeklySummary,
  recalculateWeeklySummary,
  ensureCanViewGroupSocial,
  ensureCanEditGroupSocial,
  ensureWeekStartIsMonday,
  getIsoDayOfWeek,
  getWeekEndDate,
  addDays,
  formatDate,
  buildWeekDates,
  getDefaultActiveDays,
  resolveIsActiveDay,
  buildDailyScreen,
  buildReadOnlyDailySummary,
  buildWeeklyDailyBreakdown,
  calculateWeeklyFromDays,
  recalculateDailySummary,
};
