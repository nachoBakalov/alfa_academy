import apiClient from '../../services/apiClient';

function normalizeUser(rawUser = {}) {
  return {
    id: Number(rawUser.id),
    email: rawUser.email || '',
    firstName: rawUser.firstName || rawUser.first_name || '',
    lastName: rawUser.lastName || rawUser.last_name || '',
    role: rawUser.role || rawUser.role_code || '',
  };
}

async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', {
    email,
    password,
  });

  return {
    token: data.token,
    user: normalizeUser(data.user),
  };
}

async function getMe() {
  const { data } = await apiClient.get('/auth/me');
  return normalizeUser(data.user);
}

export default {
  login,
  getMe,
};
