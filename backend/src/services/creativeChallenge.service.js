const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const academyRepository = require('../repositories/academy.repository');
const groupRepository = require('../repositories/group.repository');
const creativeChallengeRepository = require('../repositories/creativeChallenge.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

const ALLOWED_ROLES = ['super_admin', 'admin', 'manager', 'coach'];

function parseDateOrThrow(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, 'Невалидна дата.');
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

function ensureWeekWindow(startsOn, endsOn) {
  if (getIsoDayOfWeek(startsOn) !== 1) {
    throw new AppError(400, 'Началната дата трябва да е понеделник.');
  }

  if (getIsoDayOfWeek(endsOn) !== 5) {
    throw new AppError(400, 'Крайната дата трябва да е петък.');
  }

  const expectedEnd = formatDate(addDays(parseDateOrThrow(startsOn), 4));

  if (expectedEnd !== endsOn) {
    throw new AppError(400, 'Крайната дата трябва да е 4 дни след началната дата.');
  }
}

function getTargetStatus(alphaBalls) {
  if (alphaBalls === null || alphaBalls === undefined) {
    return 'pending';
  }

  return Number(alphaBalls) >= 8 ? 'target_reached' : 'target_not_reached';
}

function toSummaryResponse(row) {
  return {
    groupsCount: Number(row.groups_count || 0),
    completedGroupsCount: Number(row.completed_groups_count || 0),
    averageAlphaBalls: Number(row.average_alpha_balls || 0),
    targetReachedGroupsCount: Number(row.target_reached_groups_count || 0),
    targetNotReachedGroupsCount: Number(row.target_not_reached_groups_count || 0),
  };
}

function toGroupResultResponse(groupResult) {
  if (!groupResult) {
    return null;
  }

  const alphaBalls =
    groupResult.alphaBalls === null || groupResult.alphaBalls === undefined
      ? null
      : Number(groupResult.alphaBalls);

  return {
    challengeId: Number(groupResult.challengeId),
    groupId: Number(groupResult.groupId),
    alphaBalls,
    targetStatus: getTargetStatus(alphaBalls),
    resultNote: groupResult.resultNote || null,
    evaluatedAt: groupResult.evaluatedAt || null,
  };
}

function toChallengeResponse(challenge, options = {}) {
  const selectedGroupId = options.selectedGroupId || null;
  const selectedAlphaBalls =
    challenge.selected_alpha_balls === null || challenge.selected_alpha_balls === undefined
      ? null
      : Number(challenge.selected_alpha_balls);

  const groupResult = selectedGroupId
    ? {
        groupId: Number(selectedGroupId),
        alphaBalls: selectedAlphaBalls,
        targetStatus: getTargetStatus(selectedAlphaBalls),
        resultNote: challenge.selected_result_note || null,
        evaluatedAt: challenge.selected_evaluated_at || null,
      }
    : null;

  return {
    id: Number(challenge.id),
    academyId: Number(challenge.academy_id),
    academy: {
      id: Number(challenge.academy_id),
      name: challenge.academy_name,
    },
    title: challenge.title,
    activityType: challenge.activity_type,
    description: challenge.description || null,
    startsOn: challenge.starts_on,
    endsOn: challenge.ends_on,
    status: challenge.status,
    groupResult,
    resultsSummary: toSummaryResponse(challenge),
  };
}

function toChallengeDetailsResponse(challenge, groupResults) {
  return {
    id: Number(challenge.id),
    academyId: Number(challenge.academy_id),
    academy: {
      id: Number(challenge.academy_id),
      name: challenge.academy_name,
    },
    title: challenge.title,
    activityType: challenge.activity_type,
    description: challenge.description || null,
    startsOn: challenge.starts_on,
    endsOn: challenge.ends_on,
    status: challenge.status,
    groupResults: groupResults.map((row) =>
      toGroupResultResponse({
        challengeId: challenge.id,
        groupId: row.group_id,
        alphaBalls: row.alpha_balls,
        resultNote: row.result_note,
        evaluatedAt: row.evaluated_at,
      })
    ),
  };
}

function ensureCanUseCreativity(actor) {
  if (!ALLOWED_ROLES.includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCanAccessAcademy(actor, academyId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await academyRepository.coachCanAccessAcademy(actor.id, academyId);

  if (!canAccess) {
    throw new AppError(403, 'Нямате достъп до тази академия.');
  }
}

async function ensureCanAccessGroup(actor, groupId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await groupRepository.coachCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'Нямате достъп до тази група.');
  }
}

async function ensureCanEditChallenge(actor, challenge) {
  if (actor.role !== 'coach') {
    return;
  }

  if (challenge.created_by && Number(challenge.created_by) === Number(actor.id)) {
    return;
  }

  await ensureCanAccessAcademy(actor, Number(challenge.academy_id));
}

async function resolveCoachAccessibleAcademyIds(actor) {
  const response = await academyRepository.listAcademies(
    {
      limit: 100,
      offset: 0,
    },
    actor
  );

  return response.map((academy) => Number(academy.id));
}

async function listChallenges(filters, actor) {
  ensureCanUseCreativity(actor);

  let academyId = filters.academyId;
  let selectedGroupId = null;
  let accessibleAcademyIds;

  if (filters.groupId !== undefined) {
    const group = await groupRepository.findByIdWithSeasonAndAcademy(filters.groupId);

    if (!group) {
      throw new AppError(404, 'Групата не е намерена.');
    }

    await ensureCanAccessGroup(actor, filters.groupId);

    academyId = Number(group.academy_id);
    selectedGroupId = Number(filters.groupId);
  } else if (academyId !== undefined) {
    const academy = await academyRepository.findById(academyId);

    if (!academy) {
      throw new AppError(404, 'Академията не е намерена.');
    }

    await ensureCanAccessAcademy(actor, academyId);
  } else if (actor.role === 'coach') {
    accessibleAcademyIds = await resolveCoachAccessibleAcademyIds(actor);
  }

  const listFilters = {
    academyId,
    status: filters.status,
    weekStartDate: filters.weekStartDate,
    limit: filters.limit,
    offset: filters.offset,
    accessibleAcademyIds,
  };

  const [challenges, total] = await Promise.all([
    creativeChallengeRepository.listChallenges(listFilters, { selectedGroupId }),
    creativeChallengeRepository.countChallenges(listFilters),
  ]);

  return {
    challenges: challenges.map((challenge) => toChallengeResponse(challenge, { selectedGroupId })),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function createChallenge(payload, context) {
  ensureCanUseCreativity(context.actor);

  const academy = await academyRepository.findById(payload.academyId);

  if (!academy) {
    throw new AppError(404, 'Академията не е намерена.');
  }

  if (!academy.is_active) {
    throw new AppError(409, 'Не може да създадете предизвикателство в неактивна академия.');
  }

  await ensureCanAccessAcademy(context.actor, payload.academyId);
  ensureWeekWindow(payload.startsOn, payload.endsOn);

  const challenge = await withTransaction(async (client) => {
    const created = await creativeChallengeRepository.createChallenge(
      {
        academyId: payload.academyId,
        title: payload.title,
        activityType: payload.activityType,
        description: payload.description,
        startsOn: payload.startsOn,
        endsOn: payload.endsOn,
        status: payload.status || 'active',
        createdBy: context.actor.id,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'creative_challenge',
        entityId: Number(created.id),
        action: 'creative.challenge_created',
        metadata: {
          challengeId: Number(created.id),
          academyId: Number(created.academy_id),
          startsOn: created.starts_on,
          endsOn: created.ends_on,
          status: created.status,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return created;
  });

  return {
    challenge: toChallengeResponse(challenge),
  };
}

async function getChallengeById(challengeId, actor) {
  ensureCanUseCreativity(actor);

  const challenge = await creativeChallengeRepository.findChallengeById(challengeId);

  if (!challenge) {
    throw new AppError(404, 'Креативното предизвикателство не е намерено.');
  }

  await ensureCanAccessAcademy(actor, Number(challenge.academy_id));

  let groupIds;

  if (actor.role === 'coach') {
    groupIds = await creativeChallengeRepository.listCoachAssignedGroupIdsInAcademy(
      actor.id,
      Number(challenge.academy_id)
    );
  }

  const groupResults = await creativeChallengeRepository.listChallengeResults(
    challengeId,
    Number(challenge.academy_id),
    {
      groupIds,
    }
  );

  return {
    challenge: toChallengeDetailsResponse(challenge, groupResults),
  };
}

async function updateChallenge(challengeId, payload, context) {
  ensureCanUseCreativity(context.actor);

  const existing = await creativeChallengeRepository.findChallengeById(challengeId);

  if (!existing) {
    throw new AppError(404, 'Креативното предизвикателство не е намерено.');
  }

  await ensureCanEditChallenge(context.actor, existing);

  if (existing.status === 'archived') {
    throw new AppError(409, 'Архивирано предизвикателство не може да се редактира.');
  }

  const nextStartsOn = payload.startsOn || existing.starts_on;
  const nextEndsOn = payload.endsOn || existing.ends_on;

  ensureWeekWindow(nextStartsOn, nextEndsOn);

  const updated = await creativeChallengeRepository.updateChallenge(challengeId, payload);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'creative_challenge',
    entityId: Number(updated.id),
    action: 'creative.challenge_updated',
    metadata: {
      challengeId: Number(updated.id),
      academyId: Number(updated.academy_id),
      startsOn: updated.starts_on,
      endsOn: updated.ends_on,
      changedFields: Object.keys(payload),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    challenge: toChallengeResponse(updated),
  };
}

async function saveGroupResult(challengeId, groupId, payload, context) {
  ensureCanUseCreativity(context.actor);

  const [challenge, group] = await Promise.all([
    creativeChallengeRepository.findChallengeById(challengeId),
    groupRepository.findByIdWithSeasonAndAcademy(groupId),
  ]);

  if (!challenge) {
    throw new AppError(404, 'Креативното предизвикателство не е намерено.');
  }

  if (!group) {
    throw new AppError(404, 'Групата не е намерена.');
  }

  if (Number(challenge.academy_id) !== Number(group.academy_id)) {
    throw new AppError(400, 'Групата не принадлежи към академията на предизвикателството.');
  }

  await ensureCanAccessGroup(context.actor, groupId);

  const savedResult = await withTransaction(async (client) => {
    const result = await creativeChallengeRepository.upsertGroupResult(
      {
        challengeId,
        groupId,
        alphaBalls: payload.alphaBalls,
        resultNote: payload.resultNote,
        evaluatedBy: context.actor.id,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'creative_challenge',
        entityId: Number(challenge.id),
        action: 'creative.challenge_result_updated',
        metadata: {
          challengeId: Number(challenge.id),
          academyId: Number(challenge.academy_id),
          groupId: Number(groupId),
          alphaBalls: Number(payload.alphaBalls),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return result;
  });

  return {
    result: toGroupResultResponse({
      challengeId,
      groupId,
      alphaBalls: savedResult.alpha_balls,
      resultNote: savedResult.result_note,
      evaluatedAt: savedResult.evaluated_at,
    }),
  };
}

async function updateChallengeStatus(challengeId, payload, context) {
  ensureCanUseCreativity(context.actor);

  const existing = await creativeChallengeRepository.findChallengeById(challengeId);

  if (!existing) {
    throw new AppError(404, 'Креативното предизвикателство не е намерено.');
  }

  await ensureCanAccessAcademy(context.actor, Number(existing.academy_id));

  const updated = await creativeChallengeRepository.updateChallengeStatus(challengeId, payload.status);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'creative_challenge',
    entityId: Number(updated.id),
    action: 'creative.challenge_status_updated',
    metadata: {
      challengeId: Number(updated.id),
      academyId: Number(updated.academy_id),
      previousStatus: existing.status,
      newStatus: updated.status,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    challenge: toChallengeResponse(updated),
  };
}

module.exports = {
  listChallenges,
  createChallenge,
  getChallengeById,
  updateChallenge,
  saveGroupResult,
  updateChallengeStatus,
};
