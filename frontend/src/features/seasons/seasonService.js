import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeSeason(season = {}) {
  return {
    id: Number(season.id),
    academyId: Number(season.academyId),
    name: season.name || '',
    startsOn: season.startsOn || '',
    endsOn: season.endsOn || '',
    isActive: Boolean(season.isActive),
    createdAt: season.createdAt || null,
    updatedAt: season.updatedAt || null,
    academy: season.academy
      ? {
          id: Number(season.academy.id),
          name: season.academy.name,
        }
      : null,
  };
}

function normalizeSeasonChild(child = {}) {
  return {
    id: Number(child.id),
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    birthDate: child.birthDate || null,
    gender: child.gender || null,
    parentName: child.parentName || '',
    parentEmail: child.parentEmail || '',
    parentPhone: child.parentPhone || '',
    isActive: Boolean(child.isActive),
    currentGroup: child.currentGroup
      ? {
          id: Number(child.currentGroup.id),
          name: child.currentGroup.name || '',
        }
      : null,
    questionnaire: child.questionnaire
      ? {
          status: child.questionnaire.status || null,
          expiresAt: child.questionnaire.expiresAt || null,
        }
      : null,
    createdAt: child.createdAt || null,
    updatedAt: child.updatedAt || null,
  };
}

async function listSeasons(params) {
  const { data } = await apiClient.get('/seasons', {
    params: sanitizeParams(params),
  });

  return {
    seasons: (data.seasons || []).map(normalizeSeason),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function createSeason(payload) {
  const { data } = await apiClient.post('/seasons', payload);
  return normalizeSeason(data.season);
}

async function updateSeason(id, payload) {
  const { data } = await apiClient.patch(`/seasons/${id}`, payload);
  return normalizeSeason(data.season);
}

async function updateSeasonStatus(id, isActive) {
  const { data } = await apiClient.patch(`/seasons/${id}/status`, {
    isActive,
  });

  return normalizeSeason(data.season);
}

async function listSeasonChildren(seasonId, params = {}) {
  const { data } = await apiClient.get(`/seasons/${seasonId}/children`, {
    params: sanitizeParams(params),
  });

  return {
    season: data.season ? normalizeSeason(data.season) : null,
    children: (data.children || []).map(normalizeSeasonChild),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

export default {
  listSeasons,
  createSeason,
  updateSeason,
  updateSeasonStatus,
  listSeasonChildren,
};
