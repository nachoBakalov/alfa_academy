import apiClient from '../../services/apiClient';

function normalizeAcademy(academy = {}) {
  return {
    id: Number(academy.id),
    name: academy.name || '',
    assignedAt: academy.assignedAt || null,
  };
}

function normalizeAcademyCoach(coach = {}) {
  return {
    id: Number(coach.id),
    firstName: coach.firstName || '',
    lastName: coach.lastName || '',
    email: coach.email || '',
    assignedAt: coach.assignedAt || null,
  };
}

function normalizeAssignment(assignment = {}) {
  return {
    coachId: Number(assignment.coachId),
    academyId: Number(assignment.academyId),
    assignedAt: assignment.assignedAt || null,
  };
}

async function listCoachAcademies(coachId) {
  const { data } = await apiClient.get(`/coach-academies/coaches/${coachId}`);
  return {
    academies: (data.academies || []).map(normalizeAcademy),
  };
}

async function listAcademyCoaches(academyId) {
  const { data } = await apiClient.get(`/coach-academies/academies/${academyId}/coaches`);
  return {
    coaches: (data.coaches || []).map(normalizeAcademyCoach),
  };
}

async function assignCoachToAcademy(payload) {
  const { data } = await apiClient.post('/coach-academies', payload);
  return {
    assignment: normalizeAssignment(data.assignment || {}),
  };
}

async function unassignCoachFromAcademy(academyId, coachId) {
  const { data } = await apiClient.delete(`/coach-academies/${academyId}/coaches/${coachId}`);
  return {
    assignment: normalizeAssignment(data.assignment || {}),
  };
}

export default {
  listCoachAcademies,
  listAcademyCoaches,
  assignCoachToAcademy,
  unassignCoachFromAcademy,
};
