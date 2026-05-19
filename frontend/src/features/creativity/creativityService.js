import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
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

function normalizeGroupResult(groupResult = null) {
  if (!groupResult) {
    return null;
  }

  return {
    groupId: Number(groupResult.groupId),
    alphaBalls:
      groupResult.alphaBalls === null || groupResult.alphaBalls === undefined
        ? null
        : Number(groupResult.alphaBalls),
    targetStatus: groupResult.targetStatus || 'pending',
    resultNote: groupResult.resultNote || '',
    evaluatedAt: groupResult.evaluatedAt || null,
  };
}

function normalizeResultsSummary(summary = {}) {
  return {
    groupsCount: Number(summary.groupsCount || 0),
    completedGroupsCount: Number(summary.completedGroupsCount || 0),
    averageAlphaBalls: Number(summary.averageAlphaBalls || 0),
    targetReachedGroupsCount: Number(summary.targetReachedGroupsCount || 0),
    targetNotReachedGroupsCount: Number(summary.targetNotReachedGroupsCount || 0),
  };
}

function normalizeChallenge(challenge = {}) {
  return {
    id: Number(challenge.id),
    academyId: Number(challenge.academyId),
    academy: challenge.academy
      ? {
          id: Number(challenge.academy.id),
          name: challenge.academy.name || '',
        }
      : null,
    title: challenge.title || '',
    activityType: challenge.activityType || '',
    description: challenge.description || '',
    startsOn: challenge.startsOn || null,
    endsOn: challenge.endsOn || null,
    status: challenge.status || 'draft',
    groupResult: normalizeGroupResult(challenge.groupResult),
    resultsSummary: normalizeResultsSummary(challenge.resultsSummary || {}),
  };
}

function normalizeChallengeDetails(challenge = {}) {
  return {
    ...normalizeChallenge(challenge),
    groupResults: (challenge.groupResults || []).map(normalizeGroupResult),
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

async function listChallenges(params = {}) {
  const { data } = await apiClient.get('/creativity/challenges', {
    params: sanitizeParams(params),
  });

  return {
    challenges: (data.challenges || []).map(normalizeChallenge),
    pagination: data.pagination || { limit: 20, offset: 0, total: 0 },
  };
}

async function createChallenge(payload) {
  const { data } = await apiClient.post('/creativity/challenges', payload);
  return normalizeChallenge(data.challenge);
}

async function getChallenge(challengeId) {
  const { data } = await apiClient.get(`/creativity/challenges/${challengeId}`);
  return normalizeChallengeDetails(data.challenge);
}

async function updateChallenge(challengeId, payload) {
  const { data } = await apiClient.patch(`/creativity/challenges/${challengeId}`, payload);
  return normalizeChallenge(data.challenge);
}

async function saveGroupResult(challengeId, groupId, payload) {
  const { data } = await apiClient.put(
    `/creativity/challenges/${challengeId}/groups/${groupId}/result`,
    payload
  );

  return normalizeGroupResult(data.result);
}

async function updateChallengeStatus(challengeId, status) {
  const { data } = await apiClient.patch(`/creativity/challenges/${challengeId}/status`, { status });
  return normalizeChallenge(data.challenge);
}

export default {
  listGroups,
  listChallenges,
  createChallenge,
  getChallenge,
  updateChallenge,
  saveGroupResult,
  updateChallengeStatus,
};
