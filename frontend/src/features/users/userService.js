import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeUser(user = {}) {
  return {
    id: Number(user.id),
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    role: user.role || '',
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

async function listUsers(params) {
  const { data } = await apiClient.get('/users', {
    params: sanitizeParams(params),
  });

  return {
    users: (data.users || []).map(normalizeUser),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function getUser(id) {
  const { data } = await apiClient.get(`/users/${id}`);
  return normalizeUser(data.user);
}

async function createUser(payload) {
  const { data } = await apiClient.post('/users', payload);
  return normalizeUser(data.user);
}

async function updateUser(id, payload) {
  const { data } = await apiClient.patch(`/users/${id}`, payload);
  return normalizeUser(data.user);
}

async function updateUserStatus(id, isActive) {
  const { data } = await apiClient.patch(`/users/${id}/status`, {
    isActive,
  });

  return normalizeUser(data.user);
}

async function resetUserPassword(id, newPassword) {
  const { data } = await apiClient.patch(`/users/${id}/password`, {
    newPassword,
  });

  return {
    message: data.message || 'Паролата е обновена успешно.',
  };
}

export default {
  listUsers,
  getUser,
  createUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
};
