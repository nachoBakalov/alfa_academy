const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const academyRepository = require('../repositories/academy.repository');
const groupRepository = require('../repositories/group.repository');
const seasonRepository = require('../repositories/season.repository');
const coachGroupRepository = require('../repositories/coachGroup.repository');
const childRepository = require('../repositories/child.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

function toCoachResponse(coach) {
  return {
    id: coach.id,
    firstName: coach.first_name,
    lastName: coach.last_name,
    email: coach.email,
    isPrimary: coach.is_primary,
  };
}

function toGroupResponse(group, coaches) {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    ageMin: group.age_min,
    ageMax: group.age_max,
    capacity: group.capacity,
    isActive: group.is_active,
    season: {
      id: group.season_id,
      name: group.season_name,
    },
    academy: {
      id: group.academy_id,
      name: group.academy_name,
    },
    coaches,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
  };
}

function ensureCanViewGroups(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanManageGroups(actor) {
  if (!['super_admin', 'admin'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanImportChildren(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function todayAsDateString() {
  return new Date().toISOString().slice(0, 10);
}

function ensureValidDateString(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, 'Invalid startsOn date');
  }

  return value;
}

async function ensureCanViewGroup(actor, groupId) {
  ensureCanViewGroups(actor);

  if (actor.role === 'coach') {
    const canAccess = await groupRepository.coachCanAccessGroup(actor.id, groupId);

    if (!canAccess) {
      throw new AppError(403, 'Forbidden');
    }
  }
}

function ensureAgeBounds(ageMin, ageMax) {
  if (ageMin !== null && ageMax !== null && ageMax < ageMin) {
    throw new AppError(400, 'ageMax must be greater than or equal to ageMin');
  }
}

async function listGroups(filters, actor) {
  ensureCanViewGroups(actor);

  const groups = await groupRepository.listGroups(filters, actor);
  const total = await groupRepository.countGroups(filters, actor);

  const mappedGroups = await Promise.all(
    groups.map(async (group) => {
      const coaches = await coachGroupRepository.listCoachesForGroup(group.id);
      return toGroupResponse(group, coaches.map(toCoachResponse));
    })
  );

  return {
    groups: mappedGroups,
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function getGroupById(id, actor) {
  const group = await groupRepository.findByIdWithSeasonAndAcademy(id);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  await ensureCanViewGroup(actor, id);

  const coaches = await coachGroupRepository.listCoachesForGroup(group.id);
  return toGroupResponse(group, coaches.map(toCoachResponse));
}

async function createGroup(payload, context) {
  ensureCanManageGroups(context.actor);

  const createdGroup = await withTransaction(async (client) => {
    let season = null;

    if (payload.seasonId !== undefined) {
      season = await seasonRepository.findByIdWithAcademy(payload.seasonId, client);
    }

    if (!season && payload.academyId !== undefined) {
      const academy = await academyRepository.findById(payload.academyId);

      if (!academy) {
        throw new AppError(400, 'Academy not found');
      }

      if (!academy.is_active) {
        throw new AppError(400, 'Cannot create group in inactive academy');
      }

      season = await seasonRepository.findOrCreateDefaultSeasonForAcademy(
        payload.academyId,
        context.actor.id,
        client
      );
    }

    if (!season) {
      throw new AppError(400, 'seasonId or academyId is required');
    }

    if (!season.is_active) {
      throw new AppError(400, 'Cannot create group in inactive season');
    }

    if (!season.academy_is_active) {
      throw new AppError(400, 'Cannot create group in inactive academy');
    }

    if (
      payload.academyId !== undefined &&
      Number(payload.academyId) !== Number(season.academy_id)
    ) {
      throw new AppError(400, 'seasonId does not belong to academyId');
    }

    const groupName = payload.name.trim();
    const existingByName = await groupRepository.findBySeasonAndName(
      season.id,
      groupName,
      client
    );

    if (existingByName) {
      throw new AppError(409, 'Group name already exists in season');
    }

    ensureAgeBounds(payload.ageMin ?? null, payload.ageMax ?? null);

    const created = await groupRepository.createGroup(
      {
        seasonId: season.id,
        name: groupName,
        description: payload.description,
        ageMin: payload.ageMin,
        ageMax: payload.ageMax,
        capacity: payload.capacity,
        createdBy: context.actor.id,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'group',
        entityId: created.id,
        action: 'group.created',
        metadata: {
          changedFields: [
            'academyId',
            'seasonId',
            'name',
            'description',
            'ageMin',
            'ageMax',
            'capacity',
          ],
          academyId: created.academy_id,
          seasonId: created.season_id,
          groupId: created.id,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return created;
  });

  const coaches = await coachGroupRepository.listCoachesForGroup(createdGroup.id);
  return toGroupResponse(createdGroup, coaches.map(toCoachResponse));
}

async function updateGroup(id, payload, context) {
  ensureCanManageGroups(context.actor);

  const existingGroup = await groupRepository.findByIdWithSeasonAndAcademy(id);

  if (!existingGroup) {
    throw new AppError(404, 'Group not found');
  }

  const updateData = {};

  if (payload.name !== undefined) {
    const normalizedName = payload.name.trim();
    const existingByName = await groupRepository.findBySeasonAndName(
      existingGroup.season_id,
      normalizedName
    );

    if (existingByName && existingByName.id !== existingGroup.id) {
      throw new AppError(409, 'Group name already exists in season');
    }

    updateData.name = normalizedName;
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description;
  }

  if (payload.ageMin !== undefined) {
    updateData.ageMin = payload.ageMin;
  }

  if (payload.ageMax !== undefined) {
    updateData.ageMax = payload.ageMax;
  }

  if (payload.capacity !== undefined) {
    updateData.capacity = payload.capacity;
  }

  const nextAgeMin = updateData.ageMin !== undefined ? updateData.ageMin : existingGroup.age_min;
  const nextAgeMax = updateData.ageMax !== undefined ? updateData.ageMax : existingGroup.age_max;

  ensureAgeBounds(nextAgeMin, nextAgeMax);

  const updatedGroup = await groupRepository.updateGroup(id, updateData);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'group',
    entityId: updatedGroup.id,
    action: 'group.updated',
    metadata: {
      changedFields: Object.keys(payload),
      seasonId: updatedGroup.season_id,
      groupId: updatedGroup.id,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  const coaches = await coachGroupRepository.listCoachesForGroup(updatedGroup.id);
  return toGroupResponse(updatedGroup, coaches.map(toCoachResponse));
}

async function updateGroupStatus(id, payload, context) {
  ensureCanManageGroups(context.actor);

  const existingGroup = await groupRepository.findByIdWithSeasonAndAcademy(id);

  if (!existingGroup) {
    throw new AppError(404, 'Group not found');
  }

  const updatedGroup = await groupRepository.updateStatus(id, payload.isActive);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'group',
    entityId: updatedGroup.id,
    action: 'group.status_updated',
    metadata: {
      changedFields: ['isActive'],
      previousIsActive: existingGroup.is_active,
      newIsActive: updatedGroup.is_active,
      seasonId: updatedGroup.season_id,
      groupId: updatedGroup.id,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  const coaches = await coachGroupRepository.listCoachesForGroup(updatedGroup.id);
  return toGroupResponse(updatedGroup, coaches.map(toCoachResponse));
}

async function importChildren(groupId, payload, context) {
  ensureCanImportChildren(context.actor);

  const targetGroup = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!targetGroup) {
    throw new AppError(404, 'Group not found');
  }

  await ensureCanViewGroup(context.actor, groupId);

  if (!targetGroup.is_active) {
    throw new AppError(400, 'Group must be active');
  }

  if (!targetGroup.season_is_active) {
    throw new AppError(400, 'Target season must be active');
  }

  if (!targetGroup.academy_is_active) {
    throw new AppError(400, 'Target academy must be active');
  }

  const sourceGroup = payload.sourceGroupId
    ? await groupRepository.findByIdWithSeasonAndAcademy(payload.sourceGroupId)
    : null;

  if (payload.sourceGroupId && !sourceGroup) {
    throw new AppError(400, 'Source group not found');
  }

  if (
    sourceGroup &&
    payload.sourceAcademyId !== undefined &&
    Number(sourceGroup.academy_id) !== Number(payload.sourceAcademyId)
  ) {
    throw new AppError(400, 'sourceGroupId must belong to sourceAcademyId');
  }

  let effectiveSourceAcademyId =
    payload.sourceAcademyId !== undefined ? Number(payload.sourceAcademyId) : null;

  if (sourceGroup) {
    effectiveSourceAcademyId = Number(sourceGroup.academy_id);
  }

  const sourceSeason = payload.sourceSeasonId
    ? await seasonRepository.findByIdWithAcademy(payload.sourceSeasonId)
    : null;

  if (payload.sourceSeasonId && !sourceSeason) {
    throw new AppError(400, 'Source season not found');
  }

  if (sourceSeason) {
    if (
      effectiveSourceAcademyId !== null &&
      Number(effectiveSourceAcademyId) !== Number(sourceSeason.academy_id)
    ) {
      throw new AppError(400, 'sourceSeasonId must belong to sourceAcademyId');
    }

    effectiveSourceAcademyId = Number(sourceSeason.academy_id);
  }

  if (effectiveSourceAcademyId !== null) {
    const sourceAcademy = await academyRepository.findById(effectiveSourceAcademyId);

    if (!sourceAcademy) {
      throw new AppError(400, 'Source academy not found');
    }
  }

  if (context.actor.role === 'coach') {
    const canAccessTargetAcademy = await academyRepository.coachCanAccessAcademy(
      context.actor.id,
      Number(targetGroup.academy_id)
    );

    if (!canAccessTargetAcademy) {
      throw new AppError(403, 'Forbidden');
    }

    if (effectiveSourceAcademyId === null) {
      effectiveSourceAcademyId = Number(targetGroup.academy_id);
    }

    const canAccessSourceAcademy = await academyRepository.coachCanAccessAcademy(
      context.actor.id,
      effectiveSourceAcademyId
    );

    if (!canAccessSourceAcademy) {
      throw new AppError(403, 'Forbidden');
    }
  }

  if (
    effectiveSourceAcademyId !== null &&
    Number(effectiveSourceAcademyId) === Number(targetGroup.academy_id) &&
    sourceGroup &&
    Number(sourceGroup.id) === Number(targetGroup.id)
  ) {
    throw new AppError(400, 'Source group must be different from target group');
  }

  const startsOn = ensureValidDateString(payload.startsOn || todayAsDateString());
  const isLegacySeasonImport =
    payload.sourceSeasonId !== undefined &&
    (!Array.isArray(payload.childIds) || payload.childIds.length === 0);

  if (isLegacySeasonImport && Number(payload.sourceSeasonId) === Number(targetGroup.season_id)) {
    throw new AppError(400, 'Source season must be different from target group season');
  }

  const result = await withTransaction(async (client) => {
    let importResult;

    if (isLegacySeasonImport) {
      const [requestedCount, importedCount] = await Promise.all([
        childRepository.countActiveChildrenInSeason(payload.sourceSeasonId, client),
        childRepository.importChildrenFromSeasonToGroup(
          {
            sourceSeasonId: payload.sourceSeasonId,
            targetGroupId: groupId,
            targetSeasonId: Number(targetGroup.season_id),
            startsOn,
            createdBy: context.actor.id,
          },
          client
        ),
      ]);

      importResult = {
        requestedCount,
        importedCount,
        skippedCount: Math.max(requestedCount - importedCount, 0),
      };
    } else {
      importResult = await childRepository.importChildrenToGroup(
        {
          childIds: payload.childIds,
          sourceAcademyId: effectiveSourceAcademyId,
          sourceGroupId: payload.sourceGroupId,
          targetGroupId: groupId,
          targetSeasonId: Number(targetGroup.season_id),
          startsOn,
          createdBy: context.actor.id,
        },
        client
      );
    }

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'group',
        entityId: Number(groupId),
        action: 'group.children_imported',
        metadata: {
          groupId: Number(groupId),
          academyId: Number(targetGroup.academy_id),
          targetSeasonId: Number(targetGroup.season_id),
          sourceAcademyId: effectiveSourceAcademyId,
          sourceSeasonId: payload.sourceSeasonId || null,
          sourceGroupId: payload.sourceGroupId || null,
          requestedChildrenCount: importResult.requestedCount,
          startsOn,
          importedCount: importResult.importedCount,
          skippedCount: importResult.skippedCount,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return importResult;
  });

  return {
    groupId: Number(targetGroup.id),
    academyId: Number(targetGroup.academy_id),
    importedCount: result.importedCount,
    skippedCount: result.skippedCount,
  };
}

module.exports = {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  updateGroupStatus,
  importChildren,
};
