const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const userRepository = require('../repositories/user.repository');
const academyRepository = require('../repositories/academy.repository');
const coachAcademyRepository = require('../repositories/coachAcademy.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

function ensureCanManageCoachAcademies(actor) {
  if (!['super_admin', 'admin', 'manager'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanViewCoachAcademies(actor, coachId) {
  if (['super_admin', 'admin', 'manager'].includes(actor.role)) {
    return;
  }

  if (actor.role === 'coach' && Number(actor.id) === Number(coachId)) {
    return;
  }

  throw new AppError(403, 'Forbidden');
}

async function ensureCanViewAcademyCoaches(actor, academyId) {
  if (['super_admin', 'admin', 'manager'].includes(actor.role)) {
    return;
  }

  if (actor.role === 'coach') {
    const assignment = await coachAcademyRepository.findActiveAssignment(actor.id, academyId);

    if (assignment) {
      return;
    }
  }

  throw new AppError(403, 'Forbidden');
}

async function ensureActiveCoachUser(coachId) {
  const user = await userRepository.findByIdWithRole(coachId);

  if (!user) {
    throw new AppError(404, 'Coach user not found');
  }

  if (!user.is_active || user.role_code !== 'coach') {
    throw new AppError(400, 'User must be an active coach');
  }

  return user;
}

async function ensureCoachUser(coachId) {
  const user = await userRepository.findByIdWithRole(coachId);

  if (!user) {
    throw new AppError(404, 'Coach user not found');
  }

  if (user.role_code !== 'coach') {
    throw new AppError(400, 'Selected user must have coach role');
  }

  return user;
}

async function ensureActiveAcademy(academyId) {
  const academy = await academyRepository.findById(academyId);

  if (!academy) {
    throw new AppError(404, 'Academy not found');
  }

  if (!academy.is_active) {
    throw new AppError(400, 'Academy must be active');
  }

  return academy;
}

function toAssignmentResponse(assignment) {
  return {
    coachId: Number(assignment.coach_id),
    academyId: Number(assignment.academy_id),
    assignedAt: assignment.assigned_at,
  };
}

async function listCoachAcademies(coachId, actor) {
  ensureCanViewCoachAcademies(actor, coachId);
  await ensureActiveCoachUser(coachId);

  const academies = await coachAcademyRepository.listActiveAcademiesForCoach(coachId);

  return {
    academies: academies.map((academy) => ({
      id: Number(academy.id),
      name: academy.name,
      assignedAt: academy.assigned_at,
    })),
  };
}

async function listAcademyCoaches(academyId, actor) {
  await ensureCanViewAcademyCoaches(actor, academyId);
  await ensureActiveAcademy(academyId);

  const coaches = await coachAcademyRepository.listActiveCoachesForAcademy(academyId);

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

async function assignCoachToAcademy(payload, context) {
  ensureCanManageCoachAcademies(context.actor);

  await ensureActiveCoachUser(payload.coachId);
  await ensureActiveAcademy(payload.academyId);

  const result = await withTransaction(async (client) => {
    const existing = await coachAcademyRepository.findActiveAssignment(
      payload.coachId,
      payload.academyId,
      client
    );

    if (existing) {
      return existing;
    }

    const assignment = await coachAcademyRepository.assignCoachToAcademy(
      {
        coachId: payload.coachId,
        academyId: payload.academyId,
        createdBy: context.actor.id,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'coach_academy',
        entityId: assignment.id,
        action: 'coach.academy_assigned',
        metadata: {
          coachId: payload.coachId,
          academyId: payload.academyId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return assignment;
  });

  return {
    assignment: toAssignmentResponse(result),
  };
}

async function unassignCoachFromAcademy(academyId, coachId, context) {
  ensureCanManageCoachAcademies(context.actor);

  await ensureCoachUser(coachId);

  const result = await withTransaction(async (client) => {
    const assignment = await coachAcademyRepository.unassignCoachFromAcademy(
      coachId,
      academyId,
      client
    );

    if (!assignment) {
      throw new AppError(404, 'Active coach academy assignment not found');
    }

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'coach_academy',
        entityId: assignment.id,
        action: 'coach.academy_unassigned',
        metadata: {
          coachId,
          academyId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return assignment;
  });

  return {
    assignment: toAssignmentResponse(result),
  };
}

module.exports = {
  listCoachAcademies,
  listAcademyCoaches,
  assignCoachToAcademy,
  unassignCoachFromAcademy,
};
