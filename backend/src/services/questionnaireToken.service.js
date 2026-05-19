const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const { env } = require('../config/env');
const childRepository = require('../repositories/child.repository');
const questionnaireTokenRepository = require('../repositories/questionnaireToken.repository');
const auditLogRepository = require('../repositories/auditLog.repository');

function buildQuestionnaireLink(token) {
  const baseUrl = env.PUBLIC_APP_URL.replace(/\/+$/, '');
  return `${baseUrl}/questionnaire/${token}`;
}

function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() < Date.now();
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function createUniqueTokenRecord(data, client) {
  for (let i = 0; i < 5; i += 1) {
    const tokenValue = crypto.randomBytes(32).toString('hex');

    try {
      return await questionnaireTokenRepository.createToken(
        {
          childId: data.childId,
          token: tokenValue,
          expiresAt: data.expiresAt,
          createdBy: data.createdBy,
        },
        client
      );
    } catch (error) {
      if (error.code !== '23505') {
        throw error;
      }
    }
  }

  throw new AppError(500, 'Failed to generate questionnaire token');
}

function ensureCanGenerateToken(actor, forceRegenerate) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }

  if (forceRegenerate && !['super_admin', 'admin'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureChildAccess(actor, childId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await childRepository.userCanAccessChild(actor.id, childId);

  if (!canAccess) {
    throw new AppError(403, 'Forbidden');
  }
}

async function generateTokenCore(childId, context, options) {
  const forceRegenerate = options.forceRegenerate || false;
  const client = options.client;

  ensureCanGenerateToken(context.actor, forceRegenerate);

  const child = await childRepository.findById(childId, client);

  if (!child) {
    throw new AppError(404, 'Child not found');
  }

  if (!options.skipAccessCheck) {
    await ensureChildAccess(context.actor, childId);
  }

  const pendingToken = await questionnaireTokenRepository.findPendingByChildId(
    childId,
    client
  );

  if (pendingToken) {
    if (isExpired(pendingToken.expires_at)) {
      await questionnaireTokenRepository.markExpired(pendingToken.id, client);
    } else if (!forceRegenerate) {
      return {
        tokenRecord: pendingToken,
        wasCreated: false,
      };
    } else {
      await questionnaireTokenRepository.revokePendingForChild(childId, client);

      await auditLogRepository.createAuditLog(
        {
          actorUserId: context.actor.id,
          entityType: 'questionnaire_token',
          entityId: childId,
          action: 'questionnaire_token.revoked',
          metadata: {
            forceRegenerate: true,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
        client
      );
    }
  }

  const now = new Date();
  const expiresAt = addDays(now, env.QUESTIONNAIRE_TOKEN_EXPIRES_DAYS);

  const tokenRecord = await createUniqueTokenRecord(
    {
      childId,
      expiresAt,
      createdBy: context.actor.id,
    },
    client
  );

  await auditLogRepository.createAuditLog(
    {
      actorUserId: context.actor.id,
      entityType: 'questionnaire_token',
      entityId: childId,
      action: 'questionnaire_token.created',
      metadata: {
        tokenExpiresAt: tokenRecord.expires_at,
        forceRegenerate,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    },
    client
  );

  return {
    tokenRecord,
    wasCreated: true,
  };
}

async function generateTokenForChild(childId, context, options = {}) {
  const forceRegenerate = options.forceRegenerate || false;

  let result;

  if (options.client) {
    result = await generateTokenCore(childId, context, {
      ...options,
      forceRegenerate,
    });
  } else {
    result = await withTransaction((client) =>
      generateTokenCore(childId, context, {
        ...options,
        client,
        forceRegenerate,
      })
    );
  }

  const questionnaire = {
    status: result.tokenRecord.status,
    expiresAt: result.tokenRecord.expires_at,
    link: buildQuestionnaireLink(result.tokenRecord.token),
  };

  if (options.includeTokenRecord) {
    return {
      tokenRecord: result.tokenRecord,
      questionnaire,
    };
  }

  return questionnaire;
}

async function getPublicQuestionnaireByToken(token) {
  const tokenRecord = await questionnaireTokenRepository.findByToken(token);

  if (!tokenRecord) {
    throw new AppError(404, 'Questionnaire token not found');
  }

  if (tokenRecord.status === 'submitted') {
    throw new AppError(409, 'Questionnaire has already been submitted');
  }

  if (tokenRecord.status === 'revoked') {
    throw new AppError(410, 'Questionnaire link has been revoked');
  }

  if (tokenRecord.status === 'expired') {
    throw new AppError(410, 'Questionnaire link has expired');
  }

  if (isExpired(tokenRecord.expires_at)) {
    await questionnaireTokenRepository.markExpired(tokenRecord.id);
    throw new AppError(410, 'Questionnaire link has expired');
  }

  if (!tokenRecord.child_is_active) {
    throw new AppError(410, 'Questionnaire is no longer available');
  }

  return {
    questionnaire: {
      status: tokenRecord.status,
      expiresAt: tokenRecord.expires_at,
      child: {
        firstName: tokenRecord.child_first_name,
        lastName: tokenRecord.child_last_name,
      },
    },
  };
}

module.exports = {
  generateTokenForChild,
  buildQuestionnaireLink,
  getPublicQuestionnaireByToken,
};
