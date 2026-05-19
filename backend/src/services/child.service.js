const AppError = require('../utils/AppError');
const { env } = require('../config/env');
const { withTransaction } = require('../db/postgres');
const childRepository = require('../repositories/child.repository');
const groupRepository = require('../repositories/group.repository');
const auditLogRepository = require('../repositories/auditLog.repository');
const questionnaireTokenRepository = require('../repositories/questionnaireToken.repository');
const questionnaireDeliveryRepository = require('../repositories/questionnaireDelivery.repository');
const emailService = require('./email.service');
const questionnaireEmailService = require('./questionnaireEmail.service');
const questionnaireTokenService = require('./questionnaireToken.service');

function todayAsDateString() {
  return new Date().toISOString().slice(0, 10);
}

function parseDateOrThrow(value) {
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(400, 'Invalid date');
  }

  return parsed;
}

function addDays(date, days) {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function toDateString(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new AppError(400, 'Invalid date');
    }

    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return parseDateOrThrow(trimmed).toISOString().slice(0, 10);
    }

    const parsed = new Date(trimmed);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    throw new AppError(400, 'Invalid date');
  }

  throw new AppError(400, 'Invalid date');
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

function ensureCanSendQuestionnaireEmail(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanAssignChildToGroup(actor) {
  if (!['super_admin', 'admin', 'manager'].includes(actor.role)) {
    throw new AppError(403, 'Само администратор или мениджър може да мести дете между групи.');
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

function toQuestionnaireDeliveryPreview(delivery) {
  if (!delivery) {
    return null;
  }

  return {
    channel: delivery.channel,
    recipient: delivery.recipient,
    status: delivery.status,
    sentAt: delivery.sent_at || delivery.created_at,
    createdAt: delivery.created_at,
  };
}

function normalizeEmail(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function summarizeErrorMessage(error) {
  if (!error || typeof error.message !== 'string') {
    return 'unknown email error';
  }

  return error.message.trim().slice(0, 300) || 'unknown email error';
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
          season: child.current_season_id
            ? {
                id: child.current_season_id,
                name: child.current_season_name,
              }
            : null,
          academy: child.current_academy_id
            ? {
                id: child.current_academy_id,
                name: child.current_academy_name,
              }
            : null,
        }
      : null,
    currentSeason: child.current_season_id
      ? {
          id: child.current_season_id,
          name: child.current_season_name,
        }
      : null,
    currentAcademy: child.current_academy_id
      ? {
          id: child.current_academy_id,
          name: child.current_academy_name,
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
          season: child.current_season_id
            ? {
                id: child.current_season_id,
                name: child.current_season_name,
              }
            : null,
          academy: child.current_academy_id
            ? {
                id: child.current_academy_id,
                name: child.current_academy_name,
              }
            : null,
        }
      : null,
    currentSeason: child.current_season_id
      ? {
          id: child.current_season_id,
          name: child.current_season_name,
        }
      : null,
    currentAcademy: child.current_academy_id
      ? {
          id: child.current_academy_id,
          name: child.current_academy_name,
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

  const group = await ensureGroupIsEligible(payload.groupId);
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
        seasonId: Number(group.season_id),
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
          season: child.current_season_id
            ? {
                id: child.current_season_id,
                name: child.current_season_name,
              }
            : null,
          academy: child.current_academy_id
            ? {
                id: child.current_academy_id,
                name: child.current_academy_name,
              }
            : null,
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

async function sendQuestionnaireEmail(id, payload, context) {
  ensureCanSendQuestionnaireEmail(context.actor);

  const existingChild = await childRepository.findByIdWithCurrentGroup(id);

  if (!existingChild) {
    throw new AppError(404, 'Child not found');
  }

  await ensureCoachCanAccessChild(context.actor, id);

  if (!existingChild.is_active) {
    throw new AppError(409, 'Профилът на детето не е активен.');
  }

  const parentEmail = normalizeEmail(existingChild.parent_email);

  if (!parentEmail) {
    throw new AppError(400, 'Няма въведен имейл на родител.');
  }

  if (!env.EMAIL_ENABLED) {
    throw new AppError(503, 'Email delivery is not enabled');
  }

  const latestToken = await questionnaireTokenRepository.getLatestForChild(id);

  if (latestToken && latestToken.status === 'submitted') {
    throw new AppError(409, 'Въпросникът вече е попълнен.');
  }

  const tokenResult = await questionnaireTokenService.generateTokenForChild(id, context, {
    forceRegenerate: payload.forceRegenerate,
    includeTokenRecord: true,
  });

  const questionnaire = tokenResult.questionnaire;
  const tokenRecord = tokenResult.tokenRecord;
  const emailContent = questionnaireEmailService.buildQuestionnaireEmail({
    child: {
      firstName: existingChild.first_name,
      lastName: existingChild.last_name,
    },
    questionnaireLink: questionnaire.link,
    expiresAt: questionnaire.expiresAt,
  });

  try {
    await emailService.sendMail({
      to: parentEmail,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    });

    const deliveryLog = await questionnaireDeliveryRepository.createDeliveryLog({
      childId: id,
      questionnaireTokenId: tokenRecord.id,
      channel: 'email',
      recipient: parentEmail,
      status: 'sent',
      sentAt: new Date().toISOString(),
      createdBy: context.actor.id,
    });

    await auditLogRepository.createAuditLog({
      actorUserId: context.actor.id,
      entityType: 'child',
      entityId: id,
      action: 'questionnaire.email_sent',
      metadata: {
        childId: id,
        recipient: parentEmail,
        questionnaireTokenId: tokenRecord.id,
        status: 'sent',
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const latestEmailDelivery = toQuestionnaireDeliveryPreview(deliveryLog);

    return {
      message: 'Въпросникът е изпратен успешно.',
      questionnaire: {
        ...questionnaire,
        latestEmailDelivery,
      },
      delivery: latestEmailDelivery,
    };
  } catch (error) {
    const errorMessage = summarizeErrorMessage(error);

    try {
      await questionnaireDeliveryRepository.createDeliveryLog({
        childId: id,
        questionnaireTokenId: tokenRecord.id,
        channel: 'email',
        recipient: parentEmail,
        status: 'failed',
        sentAt: null,
        errorMessage,
        createdBy: context.actor.id,
      });

      await auditLogRepository.createAuditLog({
        actorUserId: context.actor.id,
        entityType: 'child',
        entityId: id,
        action: 'questionnaire.email_failed',
        metadata: {
          childId: id,
          recipient: parentEmail,
          questionnaireTokenId: tokenRecord.id,
          status: 'failed',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
    } catch (_loggingError) {
      // Preserve the original send failure.
    }

    throw new AppError(502, 'Възникна грешка при изпращане на имейла.');
  }
}

async function assignChildToGroup(childId, payload, context) {
  ensureCanAssignChildToGroup(context.actor);

  const child = await childRepository.findByIdWithCurrentGroup(childId);

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  const targetGroup = await ensureGroupIsEligible(payload.groupId);

  const targetSeasonId = Number(targetGroup.season_id);
  const targetAcademyId = Number(targetGroup.academy_id);

  const startsOnDate = parseDateOrThrow(payload.startsOn);
  const previousEndsOn = addDays(startsOnDate, -1).toISOString().slice(0, 10);

  const assignment = await withTransaction(async (client) => {
    const activeAssignment = await childRepository.findActiveGroupAssignmentInAcademy(
      childId,
      targetAcademyId,
      client
    );

    if (activeAssignment && Number(activeAssignment.group_id) === Number(payload.groupId)) {
      return {
        child_id: childId,
        group_id: payload.groupId,
        season_id: targetSeasonId,
        academy_id: targetAcademyId,
        starts_on: activeAssignment.starts_on,
      };
    }

    let latestProtectedDate = null;

    if (activeAssignment) {
      const latestProtectedDateRaw = await childRepository.getLatestProtectedActivityDateForChildGroup(
        childId,
        Number(activeAssignment.group_id),
        client
      );

      latestProtectedDate = latestProtectedDateRaw
        ? toDateString(latestProtectedDateRaw)
        : null;

      if (latestProtectedDate && payload.startsOn <= latestProtectedDate) {
        throw new AppError(
          409,
          `Детето има въведени резултати в текущата група до ${latestProtectedDate}. Изберете начална дата след тази дата, за да се запази историята коректно.`
        );
      }

      const activeStartsOn = toDateString(activeAssignment.starts_on);

      if (previousEndsOn < activeStartsOn) {
        throw new AppError(400, `startsOn must be after ${activeStartsOn}`);
      }

      await childRepository.closeActiveGroupAssignmentsInAcademy(
        childId,
        targetAcademyId,
        previousEndsOn,
        client
      );
    }

    const createdAssignment = await childRepository.assignChildToGroup(
      {
        childId,
        groupId: payload.groupId,
        seasonId: targetSeasonId,
        startsOn: payload.startsOn,
        createdBy: context.actor.id,
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'child',
        entityId: childId,
        action: 'child.group_assigned',
        metadata: {
          childId,
          previousGroupId: activeAssignment ? Number(activeAssignment.group_id) : null,
          newGroupId: payload.groupId,
          academyId: targetAcademyId,
          startsOn: payload.startsOn,
          previousEndsOn: activeAssignment ? previousEndsOn : null,
          latestProtectedDate,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return createdAssignment;
  });

  return {
    assignment: {
      childId: Number(assignment.child_id),
      groupId: Number(assignment.group_id),
      academyId: targetAcademyId,
      seasonId: Number(assignment.season_id),
      startsOn: assignment.starts_on,
    },
  };
}

module.exports = {
  listChildren,
  getChildById,
  createChild,
  updateChild,
  updateChildStatus,
  generateQuestionnaireToken,
  sendQuestionnaireEmail,
  assignChildToGroup,
};
