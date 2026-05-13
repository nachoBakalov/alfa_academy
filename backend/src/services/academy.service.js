const AppError = require('../utils/AppError');
const academyRepository = require('../repositories/academy.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

function toAcademyResponse(academy) {
  return {
    id: academy.id,
    name: academy.name,
    description: academy.description,
    isActive: academy.is_active,
    createdAt: academy.created_at,
    updatedAt: academy.updated_at,
  };
}

function ensureCanViewAcademies(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanManageAcademies(actor) {
  if (!['super_admin', 'admin'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCanViewAcademy(actor, academyId) {
  ensureCanViewAcademies(actor);

  if (actor.role === 'coach') {
    const canAccess = await academyRepository.coachCanAccessAcademy(actor.id, academyId);

    if (!canAccess) {
      throw new AppError(403, 'Forbidden');
    }
  }
}

async function listAcademies(filters, actor) {
  ensureCanViewAcademies(actor);

  const academies = await academyRepository.listAcademies(filters, actor);
  const total = await academyRepository.countAcademies(filters, actor);

  return {
    academies: academies.map(toAcademyResponse),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function getAcademyById(id, actor) {
  const academy = await academyRepository.findById(id);

  if (!academy) {
    throw new AppError(404, 'Academy not found');
  }

  await ensureCanViewAcademy(actor, id);

  return toAcademyResponse(academy);
}

async function createAcademy(payload, context) {
  ensureCanManageAcademies(context.actor);

  const name = payload.name.trim();
  const existingByName = await academyRepository.findByName(name);

  if (existingByName) {
    throw new AppError(409, 'Academy name already exists');
  }

  const academy = await academyRepository.createAcademy({
    name,
    description: payload.description,
    createdBy: context.actor.id,
  });

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'academy',
    entityId: academy.id,
    action: 'academy.created',
    metadata: {
      changedFields: ['name', 'description'],
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toAcademyResponse(academy);
}

async function updateAcademy(id, payload, context) {
  ensureCanManageAcademies(context.actor);

  const existingAcademy = await academyRepository.findById(id);

  if (!existingAcademy) {
    throw new AppError(404, 'Academy not found');
  }

  const updateData = {};

  if (payload.name !== undefined) {
    const normalizedName = payload.name.trim();
    const existingByName = await academyRepository.findByName(normalizedName);

    if (existingByName && existingByName.id !== existingAcademy.id) {
      throw new AppError(409, 'Academy name already exists');
    }

    updateData.name = normalizedName;
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description;
  }

  const updatedAcademy = await academyRepository.updateAcademy(id, updateData);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'academy',
    entityId: updatedAcademy.id,
    action: 'academy.updated',
    metadata: {
      changedFields: Object.keys(payload),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toAcademyResponse(updatedAcademy);
}

async function updateAcademyStatus(id, payload, context) {
  ensureCanManageAcademies(context.actor);

  const existingAcademy = await academyRepository.findById(id);

  if (!existingAcademy) {
    throw new AppError(404, 'Academy not found');
  }

  const updatedAcademy = await academyRepository.updateStatus(id, payload.isActive);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'academy',
    entityId: updatedAcademy.id,
    action: 'academy.status_updated',
    metadata: {
      changedFields: ['isActive'],
      previousIsActive: existingAcademy.is_active,
      newIsActive: updatedAcademy.is_active,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toAcademyResponse(updatedAcademy);
}

module.exports = {
  listAcademies,
  getAcademyById,
  createAcademy,
  updateAcademy,
  updateAcademyStatus,
};
