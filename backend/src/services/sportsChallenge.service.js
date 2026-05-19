const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const groupRepository = require('../repositories/group.repository');
const sportsChallengeRepository = require('../repositories/sportsChallenge.repository');
const auditLogRepository = require('../repositories/auditLog.repository');
const {
  calculateIndividualResult,
  calculateSportsChallengeSummary,
} = require('./sportsChallengeCalculation.service');

function toDefinitionResponse(definition) {
  return {
    id: Number(definition.id),
    code: definition.code,
    name: definition.name,
    description: definition.description,
    unit: definition.unit,
    resultDirection: definition.result_direction,
    targetType: definition.target_type,
    defaultTargetReductionPercent: Number(definition.default_target_reduction_percent),
    defaultFailSafeThresholdPercent: Number(definition.default_fail_safe_threshold_percent),
    isActive: Boolean(definition.is_active),
  };
}

function toSummaryResponse(summary) {
  if (!summary) {
    return {
      participantsCount: 0,
      finalResultsCount: 0,
      baselineTotal: 0,
      groupTargetTotal: 0,
      finalTotal: 0,
      groupTargetReached: false,
      repeatedOrImprovedCount: 0,
      repeatedOrImprovedPercentage: 0,
      failSafeReached: false,
      finalStatus: 'not_passed',
      calculatedAt: null,
    };
  }

  return {
    participantsCount: Number(summary.participants_count),
    finalResultsCount: Number(summary.final_results_count),
    baselineTotal: Number(summary.baseline_total),
    groupTargetTotal: Number(summary.group_target_total),
    finalTotal: Number(summary.final_total),
    groupTargetReached: Boolean(summary.group_target_reached),
    repeatedOrImprovedCount: Number(summary.repeated_or_improved_count),
    repeatedOrImprovedPercentage: Number(summary.repeated_or_improved_percentage),
    failSafeReached: Boolean(summary.fail_safe_reached),
    finalStatus: summary.final_status,
    calculatedAt: summary.calculated_at || null,
  };
}

function toChallengeListItem(challenge) {
  return {
    id: Number(challenge.id),
    definition: {
      id: Number(challenge.definition_id),
      code: challenge.definition_code,
      name: challenge.definition_name,
    },
    group: {
      id: Number(challenge.group_id),
      name: challenge.group_name,
    },
    title: challenge.title,
    startsOn: challenge.starts_on,
    endsOn: challenge.ends_on,
    status: challenge.status,
    unit: challenge.unit,
    targetReductionPercent: Number(challenge.target_reduction_percent),
    failSafeThresholdPercent: Number(challenge.fail_safe_threshold_percent),
    summary: {
      participantsCount: Number(challenge.participants_count || 0),
      finalResultsCount: Number(challenge.final_results_count || 0),
      groupTargetReached: Boolean(challenge.group_target_reached || false),
      failSafeReached: Boolean(challenge.fail_safe_reached || false),
      finalStatus: challenge.final_status || 'not_passed',
    },
  };
}

function toChallengeResponse(challenge) {
  return {
    id: Number(challenge.id),
    definition: {
      id: Number(challenge.definition_id),
      code: challenge.definition_code,
      name: challenge.definition_name,
      description: challenge.definition_description,
      resultDirection: challenge.definition_result_direction,
      targetType: challenge.definition_target_type,
    },
    group: {
      id: Number(challenge.group_id),
      name: challenge.group_name,
      season: {
        id: Number(challenge.season_id),
        name: challenge.season_name,
      },
      academy: {
        id: Number(challenge.academy_id),
        name: challenge.academy_name,
      },
    },
    title: challenge.title,
    description: challenge.description,
    startsOn: challenge.starts_on,
    endsOn: challenge.ends_on,
    status: challenge.status,
    unit: challenge.unit,
    targetReductionPercent: Number(challenge.target_reduction_percent),
    failSafeThresholdPercent: Number(challenge.fail_safe_threshold_percent),
  };
}

