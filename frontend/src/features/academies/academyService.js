import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeAcademy(academy = {}) {
  return {
    id: Number(academy.id),
    name: academy.name || '',
    description: academy.description || '',
    isActive: Boolean(academy.isActive),
    createdAt: academy.createdAt || null,
    updatedAt: academy.updatedAt || null,
  };
}

function normalizeAcademyChild(child = {}) {
  return {
    id: Number(child.id),
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    isActive: Boolean(child.isActive),
    group: child.group
      ? {
          id: Number(child.group.id),
          name: child.group.name || '',
        }
      : null,
    questionnaire: {
      status: child.questionnaire?.status || null,
    },
  };
}

async function listAcademies(params) {
  const { data } = await apiClient.get('/academies', {
    params: sanitizeParams(params),
  });

  return {
    academies: (data.academies || []).map(normalizeAcademy),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function createAcademy(payload) {
  const { data } = await apiClient.post('/academies', payload);
  return normalizeAcademy(data.academy);
}

async function updateAcademy(id, payload) {
  const { data } = await apiClient.patch(`/academies/${id}`, payload);
  return normalizeAcademy(data.academy);
}

async function updateAcademyStatus(id, isActive) {
  const { data } = await apiClient.patch(`/academies/${id}/status`, {
    isActive,
  });

  return normalizeAcademy(data.academy);
}

async function listAcademyChildren(id, params) {
  const { data } = await apiClient.get(`/academies/${id}/children`, {
    params: sanitizeParams(params),
  });

  return {
    children: (data.children || []).map(normalizeAcademyChild),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

export default {
  listAcademies,
  listAcademyChildren,
  createAcademy,
  updateAcademy,
  updateAcademyStatus,
};
