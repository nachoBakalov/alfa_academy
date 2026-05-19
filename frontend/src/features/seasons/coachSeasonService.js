import apiClient from '../../services/apiClient';

function normalizeCoach(coach = {}) {
  return {
    id: Number(coach.id),
    firstName: coach.firstName || '',
    lastName: coach.lastName || '',
    email: coach.email || '',
    assignedAt: coach.assignedAt || null,
  };
}

async function listSeasonCoaches(seasonId) {
  const { data } = await apiClient.get(`/coach-seasons/seasons/${seasonId}/coaches`);
  return {
    coaches: (data.coaches || []).map(normalizeCoach),
  };
}

async function assignCoachToSeason(payload) {
  const { data } = await apiClient.post('/coach-seasons', payload);
  return {
    assignment: data.assignment
      ? {
          coachId: Number(data.assignment.coachId),
          seasonId: Number(data.assignment.seasonId),
          assignedAt: data.assignment.assignedAt || null,
        }
      : null,
  };
}

async function unassignCoachFromSeason(seasonId, coachId) {
  const { data } = await apiClient.delete(`/coach-seasons/${seasonId}/coaches/${coachId}`);
  return {
    assignment: data.assignment
      ? {
          coachId: Number(data.assignment.coachId),
          seasonId: Number(data.assignment.seasonId),
          assignedAt: data.assignment.assignedAt || null,
        }
      : null,
  };
}

export default {
  listSeasonCoaches,
  assignCoachToSeason,
  unassignCoachFromSeason,
};
