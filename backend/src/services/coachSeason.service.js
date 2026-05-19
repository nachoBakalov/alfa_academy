const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const userRepository = require('../repositories/user.repository');
const seasonRepository = require('../repositories/season.repository');
const coachSeasonRepository = require('../repositories/coachSeason.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

function ensureCanManageCoachSeasons(actor) {
  if (!['super_admin', 'admin', 'manager'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCanViewSeasonCoaches(actor, seasonId) {
  if (['super_admin', 'admin', 'manager'].includes(actor.role)) {
    return;
  }

  if (actor.role === 'coach') {
    const assignment = await coachSeasonRepository.findActiveAssignment(actor.id, seasonId);

    if (assignment) {
      return;
    }
  }

  throw new AppError(403, 'Forbidden');
}

function ensureCanViewCoachSeasons(actor, coachId) {
  if (['super_admin', 'admin', 'manager'].includes(actor.role)) {
    return;
  }

  if (actor.role === 'coach' && Number(actor.id) === Number(coachId)) {
    return;
  }

  throw new AppError(403, 'Forbidden');
}

async function ensureCoachUser(coachId, { mustBeActive } = { mustBeActive: false }) {
  const user = await userRepository.findByIdWithRole(coachId);

  if (!user) {
    throw new AppError(404, 'Coach user not found');
  }

  if (user.role_code !== 'coach') {
    throw new AppError(400, 'Selected user must have coach role');
  }

  if (mustBeActive && !user.is_active) {
    throw new AppError(400, 'User must be an active coach');
  }

  return user;
}

async function ensureSeason(seasonId) {
  const season = await seasonRepository.findByIdWithAcademy(seasonId);

  if (!season) {
    throw new AppError(404, 'Season not found');
  }

  return season;
}

function toAssignmentResponse(assignment) {
  return {
    coachId: Number(assignment.coach_id),
    seasonId: Number(assignment.season_id),
    assignedAt: assignment.assigned_at,
  };
}

async function listSeasonCoaches(seasonId, actor) {
  await ensureCanViewSeasonCoaches(actor, seasonId);
  await ensureSeason(seasonId);

  const coaches = await coachSeasonRepository.listActiveCoachesForSeason(seasonId);

  return {
    coaches: coaches.map((coach) => ({
      id: Number(coach.id),
      firstName: coach.first_name,
      lastName: coach.last_name,
      email: coach.email,
      assignedAt: coach.assigned_at,
    })),
  };
}

async function listCoachSeasons(coachId, actor) {
  ensureCanViewCoachSeasons(actor, coachId);
  await ensureCoachUser(coachId, { mustBeActive: false });

  const seasons = await coachSeasonRepository.listActiveSeasonsForCoach(coachId);

  return {
    seasons: seasons.map((season) => ({
      id: Number(season.id),
      name: season.name,
      startsOn: season.starts_on,
      endsOn: season.ends_on,
      isActive: Boolean(season.is_active),
      academy: {
        id: Number(season.academy_id),
        name: season.academy_name,
      },
      assignedAt: season.assigned_at,
    })),
  };
}

async function assignCoachToSeason(payload, context) {
  ensureCanManageCoachSeasons(context.actor);

  await ensureCoachUser(payload.coachId, { mustBeActive: true });
  const season = await ensureSeason(payload.seasonId);

  if (!season.academy_is_active) {
    throw new AppError(400, 'Academy must be active');
  }

  const assignment = await withTransaction(async (client) => {
    const existing = await coachSeasonRepository.findActiveAssignment(
      payload.coachId,
      payload.seasonId,
      client
    );

    if (existing) {
      return existing;
    }

    const created = await coachSeasonRepository.assignCoachToSeason(
      {
        coachId: payload.coachId,
        seasonId: payload.seasonId,
        createdBy: context.actor.id,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'coach_season',
        entityId: created.id,
        action: 'coach.season_assigned',
        metadata: {
          coachId: payload.coachId,
          seasonId: payload.seasonId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return created;
  });

  return {
    assignment: toAssignmentResponse(assignment),
  };
}

async function unassignCoachFromSeason(seasonId, coachId, context) {
  ensureCanManageCoachSeasons(context.actor);

  await ensureCoachUser(coachId, { mustBeActive: false });
  await ensureSeason(seasonId);

  const assignment = await withTransaction(async (client) => {
    const activeGroupAssignments = await coachSeasonRepository.countActiveGroupAssignments(
      coachId,
      seasonId,
      client
    );

    if (activeGroupAssignments > 0) {
      throw new AppError(
        409,
        'Cannot unassign coach from season while active group assignments exist'
      );
    }

    const removed = await coachSeasonRepository.unassignCoachFromSeason(coachId, seasonId, client);

    if (!removed) {
      throw new AppError(404, 'Active coach season assignment not found');
    }

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'coach_season',
        entityId: removed.id,
        action: 'coach.season_unassigned',
        metadata: {
          coachId,
          seasonId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return removed;
  });

  return {
    assignment: toAssignmentResponse(assignment),
  };
}

module.exports = {
  listSeasonCoaches,
  listCoachSeasons,
  assignCoachToSeason,
  unassignCoachFromSeason,
};
