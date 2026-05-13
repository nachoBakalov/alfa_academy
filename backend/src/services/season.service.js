const AppError = require('../utils/AppError');
const academyRepository = require('../repositories/academy.repository');
const seasonRepository = require('../repositories/season.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

function toSeasonResponse(season) {
  return {
    id: season.id,
    academyId: season.academy_id,
    name: season.name,
    startsOn: season.starts_on,
    endsOn: season.ends_on,
    isActive: season.is_active,
    createdAt: season.created_at,
    updatedAt: season.updated_at,
    academy: season.academy_name
      ? {
          id: season.academy_id,
          name: season.academy_name,
        }
      : undefined,
  };
}

function ensureCanViewSeasons(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanManageSeasons(actor) {
  if (!['super_admin', 'admin'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCanViewSeason(actor, seasonId) {
  ensureCanViewSeasons(actor);

  if (actor.role === 'coach') {
    const canAccess = await seasonRepository.coachCanAccessSeason(actor.id, seasonId);

    if (!canAccess) {
      throw new AppError(403, 'Forbidden');
    }
  }
}

function ensureValidDateRange(startsOn, endsOn) {
  if (new Date(endsOn) < new Date(startsOn)) {
    throw new AppError(400, 'endsOn must be greater than or equal to startsOn');
  }
}

async function listSeasons(filters, actor) {
  ensureCanViewSeasons(actor);

  const seasons = await seasonRepository.listSeasons(filters, actor);
  const total = await seasonRepository.countSeasons(filters, actor);

  return {
    seasons: seasons.map(toSeasonResponse),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function getSeasonById(id, actor) {
  const season = await seasonRepository.findByIdWithAcademy(id);

  if (!season) {
    throw new AppError(404, 'Season not found');
  }

  await ensureCanViewSeason(actor, id);

  return toSeasonResponse(season);
}

async function createSeason(payload, context) {
  ensureCanManageSeasons(context.actor);

  const academy = await academyRepository.findById(payload.academyId);

  if (!academy) {
    throw new AppError(400, 'Academy not found');
  }

  if (!academy.is_active) {
    throw new AppError(400, 'Cannot create season in inactive academy');
  }

  ensureValidDateRange(payload.startsOn, payload.endsOn);

  const existingByName = await seasonRepository.findByAcademyAndName(
    payload.academyId,
    payload.name.trim()
  );

  if (existingByName) {
    throw new AppError(409, 'Season name already exists in academy');
  }

  const createdSeason = await seasonRepository.createSeason({
    academyId: payload.academyId,
    name: payload.name.trim(),
    startsOn: payload.startsOn,
    endsOn: payload.endsOn,
    createdBy: context.actor.id,
  });

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'season',
    entityId: createdSeason.id,
    action: 'season.created',
    metadata: {
      changedFields: ['academyId', 'name', 'startsOn', 'endsOn'],
      academyId: createdSeason.academy_id,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toSeasonResponse(createdSeason);
}

async function updateSeason(id, payload, context) {
  ensureCanManageSeasons(context.actor);

  const existingSeason = await seasonRepository.findByIdWithAcademy(id);

  if (!existingSeason) {
    throw new AppError(404, 'Season not found');
  }

  const nextStartsOn = payload.startsOn || existingSeason.starts_on;
  const nextEndsOn = payload.endsOn || existingSeason.ends_on;
  ensureValidDateRange(nextStartsOn, nextEndsOn);

  const updateData = {};

  if (payload.name !== undefined) {
    const normalizedName = payload.name.trim();
    const existingByName = await seasonRepository.findByAcademyAndName(
      existingSeason.academy_id,
      normalizedName
    );

    if (existingByName && existingByName.id !== existingSeason.id) {
      throw new AppError(409, 'Season name already exists in academy');
    }

    updateData.name = normalizedName;
  }

  if (payload.startsOn !== undefined) {
    updateData.startsOn = payload.startsOn;
  }

  if (payload.endsOn !== undefined) {
    updateData.endsOn = payload.endsOn;
  }

  const updatedSeason = await seasonRepository.updateSeason(id, updateData);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'season',
    entityId: updatedSeason.id,
    action: 'season.updated',
    metadata: {
      changedFields: Object.keys(payload),
      academyId: updatedSeason.academy_id,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toSeasonResponse(updatedSeason);
}

async function updateSeasonStatus(id, payload, context) {
  ensureCanManageSeasons(context.actor);

  const existingSeason = await seasonRepository.findByIdWithAcademy(id);

  if (!existingSeason) {
    throw new AppError(404, 'Season not found');
  }

  const updatedSeason = await seasonRepository.updateStatus(id, payload.isActive);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'season',
    entityId: updatedSeason.id,
    action: 'season.status_updated',
    metadata: {
      changedFields: ['isActive'],
      previousIsActive: existingSeason.is_active,
      newIsActive: updatedSeason.is_active,
      academyId: updatedSeason.academy_id,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toSeasonResponse(updatedSeason);
}

module.exports = {
  listSeasons,
  getSeasonById,
  createSeason,
  updateSeason,
  updateSeasonStatus,
};