function ensureCanViewSports(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanManageDefinitions(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function ensureCanManageDefinitionStatus(actor) {
  if (!['super_admin', 'admin', 'manager'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCanViewGroupSports(actor, groupId) {
  ensureCanViewSports(actor);

  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await groupRepository.coachCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'You do not have access to this sports challenge');
  }
}

async function ensureCanEditGroupSports(actor, groupId) {
  if (!['super_admin', 'admin', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'You do not have permission to edit sports challenges for this group');
  }

  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await groupRepository.coachCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'You do not have access to this sports challenge');
  }
}

async function ensureCanViewChallenge(actor, challenge) {
  return ensureCanViewGroupSports(actor, Number(challenge.group_id));
}

async function ensureCanEditChallenge(actor, challenge) {
  return ensureCanEditGroupSports(actor, Number(challenge.group_id));
}

function ensureChallengeIsEditable(challenge) {
  if (challenge.status === 'archived') {
    throw new AppError(409, 'Archived sports challenge cannot be edited');
  }
}

function ensureDateRange(startsOn, endsOn) {
  if (startsOn && endsOn && endsOn < startsOn) {
    throw new AppError(400, 'endsOn must be greater than or equal to startsOn');
  }
}

function toSummaryPayload(summary) {
  return {
    participantsCount: summary.participantsCount,
    finalResultsCount: summary.finalResultsCount,
    baselineTotal: summary.baselineTotal,
    groupTargetTotal: summary.groupTargetTotal,
    finalTotal: summary.finalTotal,
    groupTargetReached: summary.groupTargetReached,
    repeatedOrImprovedCount: summary.repeatedOrImprovedCount,
    repeatedOrImprovedPercentage: summary.repeatedOrImprovedPercentage,
    failSafeReached: summary.failSafeReached,
    finalStatus: summary.finalStatus,
    targetReductionPercent: summary.targetReductionPercent,
    failSafeThresholdPercent: summary.failSafeThresholdPercent,
  };
}

function normalizeResultsForCalculation(rows) {
  return rows.map((row) => ({
    childId: Number(row.child_id),
    baselineValue: row.baseline_value,
    finalValue: row.final_value,
  }));
}

function mapSavedResultResponse(calculated) {
  return {
    childId: calculated.childId,
    baselineValue: calculated.baselineValue,
    finalValue: calculated.finalValue,
    individualTargetValue: calculated.individualTargetValue,
    individualTargetReached: calculated.individualTargetReached,
    repeatedOrImprovedBaseline: calculated.repeatedOrImprovedBaseline,
    differenceFromBaseline: calculated.differenceFromBaseline,
    differenceFromTarget: calculated.differenceFromTarget,
  };
}

async function listDefinitions(filters, actor) {
  ensureCanViewSports(actor);

  const definitions = await sportsChallengeRepository.listDefinitions(filters);

  return {
    definitions: definitions.map(toDefinitionResponse),
  };
}

async function createDefinition(payload, context) {
  ensureCanManageDefinitions(context.actor);

  try {
    return withTransaction(async (client) => {
      const existing = await sportsChallengeRepository.findDefinitionByCode(payload.code, client);

      if (existing) {
        throw new AppError(409, 'Sports challenge definition code already exists');
      }

      const definition = await sportsChallengeRepository.createDefinition(payload, client);

      await auditLogRepository.createAuditLog(
        {
          actorUserId: context.actor.id,
          entityType: 'sports_challenge_definition',
          entityId: Number(definition.id),
          action: 'sports.definition_created',
          metadata: {
            definitionId: Number(definition.id),
            code: definition.code,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
        client
      );

      return {
        definition: toDefinitionResponse(definition),
      };
    });
  } catch (error) {
    if (error && error.code === '23505') {
      throw new AppError(409, 'Sports challenge definition code already exists');
    }

    throw error;
  }
}

async function updateDefinition(definitionId, payload, context) {
  ensureCanManageDefinitions(context.actor);

  const existing = await sportsChallengeRepository.findDefinitionById(definitionId);

  if (!existing) {
    throw new AppError(404, 'Sports challenge definition not found');
  }

  const updated = await sportsChallengeRepository.updateDefinition(definitionId, payload);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'sports_challenge_definition',
    entityId: Number(updated.id),
    action: 'sports.definition_updated',
    metadata: {
      definitionId: Number(updated.id),
      code: updated.code,
      changedFields: Object.keys(payload),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    definition: toDefinitionResponse(updated),
  };
}

async function updateDefinitionStatus(definitionId, payload, context) {
  ensureCanManageDefinitionStatus(context.actor);

  const existing = await sportsChallengeRepository.findDefinitionById(definitionId);

  if (!existing) {
    throw new AppError(404, 'Sports challenge definition not found');
  }

  const updated = await sportsChallengeRepository.updateDefinitionStatus(
    definitionId,
    payload.isActive
  );

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'sports_challenge_definition',
    entityId: Number(updated.id),
    action: 'sports.definition_status_updated',
    metadata: {
      definitionId: Number(updated.id),
      code: updated.code,
      previousIsActive: Boolean(existing.is_active),
      newIsActive: Boolean(updated.is_active),
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    definition: toDefinitionResponse(updated),
  };
}

async function listGroupChallenges(groupId, filters, actor) {
  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  await ensureCanViewGroupSports(actor, groupId);

  const challenges = await sportsChallengeRepository.listGroupChallenges(groupId, filters);
  const total = await sportsChallengeRepository.countGroupChallenges(groupId, filters);

  return {
    challenges: challenges.map(toChallengeListItem),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function createGroupChallenge(groupId, payload, context) {
  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  await ensureCanEditGroupSports(context.actor, groupId);

  if (!group.is_active) {
    throw new AppError(409, 'Group is not active');
  }

  if (!group.season_is_active) {
    throw new AppError(409, 'Season is not active');
  }

  if (!group.academy_is_active) {
    throw new AppError(409, 'Academy is not active');
  }

  const definition = await sportsChallengeRepository.findDefinitionByCode(payload.definitionCode);

  if (!definition || !definition.is_active) {
    throw new AppError(404, 'Sports challenge definition not found');
  }

  try {
    return withTransaction(async (client) => {
      const created = await sportsChallengeRepository.createChallenge(
        {
          definitionId: definition.id,
          groupId,
          title: payload.title,
          description: payload.description,
          startsOn: payload.startsOn,
          endsOn: payload.endsOn,
          status: 'active',
          unit: definition.unit,
          targetReductionPercent:
            payload.targetReductionPercent ?? Number(definition.default_target_reduction_percent),
          failSafeThresholdPercent:
            payload.failSafeThresholdPercent ??
            Number(definition.default_fail_safe_threshold_percent),
          createdBy: context.actor.id,
        },
        client
      );

      const challenge = await sportsChallengeRepository.findChallengeByIdWithDetails(
        created.id,
        client
      );

      await auditLogRepository.createAuditLog(
        {
          actorUserId: context.actor.id,
          entityType: 'sports_challenge',
          entityId: challenge.id,
          action: 'sports.challenge_created',
          metadata: {
            groupId: Number(challenge.group_id),
            challengeId: Number(challenge.id),
            definitionCode: challenge.definition_code,
            status: challenge.status,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
        client
      );

      return {
        challenge: toChallengeResponse(challenge),
      };
    });
  } catch (error) {
    if (error && error.code === '23505') {
      throw new AppError(409, 'Could not create sports challenge');
    }

    throw error;
  }
}

async function getChallengeById(challengeId, actor) {
  const challenge = await sportsChallengeRepository.findChallengeByIdWithDetails(challengeId);

  if (!challenge) {
    throw new AppError(404, 'Sports challenge not found');
  }

  await ensureCanViewChallenge(actor, challenge);

  const [children, results, summaryRow] = await Promise.all([
    sportsChallengeRepository.getChildrenForChallengeGroup(challengeId),
    sportsChallengeRepository.getResultsForChallenge(challengeId),
    sportsChallengeRepository.getChallengeSummary(challengeId),
  ]);

  const resultsMap = new Map(results.map((result) => [Number(result.child_id), result]));

  const mergedResults = children.map((child) => {
    const result = resultsMap.get(Number(child.id));

    return {
      child: {
        id: Number(child.id),
        firstName: child.first_name,
        lastName: child.last_name,
      },
      baselineValue:
        result && result.baseline_value !== null ? Number(result.baseline_value) : null,
      finalValue: result && result.final_value !== null ? Number(result.final_value) : null,
      individualTargetValue:
        result && result.individual_target_value !== null
          ? Number(result.individual_target_value)
          : null,
      individualTargetReached: result ? result.individual_target_reached : null,
      repeatedOrImprovedBaseline: result ? result.repeated_or_improved_baseline : null,
      differenceFromBaseline:
        result && result.difference_from_baseline !== null
          ? Number(result.difference_from_baseline)
          : null,
      differenceFromTarget:
        result && result.difference_from_target !== null
          ? Number(result.difference_from_target)
          : null,
      notes: result ? result.notes : null,
    };
  });

  const summary = summaryRow
    ? toSummaryResponse(summaryRow)
    : {
        ...toSummaryPayload(
          calculateSportsChallengeSummary({
            results: normalizeResultsForCalculation(results),
            targetReductionPercent: Number(challenge.target_reduction_percent),
            failSafeThresholdPercent: Number(challenge.fail_safe_threshold_percent),
            resultDirection: challenge.definition_result_direction || 'higher_is_better',
          })
        ),
        calculatedAt: null,
      };

  return {
    challenge: {
      ...toChallengeResponse(challenge),
      results: mergedResults,
      summary,
    },
  };
}

async function updateChallenge(challengeId, payload, context) {
  const challenge = await sportsChallengeRepository.findChallengeByIdWithDetails(challengeId);

  if (!challenge) {
    throw new AppError(404, 'Sports challenge not found');
  }

  await ensureCanEditChallenge(context.actor, challenge);
  ensureChallengeIsEditable(challenge);

  const nextStartsOn = payload.startsOn || challenge.starts_on;
  const nextEndsOn = payload.endsOn || challenge.ends_on;
  ensureDateRange(nextStartsOn, nextEndsOn);

  try {
    const updated = await sportsChallengeRepository.updateChallenge(challengeId, payload);

    await auditLogRepository.createAuditLog({
      actorUserId: context.actor.id,
      entityType: 'sports_challenge',
      entityId: Number(updated.id),
      action: 'sports.challenge_updated',
      metadata: {
        challengeId: Number(updated.id),
        groupId: Number(updated.group_id),
        changedFields: Object.keys(payload),
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      challenge: toChallengeResponse(updated),
    };
  } catch (error) {
    if (error && error.code === '23505') {
      throw new AppError(409, 'Could not update sports challenge');
    }

    throw error;
  }
}

async function updateChallengeStatus(challengeId, payload, context) {
  const challenge = await sportsChallengeRepository.findChallengeByIdWithDetails(challengeId);

  if (!challenge) {
    throw new AppError(404, 'Sports challenge not found');
  }

  await ensureCanEditChallenge(context.actor, challenge);

  const updated = await sportsChallengeRepository.updateChallengeStatus(challengeId, payload.status);

  await auditLogRepository.createAuditLog({
    actorUserId: context.actor.id,
    entityType: 'sports_challenge',
    entityId: Number(updated.id),
    action: 'sports.challenge_status_updated',
    metadata: {
      challengeId: Number(updated.id),
      groupId: Number(updated.group_id),
      previousStatus: challenge.status,
      newStatus: updated.status,
      status: updated.status,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  });

  return {
    challenge: toChallengeResponse(updated),
  };
}

async function saveChallengeResults(challengeId, payload, context) {
  const challenge = await sportsChallengeRepository.findChallengeByIdWithDetails(challengeId);

  if (!challenge) {
    throw new AppError(404, 'Sports challenge not found');
  }

  await ensureCanEditChallenge(context.actor, challenge);
  ensureChallengeIsEditable(challenge);

  const children = await sportsChallengeRepository.getChildrenForChallengeGroup(challengeId);
  const allowedChildIds = new Set(children.map((child) => Number(child.id)));

  for (const result of payload.results) {
    if (!allowedChildIds.has(result.childId)) {
      throw new AppError(400, 'Child is not assigned to this group during the challenge period');
    }
  }

  return withTransaction(async (client) => {
    const resultDirection = challenge.definition_result_direction || 'higher_is_better';
    const savedResults = [];

    for (const result of payload.results) {
      const calculated = calculateIndividualResult({
        baselineValue: result.baselineValue ?? null,
        finalValue: result.finalValue ?? null,
        targetReductionPercent: Number(challenge.target_reduction_percent),
        resultDirection,
      });

      await sportsChallengeRepository.upsertChallengeResult(
        {
          challengeId,
          childId: result.childId,
          baselineValue: calculated.baselineValue,
          finalValue: calculated.finalValue,
          individualTargetValue: calculated.individualTargetValue,
          individualTargetReached: calculated.individualTargetReached,
          repeatedOrImprovedBaseline: calculated.repeatedOrImprovedBaseline,
          differenceFromBaseline: calculated.differenceFromBaseline,
          differenceFromTarget: calculated.differenceFromTarget,
          notes: result.notes,
          measuredBy: context.actor.id,
        },
        client
      );

      savedResults.push({
        childId: result.childId,
        baselineValue: calculated.baselineValue,
        finalValue: calculated.finalValue,
        individualTargetValue: calculated.individualTargetValue,
        individualTargetReached: calculated.individualTargetReached,
        repeatedOrImprovedBaseline: calculated.repeatedOrImprovedBaseline,
        differenceFromBaseline: calculated.differenceFromBaseline,
        differenceFromTarget: calculated.differenceFromTarget,
      });
    }

    const allResults = await sportsChallengeRepository.getResultsForChallenge(challengeId, client);

    const calculatedSummary = calculateSportsChallengeSummary({
      results: normalizeResultsForCalculation(allResults),
      targetReductionPercent: Number(challenge.target_reduction_percent),
      failSafeThresholdPercent: Number(challenge.fail_safe_threshold_percent),
      resultDirection,
    });

    const persistedSummary = await sportsChallengeRepository.upsertChallengeSummary(
      {
        challengeId,
        ...toSummaryPayload(calculatedSummary),
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'sports_challenge',
        entityId: Number(challenge.id),
        action: 'sports.results_saved',
        metadata: {
          challengeId: Number(challenge.id),
          groupId: Number(challenge.group_id),
          savedCount: savedResults.length,
          participantsCount: calculatedSummary.participantsCount,
          finalResultsCount: calculatedSummary.finalResultsCount,
          finalStatus: calculatedSummary.finalStatus,
          groupTargetReached: calculatedSummary.groupTargetReached,
          failSafeReached: calculatedSummary.failSafeReached,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return {
      savedCount: savedResults.length,
      results: savedResults.map(mapSavedResultResponse),
      summary: toSummaryResponse(persistedSummary),
    };
  });
}

async function recalculateChallengeSummary(challengeId, context) {
  const challenge = await sportsChallengeRepository.findChallengeByIdWithDetails(challengeId);

  if (!challenge) {
    throw new AppError(404, 'Sports challenge not found');
  }

  await ensureCanEditChallenge(context.actor, challenge);

  return withTransaction(async (client) => {
    const rows = await sportsChallengeRepository.getResultsForChallenge(challengeId, client);
    const resultDirection = challenge.definition_result_direction || 'higher_is_better';

    const calculatedSummary = calculateSportsChallengeSummary({
      results: normalizeResultsForCalculation(rows),
      targetReductionPercent: Number(challenge.target_reduction_percent),
      failSafeThresholdPercent: Number(challenge.fail_safe_threshold_percent),
      resultDirection,
    });

    for (const result of calculatedSummary.results) {
      await sportsChallengeRepository.updateChallengeResultCalculatedFields(
        {
          challengeId,
          childId: result.childId,
          individualTargetValue: result.individualTargetValue,
          individualTargetReached: result.individualTargetReached,
          repeatedOrImprovedBaseline: result.repeatedOrImprovedBaseline,
          differenceFromBaseline: result.differenceFromBaseline,
          differenceFromTarget: result.differenceFromTarget,
        },
        client
      );
    }

    const persistedSummary = await sportsChallengeRepository.upsertChallengeSummary(
      {
        challengeId,
        ...toSummaryPayload(calculatedSummary),
      },
      client
    );

    await auditLogRepository.createAuditLog(
      {
        actorUserId: context.actor.id,
        entityType: 'sports_challenge',
        entityId: Number(challenge.id),
        action: 'sports.challenge_recalculated',
        metadata: {
          challengeId: Number(challenge.id),
          groupId: Number(challenge.group_id),
          participantsCount: calculatedSummary.participantsCount,
          finalResultsCount: calculatedSummary.finalResultsCount,
          finalStatus: calculatedSummary.finalStatus,
          groupTargetReached: calculatedSummary.groupTargetReached,
          failSafeReached: calculatedSummary.failSafeReached,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return {
      message: 'Sports challenge summary recalculated successfully',
      summary: toSummaryResponse(persistedSummary),
    };
  });
}

module.exports = {
  listDefinitions,
  createDefinition,
  updateDefinition,
  updateDefinitionStatus,
  listGroupChallenges,
  createGroupChallenge,
  getChallengeById,
  updateChallenge,
  updateChallengeStatus,
  saveChallengeResults,
  recalculateChallengeSummary,
  ensureCanViewGroupSports,
  ensureCanEditGroupSports,
  ensureCanViewChallenge,
  ensureCanEditChallenge,
};
