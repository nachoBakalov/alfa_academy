import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeDefinitionPercentValue(value) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return value;
  }

  return numeric > 1 ? numeric / 100 : numeric;
}

function normalizeDefinitionPayload(payload = {}, { includeCode = true } = {}) {
  // Preserve Unicode for human-facing fields; only code is normalized as machine slug.
  const nextPayload = {
    ...(includeCode && payload.code !== undefined ? { code: String(payload.code).trim().toLowerCase() } : {}),
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.unit !== undefined ? { unit: payload.unit } : {}),
    ...(payload.resultDirection !== undefined ? { resultDirection: payload.resultDirection } : {}),
    ...(payload.defaultTargetReductionPercent !== undefined
      ? {
          defaultTargetReductionPercent: normalizeDefinitionPercentValue(
            payload.defaultTargetReductionPercent
          ),
        }
      : {}),
    ...(payload.defaultFailSafeThresholdPercent !== undefined
      ? {
          defaultFailSafeThresholdPercent: normalizeDefinitionPercentValue(
            payload.defaultFailSafeThresholdPercent
          ),
        }
      : {}),
  };

  return nextPayload;
}

function normalizeGroup(group = {}) {
  return {
    id: Number(group.id),
    name: group.name || '',
    isActive: Boolean(group.isActive),
    season: group.season
      ? {
          id: Number(group.season.id),
          name: group.season.name || '',
        }
      : null,
    academy: group.academy
      ? {
          id: Number(group.academy.id),
          name: group.academy.name || '',
        }
      : null,
  };
}

function normalizeDefinition(definition = {}) {
  return {
    id: Number(definition.id),
    code: definition.code || '',
    name: definition.name || '',
    description: definition.description || '',
    unit: definition.unit || '',
    resultDirection: definition.resultDirection || '',
    targetType: definition.targetType || '',
    defaultTargetReductionPercent: Number(definition.defaultTargetReductionPercent || 0),
    defaultFailSafeThresholdPercent: Number(definition.defaultFailSafeThresholdPercent || 0),
    isActive: Boolean(definition.isActive),
  };
}

function normalizeChallengeListItem(challenge = {}) {
  return {
    id: Number(challenge.id),
    definition: challenge.definition
      ? {
          id: Number(challenge.definition.id),
          code: challenge.definition.code || '',
          name: challenge.definition.name || '',
        }
      : null,
    group: challenge.group
      ? {
          id: Number(challenge.group.id),
          name: challenge.group.name || '',
        }
      : null,
    title: challenge.title || '',
    startsOn: challenge.startsOn || null,
    endsOn: challenge.endsOn || null,
    status: challenge.status || 'draft',
    unit: challenge.unit || '',
    targetReductionPercent: Number(challenge.targetReductionPercent || 0),
    failSafeThresholdPercent: Number(challenge.failSafeThresholdPercent || 0),
    summary: {
      participantsCount: Number(challenge.summary?.participantsCount || 0),
      finalResultsCount: Number(challenge.summary?.finalResultsCount || 0),
      groupTargetReached: Boolean(challenge.summary?.groupTargetReached),
      failSafeReached: Boolean(challenge.summary?.failSafeReached),
      finalStatus: challenge.summary?.finalStatus || 'not_passed',
    },
  };
}

function normalizeChallengeSummary(summary = {}) {
  return {
    participantsCount: Number(summary.participantsCount || 0),
    finalResultsCount: Number(summary.finalResultsCount || 0),
    baselineTotal: Number(summary.baselineTotal || 0),
    groupTargetTotal: Number(summary.groupTargetTotal || 0),
    finalTotal: Number(summary.finalTotal || 0),
    groupTargetReached: Boolean(summary.groupTargetReached),
    repeatedOrImprovedCount: Number(summary.repeatedOrImprovedCount || 0),
    repeatedOrImprovedPercentage: Number(summary.repeatedOrImprovedPercentage || 0),
    failSafeReached: Boolean(summary.failSafeReached),
    finalStatus: summary.finalStatus || 'not_passed',
    calculatedAt: summary.calculatedAt || null,
  };
}

function normalizeChallengeResult(result = {}) {
  return {
    child: result.child
      ? {
          id: Number(result.child.id),
          firstName: result.child.firstName || '',
          lastName: result.child.lastName || '',
        }
      : null,
    baselineValue: result.baselineValue !== null && result.baselineValue !== undefined
      ? Number(result.baselineValue)
      : null,
    finalValue:
      result.finalValue !== null && result.finalValue !== undefined ? Number(result.finalValue) : null,
    individualTargetValue:
      result.individualTargetValue !== null && result.individualTargetValue !== undefined
        ? Number(result.individualTargetValue)
        : null,
    individualTargetReached:
      result.individualTargetReached === null || result.individualTargetReached === undefined
        ? null
        : Boolean(result.individualTargetReached),
    repeatedOrImprovedBaseline:
      result.repeatedOrImprovedBaseline === null || result.repeatedOrImprovedBaseline === undefined
        ? null
        : Boolean(result.repeatedOrImprovedBaseline),
    differenceFromBaseline:
      result.differenceFromBaseline !== null && result.differenceFromBaseline !== undefined
        ? Number(result.differenceFromBaseline)
        : null,
    differenceFromTarget:
      result.differenceFromTarget !== null && result.differenceFromTarget !== undefined
        ? Number(result.differenceFromTarget)
        : null,
    notes: result.notes || '',
  };
}

