const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const childRepository = require('../repositories/child.repository');
const groupRepository = require('../repositories/group.repository');
const auditLogRepository = require('../repositories/auditLog.repository');
const questionnaireTokenService = require('./questionnaireToken.service');

function todayAsDateString() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeChildChangedFields(fields) {
  return fields.filter(
    (field) =>
      !['parentName', 'parentEmail', 'parentPhone', 'medicalNotes', 'generalNotes'].includes(
        field
      )
  );
}

function ensureCanViewChildren(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanManageChildren(actor) {
  if (!['super_admin', 'admin', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCoachCanAccessGroup(actor, groupId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await childRepository.userCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCoachCanAccessChild(actor, childId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await childRepository.userCanAccessChild(actor.id, childId);

  if (!canAccess) {
    throw new AppError(403, 'Forbidden');
  }
}

function toQuestionnairePreview(questionnaire) {
  if (!questionnaire || !questionnaire.status || !questionnaire.expires_at) {
    return null;
  }

  return {
    status: questionnaire.status,
    expiresAt: questionnaire.expires_at,
    link:
      questionnaire.token && questionnaire.status === 'pending'
        ? questionnaireTokenService.buildQuestionnaireLink(questionnaire.token)
        : null,
  };
}

function toChildListResponse(child) {
  return {
    id: child.id,
    firstName: child.first_name,
    lastName: child.last_name,
    birthDate: child.birth_date,
    gender: child.gender,
    parentName: child.parent_name,
    parentEmail: child.parent_email,
    parentPhone: child.parent_phone,
    isActive: child.is_active,
    currentGroup: child.current_group_id
      ? {
          id: child.current_group_id,
          name: child.current_group_name,
        }
      : null,
    questionnaire: toQuestionnairePreview({
      status: child.questionnaire_status,
      expires_at: child.questionnaire_expires_at,
      token: child.questionnaire_token,
    }),
    createdAt: child.created_at,
  };
}

function toChildDetailsResponse(child) {
  return {
    id: child.id,
    firstName: child.first_name,
    lastName: child.last_name,
    birthDate: child.birth_date,
    gender: child.gender,
    parentName: child.parent_name,
    parentEmail: child.parent_email,
    parentPhone: child.parent_phone,
    medicalNotes: child.medical_notes,
    generalNotes: child.general_notes,
    isActive: child.is_active,
    currentGroup: child.current_group_id
      ? {
          id: child.current_group_id,
          name: child.current_group_name,
        }
      : null,
    questionnaire: toQuestionnairePreview({
      status: child.questionnaire_status,
      expires_at: child.questionnaire_expires_at,
      token: child.questionnaire_token,
    }),
    createdAt: child.created_at,
    updatedAt: child.updated_at,
  };
}

async function ensureGroupIsEligible(groupId) {
  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(400, 'Group not found');
  }

  if (!group.is_active) {
    throw new AppError(400, 'Group must be active');
  }

  if (!group.season_is_active) {
    throw new AppError(400, 'Season must be active');
  }

  if (!group.academy_is_active) {
    throw new AppError(400, 'Academy must be active');
  }

  return group;
}

async function listChildren(filters, actor) {
  ensureCanViewChildren(actor);

  if (actor.role === 'coach' && filters.groupId !== undefined) {
    await ensureCoachCanAccessGroup(actor, filters.groupId);
  }

  const children = await childRepository.listChildren(filters, actor);
  const total = await childRepository.countChildren(filters, actor);

  return {
    children: children.map(toChildListResponse),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function getChildById(id, actor) {
  ensureCanViewChildren(actor);

  const child = await childRepository.findByIdWithCurrentGroup(id);

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  await ensureCoachCanAccessChild(actor, id);

  return toChildDetailsResponse(child);
}

async function createChild(payload, context) {
  ensureCanManageChildren(context.actor);

  await ensureGroupIsEligible(payload.groupId);
  await ensureCoachCanAccessGroup(context.actor, payload.groupId);

  const startsOn = payload.startsOn || todayAsDateString();

  const result = await withTransaction(async (client) => {
    const createdChild = await childRepository.createChild(
      {
        firstName: payload.firstName,
        lastName: payload.lastName,
        birthDate: payload.birthDate,
        gender: payload.gender,
        parentName: payload.parentName,
        parentEmail: payload.parentEmail,
        parentPhone: payload.parentPhone,
        medicalNotes: payload.medicalNotes,
        generalNotes: payload.generalNotes,
        createdBy: context.actor.id,
      },
      client
    );

    await childRepository.assignChildToGroup(
      {
        childId: createdChild.id,
        groupId: payload.groupId,
        startsOn,
        createdBy: context.actor.id,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'child',
        entityId: createdChild.id,
        action: 'child.created',
        metadata: {
          changedFields: ['firstName', 'lastName', 'birthDate', 'gender'],
          groupId: payload.groupId,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    const questionnaire = await questionnaireTokenService.generateTokenForChild(
      createdChild.id,
      context,
      {
        forceRegenerate: false,
        client,
        skipAccessCheck: true,
      }
    );

    return {
      childId: createdChild.id,
      questionnaire,
    };
  });

  const child = await childRepository.findByIdWithCurrentGroup(result.childId);

  return {
    id: child.id,
    firstName: child.first_name,
    lastName: child.last_name,
    isActive: child.is_active,
    currentGroup: child.current_group_id
      ? {
          id: child.current_group_id,
          name: child.current_group_name,
        }
      : null,
    questionnaire: result.questionnaire,
  };
}

async function updateChild(id, payload, context) {
  ensureCanManageChildren(context.actor);

  const existingChild = await childRepository.findByIdWithCurrentGroup(id);

  if (!existingChild) {
    throw new AppError(404, 'Child not found');
  }

  await ensureCoachCanAccessChild(context.actor, id);

  const updatedChild = await childRepository.updateChild(id, {
    firstName: payload.firstName,
    lastName: payload.lastName,
    birthDate: payload.birthDate,
    gender: payload.gender,
    parentName: payload.parentName,
    parentEmail: payload.parentEmail,
    parentPhone: payload.parentPhone,
    medicalNotes: payload.medicalNotes,
    generalNotes: payload.generalNotes,
  });

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'child',
    entityId: updatedChild.id,
    action: 'child.updated',
    metadata: {
      changedFields: sanitizeChildChangedFields(Object.keys(payload)),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toChildDetailsResponse(updatedChild);
}

async function updateChildStatus(id, payload, context) {
  ensureCanManageChildren(context.actor);

  const existingChild = await childRepository.findByIdWithCurrentGroup(id);

  if (!existingChild) {
    throw new AppError(404, 'Child not found');
  }

  await ensureCoachCanAccessChild(context.actor, id);

  const updatedChild = await childRepository.updateStatus(id, payload.isActive);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'child',
    entityId: updatedChild.id,
    action: 'child.status_updated',
    metadata: {
      changedFields: ['isActive'],
      previousIsActive: existingChild.is_active,
      newIsActive: updatedChild.is_active,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return toChildDetailsResponse(updatedChild);
}

async function generateQuestionnaireToken(id, payload, context) {
  ensureCanManageChildren(context.actor);

  const existingChild = await childRepository.findByIdWithCurrentGroup(id);

  if (!existingChild) {
    throw new AppError(404, 'Child not found');
  }

  await ensureCoachCanAccessChild(context.actor, id);

  return questionnaireTokenService.generateTokenForChild(id, context, {
    forceRegenerate: payload.forceRegenerate,
  });
}

module.exports = {
  listChildren,
  getChildById,
  createChild,
  updateChild,
  updateChildStatus,
  generateQuestionnaireToken,
};
