const AppError = require('../utils/AppError');
const groupRepository = require('../repositories/group.repository');
const seasonRepository = require('../repositories/season.repository');
const coachGroupRepository = require('../repositories/coachGroup.repository');
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

  const season = await seasonRepository.findByIdWithAcademy(payload.seasonId);

  if (!season) {
    throw new AppError(400, 'Season not found');
  }

  if (!season.is_active) {
    throw new AppError(400, 'Cannot create group in inactive season');
  }

  if (!season.academy_is_active) {
    throw new AppError(400, 'Cannot create group in inactive academy');
  }

  const groupName = payload.name.trim();
  const existingByName = await groupRepository.findBySeasonAndName(payload.seasonId, groupName);

  if (existingByName) {
    throw new AppError(409, 'Group name already exists in season');
  }

  ensureAgeBounds(payload.ageMin ?? null, payload.ageMax ?? null);

  const createdGroup = await groupRepository.createGroup({
    seasonId: payload.seasonId,
    name: groupName,
    description: payload.description,
    ageMin: payload.ageMin,
    ageMax: payload.ageMax,
    capacity: payload.capacity,
    createdBy: context.actor.id,
  });

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'group',
    entityId: createdGroup.id,
    action: 'group.created',
    metadata: {
      changedFields: ['seasonId', 'name', 'description', 'ageMin', 'ageMax', 'capacity'],
      seasonId: createdGroup.season_id,
      groupId: createdGroup.id,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
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

module.exports = {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  updateGroupStatus,
};
