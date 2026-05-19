const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const userRepository = require('../repositories/user.repository');
const groupRepository = require('../repositories/group.repository');
const coachGroupRepository = require('../repositories/coachGroup.repository');
const coachAcademyRepository = require('../repositories/coachAcademy.repository');
const coachSeasonRepository = require('../repositories/coachSeason.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

function ensureCanAssignCoaches(actor) {
  if (!['super_admin', 'admin', 'manager'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanViewCoachDirectory(actor) {
  if (!['super_admin', 'admin', 'manager'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCanViewGroup(actor, groupId) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }

  if (actor.role === 'coach') {
    const canAccess = await groupRepository.coachCanAccessGroup(actor.id, groupId);

    if (!canAccess) {
      throw new AppError(403, 'Forbidden');
    }
  }
}

function toCoachAssignmentResponse(assignment) {
  return {
    groupId: assignment.group_id,
    coachId: assignment.coach_id,
    isPrimary: assignment.is_primary,
    assignedAt: assignment.assigned_at,
  };
}

function toCoachResponse(row) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    isPrimary: row.is_primary,
    assignedAt: row.assigned_at,
    unassignedAt: row.unassigned_at,
  };
}

function toCoachDirectoryItem(row) {
  return {
    id: Number(row.id),
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    isActive: Boolean(row.is_active),
  };
}

async function listCoachDirectory(filters, actor) {
  ensureCanViewCoachDirectory(actor);

  const queryFilters = {
    role: 'coach',
    isActive: true,
    search: filters.search,
    limit: filters.limit,
    offset: filters.offset,
  };

  const [coaches, total] = await Promise.all([
    userRepository.listUsers(queryFilters),
    userRepository.countUsers(queryFilters),
  ]);

  return {
    coaches: coaches.map(toCoachDirectoryItem),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function listCoachesForGroup(groupId, actor) {
  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  await ensureCanViewGroup(actor, groupId);

  const coaches = await coachGroupRepository.listCoachesForGroup(groupId);
  return {
    coaches: coaches.map(toCoachResponse),
  };
}

async function assignCoachToGroup(groupId, payload, context) {
  ensureCanAssignCoaches(context.actor);

  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  if (!group.is_active) {
    throw new AppError(400, 'Cannot assign coach to inactive group');
  }

  const coachUser = await userRepository.findByIdWithRole(payload.coachId);

  if (!coachUser) {
    throw new AppError(404, 'Coach user not found');
  }

  if (!coachUser.is_active || coachUser.role_code !== 'coach') {
    throw new AppError(400, 'User must be an active coach');
  }

  const activeAssignment = await coachGroupRepository.findActiveAssignment(groupId, payload.coachId);

  if (activeAssignment) {
    throw new AppError(409, 'Coach is already assigned to this group');
  }

  const assignment = await withTransaction(async (client) => {
    if (payload.isPrimary) {
      await coachGroupRepository.clearPrimaryCoachForGroup(groupId, payload.coachId, client);
    }

    const createdAssignment = await coachGroupRepository.assignCoachToGroup(
      {
        coachId: payload.coachId,
        groupId,
        isPrimary: Boolean(payload.isPrimary),
        createdBy: context.actor.id,
      },
      client
    );

    await coachAcademyRepository.ensureActiveAssignment(
      {
        coachId: payload.coachId,
        academyId: Number(group.academy_id),
        createdBy: context.actor.id,
      },
      client
    );

    await coachSeasonRepository.ensureActiveAssignment(
      {
        coachId: payload.coachId,
        seasonId: Number(group.season_id),
        createdBy: context.actor.id,
      },
      client
    );

    return createdAssignment;
  });

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'group',
    entityId: groupId,
    action: 'group.coach_assigned',
    metadata: {
      groupId,
      coachId: payload.coachId,
      isPrimary: assignment.is_primary,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    assignment: toCoachAssignmentResponse(assignment),
  };
}

async function updateCoachAssignment(groupId, coachId, payload, context) {
  ensureCanAssignCoaches(context.actor);

  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  const assignment = await coachGroupRepository.findActiveAssignment(groupId, coachId);

  if (!assignment) {
    throw new AppError(404, 'Active coach assignment not found');
  }

  let updatedAssignment;

  if (payload.isPrimary) {
    updatedAssignment = await withTransaction(async (client) => {
      await coachGroupRepository.clearPrimaryCoachForGroup(groupId, coachId, client);
      return coachGroupRepository.updateAssignmentPrimary(groupId, coachId, true, client);
    });
  } else {
    updatedAssignment = await coachGroupRepository.updateAssignmentPrimary(
      groupId,
      coachId,
      false
    );
  }

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'group',
    entityId: groupId,
    action: 'group.coach_assignment_updated',
    metadata: {
      groupId,
      coachId,
      isPrimary: updatedAssignment.is_primary,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    assignment: toCoachAssignmentResponse(updatedAssignment),
  };
}

async function unassignCoachFromGroup(groupId, coachId, context) {
  ensureCanAssignCoaches(context.actor);

  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  const unassigned = await coachGroupRepository.unassignCoachFromGroup(groupId, coachId);

  if (!unassigned) {
    throw new AppError(404, 'Active coach assignment not found');
  }

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'group',
    entityId: groupId,
    action: 'group.coach_unassigned',
    metadata: {
      groupId,
      coachId,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    message: 'Coach unassigned successfully',
  };
}

module.exports = {
  listCoachDirectory,
  listCoachesForGroup,
  assignCoachToGroup,
  updateCoachAssignment,
  unassignCoachFromGroup,
};