function normalizeChallengeDetails(challenge = {}) {
  return {
    id: Number(challenge.id),
    definition: challenge.definition
      ? {
          id: Number(challenge.definition.id),
          code: challenge.definition.code || '',
          name: challenge.definition.name || '',
          description: challenge.definition.description || '',
          resultDirection: challenge.definition.resultDirection || '',
          targetType: challenge.definition.targetType || '',
        }
      : null,
    group: challenge.group
      ? {
          id: Number(challenge.group.id),
          name: challenge.group.name || '',
          season: challenge.group.season
            ? {
                id: Number(challenge.group.season.id),
                name: challenge.group.season.name || '',
              }
            : null,
          academy: challenge.group.academy
            ? {
                id: Number(challenge.group.academy.id),
                name: challenge.group.academy.name || '',
              }
            : null,
        }
      : null,
    title: challenge.title || '',
    description: challenge.description || '',
    startsOn: challenge.startsOn || null,
    endsOn: challenge.endsOn || null,
    status: challenge.status || 'draft',
    unit: challenge.unit || '',
    targetReductionPercent: Number(challenge.targetReductionPercent || 0),
    failSafeThresholdPercent: Number(challenge.failSafeThresholdPercent || 0),
    results: (challenge.results || []).map(normalizeChallengeResult),
    summary: normalizeChallengeSummary(challenge.summary || {}),
  };
}

async function listGroups(params = {}) {
  const mergedParams = {
    isActive: true,
    limit: 100,
    offset: 0,
    ...params,
  };

  const { data } = await apiClient.get('/groups', {
    params: sanitizeParams(mergedParams),
  });

  return {
    groups: (data.groups || []).map(normalizeGroup),
    pagination: data.pagination || { limit: 100, offset: 0, total: 0 },
  };
}

async function listDefinitions(params = {}) {
  const { data } = await apiClient.get('/sports/definitions', {
    params: sanitizeParams(params),
  });

  return {
    definitions: (data.definitions || []).map(normalizeDefinition),
  };
}

async function createDefinition(payload) {
  const { data } = await apiClient.post(
    '/sports/definitions',
    normalizeDefinitionPayload(payload, { includeCode: true })
  );

  return normalizeDefinition(data.definition);
}

async function updateDefinition(definitionId, payload) {
  const { data } = await apiClient.patch(
    `/sports/definitions/${definitionId}`,
    normalizeDefinitionPayload(payload, { includeCode: false })
  );

  return normalizeDefinition(data.definition);
}

async function updateDefinitionStatus(definitionId, isActive) {
  const { data } = await apiClient.patch(`/sports/definitions/${definitionId}/status`, {
    isActive: Boolean(isActive),
  });

  return normalizeDefinition(data.definition);
}

async function listGroupChallenges(groupId, params = {}) {
  const mergedParams = {
    limit: 50,
    offset: 0,
    ...params,
  };

  const { data } = await apiClient.get(`/sports/groups/${groupId}/challenges`, {
    params: sanitizeParams(mergedParams),
  });

  return {
    challenges: (data.challenges || []).map(normalizeChallengeListItem),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function createGroupChallenge(groupId, payload) {
  const { data } = await apiClient.post(`/sports/groups/${groupId}/challenges`, payload);
  return normalizeChallengeDetails(data.challenge);
}

async function getChallenge(challengeId) {
  const { data } = await apiClient.get(`/sports/challenges/${challengeId}`);
  return normalizeChallengeDetails(data.challenge);
}

async function updateChallenge(challengeId, payload) {
  const { data } = await apiClient.patch(`/sports/challenges/${challengeId}`, payload);
  return normalizeChallengeDetails(data.challenge);
}

async function updateChallengeStatus(challengeId, status) {
  const { data } = await apiClient.patch(`/sports/challenges/${challengeId}/status`, {
    status,
  });

  return normalizeChallengeDetails(data.challenge);
}

async function saveChallengeResults(challengeId, payload) {
  const { data } = await apiClient.put(`/sports/challenges/${challengeId}/results`, payload);

  return {
    savedCount: Number(data.savedCount || 0),
    results: (data.results || []).map((result) => ({
      childId: Number(result.childId),
      baselineValue:
        result.baselineValue !== null && result.baselineValue !== undefined
          ? Number(result.baselineValue)
          : null,
      finalValue:
        result.finalValue !== null && result.finalValue !== undefined
          ? Number(result.finalValue)
          : null,
    })),
    summary: normalizeChallengeSummary(data.summary || {}),
  };
}

async function recalculateChallenge(challengeId) {
  const { data } = await apiClient.post(`/sports/challenges/${challengeId}/recalculate`);

  return {
    message: data.message || 'Sports challenge summary recalculated successfully',
    summary: normalizeChallengeSummary(data.summary || {}),
  };
}

export default {
  listGroups,
  listDefinitions,
  createDefinition,
  updateDefinition,
  updateDefinitionStatus,
  listGroupChallenges,
  createGroupChallenge,
  getChallenge,
  updateChallenge,
  updateChallengeStatus,
  saveChallengeResults,
  recalculateChallenge,
};
