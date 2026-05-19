import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeCoach(coach = {}) {
  return {
    id: Number(coach.id || coach.coachId),
    email: coach.email || '',
    firstName: coach.firstName || '',
    lastName: coach.lastName || '',
    phone: coach.phone || '',
    isPrimary: Boolean(coach.isPrimary),
    assignedAt: coach.assignedAt || null,
    unassignedAt: coach.unassignedAt || null,
  };
}

function normalizeCoachDirectoryItem(coach = {}) {
  return {
    id: Number(coach.id),
    email: coach.email || '',
    firstName: coach.firstName || '',
    lastName: coach.lastName || '',
    phone: coach.phone || '',
    isActive: Boolean(coach.isActive),
  };
}

function normalizeGroup(group = {}) {
  return {
    id: Number(group.id),
    seasonId: Number(group.season?.id || group.seasonId),
    name: group.name || '',
    description: group.description || '',
    ageMin: group.ageMin,
    ageMax: group.ageMax,
    capacity: group.capacity,
    isActive: Boolean(group.isActive),
    createdAt: group.createdAt || null,
    updatedAt: group.updatedAt || null,
    academy: group.academy
      ? {
          id: Number(group.academy.id),
          name: group.academy.name,
        }
      : null,
    season: group.season
      ? {
          id: Number(group.season.id),
          name: group.season.name,
        }
      : null,
    coaches: (group.coaches || []).map(normalizeCoach),
  };
}

async function listGroups(params) {
  const { data } = await apiClient.get('/groups', {
    params: sanitizeParams(params),
  });

  return {
    groups: (data.groups || []).map(normalizeGroup),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function getGroupById(id) {
  const { data } = await apiClient.get(`/groups/${id}`);
  return normalizeGroup(data.group);
}

async function createGroup(payload) {
  const { data } = await apiClient.post('/groups', payload);
  return normalizeGroup(data.group);
}

async function updateGroup(id, payload) {
  const { data } = await apiClient.patch(`/groups/${id}`, payload);
  return normalizeGroup(data.group);
}

async function updateGroupStatus(id, isActive) {
  const { data } = await apiClient.patch(`/groups/${id}/status`, {
    isActive,
  });

  return normalizeGroup(data.group);
}

async function listGroupCoaches(groupId) {
  const { data } = await apiClient.get(`/groups/${groupId}/coaches`);
  return (data.coaches || []).map(normalizeCoach);
}

async function listCoachDirectory(params) {
  const { data } = await apiClient.get('/groups/coaches/directory', {
    params: sanitizeParams(params),
  });

  return {
    coaches: (data.coaches || []).map(normalizeCoachDirectoryItem),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function assignCoach(groupId, payload) {
  const { data } = await apiClient.post(`/groups/${groupId}/coaches`, payload);
  return normalizeCoach(data.assignment);
}

async function updateCoachAssignment(groupId, coachId, payload) {
  const { data } = await apiClient.patch(`/groups/${groupId}/coaches/${coachId}`, payload);
  return normalizeCoach(data.assignment);
}

async function unassignCoach(groupId, coachId) {
  const { data } = await apiClient.delete(`/groups/${groupId}/coaches/${coachId}`);
  return {
    message: data.message || 'Треньорът е премахнат от групата.',
  };
}

async function importChildren(groupId, payload) {
  const { data } = await apiClient.post(`/groups/${groupId}/import-children`, payload);

  return {
    groupId: Number(data.groupId || groupId),
    academyId: data.academyId !== undefined ? Number(data.academyId) : null,
    importedCount: Number(data.importedCount || 0),
    skippedCount: Number(data.skippedCount || 0),
  };
}

export default {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  updateGroupStatus,
  listCoachDirectory,
  listGroupCoaches,
  assignCoach,
  updateCoachAssignment,
  unassignCoach,
  importChildren,
};
