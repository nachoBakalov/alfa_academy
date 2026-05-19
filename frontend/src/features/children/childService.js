import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

function normalizeQuestionnaireDelivery(delivery = null) {
  if (!delivery) {
    return null;
  }

  return {
    channel: delivery.channel || 'email',
    status: delivery.status || null,
    recipient: delivery.recipient || null,
    sentAt: delivery.sentAt || null,
    createdAt: delivery.createdAt || null,
  };
}

function normalizeQuestionnaire(questionnaire = null) {
  if (!questionnaire) {
    return {
      status: null,
      expiresAt: null,
      submittedAt: null,
      link: null,
      latestEmailDelivery: null,
    };
  }

  const expiresAt = questionnaire.expiresAt || null;
  const rawStatus = questionnaire.status || null;
  const isExpiredPending =
    rawStatus === 'pending' && expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  return {
    status: isExpiredPending ? 'expired' : rawStatus,
    expiresAt,
    submittedAt: questionnaire.submittedAt || null,
    link: isExpiredPending ? null : questionnaire.link || null,
    latestEmailDelivery: normalizeQuestionnaireDelivery(questionnaire.latestEmailDelivery),
  };
}

function normalizeChild(child = {}) {
  const resolvedSeason = child.currentGroup?.season || child.currentSeason || null;
  const resolvedAcademy = child.currentGroup?.academy || child.currentAcademy || null;

  return {
    id: Number(child.id),
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    birthDate: child.birthDate || null,
    gender: child.gender || null,
    parentName: child.parentName || '',
    parentEmail: child.parentEmail || '',
    parentPhone: child.parentPhone || '',
    medicalNotes: child.medicalNotes || '',
    generalNotes: child.generalNotes || '',
    isActive: Boolean(child.isActive),
    currentGroup: child.currentGroup
      ? {
          id: Number(child.currentGroup.id),
          name: child.currentGroup.name || '',
          season: resolvedSeason
            ? {
                id: Number(resolvedSeason.id),
                name: resolvedSeason.name || '',
              }
            : null,
          academy: resolvedAcademy
            ? {
                id: Number(resolvedAcademy.id),
                name: resolvedAcademy.name || '',
              }
            : null,
        }
      : null,
    currentSeason: resolvedSeason
      ? {
          id: Number(resolvedSeason.id),
          name: resolvedSeason.name || '',
        }
      : null,
    currentAcademy: resolvedAcademy
      ? {
          id: Number(resolvedAcademy.id),
          name: resolvedAcademy.name || '',
        }
      : null,
    questionnaire: normalizeQuestionnaire(child.questionnaire),
    createdAt: child.createdAt || null,
    updatedAt: child.updatedAt || null,
  };
}

function normalizeComfortSummary(summary = {}) {
  return {
    greenCount: Number(summary.greenCount || 0),
    yellowCount: Number(summary.yellowCount || 0),
    redCount: Number(summary.redCount || 0),
    behaviorIndicatorCount: Number(summary.behaviorIndicatorCount || 0),
    neutralCount: Number(summary.neutralCount || 0),
  };
}

function normalizeComfortSections(sections = []) {
  return sections.map((section) => ({
    code: section.code || '',
    name: section.name || '',
    subsections: (section.subsections || []).map((subsection) => ({
      code: subsection.code || '',
      name: subsection.name || '',
      scores: (subsection.scores || []).map((score) => ({
        actionCode: score.actionCode || '',
        label: score.label || '',
        scoreValue: score.scoreValue,
        zone: score.zone || 'neutral',
        interpretation: score.interpretation || '',
        note: score.note || '',
      })),
      textAnswers: (subsection.textAnswers || []).map((item) => ({
        questionCode: item.questionCode || '',
        label: item.label || '',
        textValue: item.textValue || '',
      })),
    })),
  }));
}

function normalizeComfortZone(comfortZone = {}) {
  return {
    hasProfile: Boolean(comfortZone.hasProfile),
    completedAt: comfortZone.completedAt || null,
    completedByType: comfortZone.completedByType || null,
    completedByName: comfortZone.completedByName || null,
    summary: normalizeComfortSummary(comfortZone.summary),
    sections: normalizeComfortSections(comfortZone.sections || []),
    textAnswers: (comfortZone.textAnswers || []).map((item) => ({
      questionCode: item.questionCode || '',
      label: item.label || '',
      textValue: item.textValue || '',
      sectionCode: item.sectionCode || null,
      sectionName: item.sectionName || null,
      subsectionCode: item.subsectionCode || null,
      subsectionName: item.subsectionName || null,
    })),
  };
}

function normalizeChildProfile(profile = {}) {
  return {
    child: normalizeChild(profile.child || {}),
    currentGroup: profile.currentGroup
      ? {
          id: Number(profile.currentGroup.id),
          name: profile.currentGroup.name || '',
          season: profile.currentGroup.season
            ? {
                id: Number(profile.currentGroup.season.id),
                name: profile.currentGroup.season.name || '',
              }
            : null,
          academy: profile.currentGroup.academy
            ? {
                id: Number(profile.currentGroup.academy.id),
                name: profile.currentGroup.academy.name || '',
              }
            : null,
        }
      : null,
    questionnaire: normalizeQuestionnaire(profile.questionnaire),
    comfortZone: normalizeComfortZone(profile.comfortZone || {}),
  };
}

async function listChildren(params) {
  const { data } = await apiClient.get('/children', {
    params: sanitizeParams(params),
  });

  return {
    children: (data.children || []).map(normalizeChild),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function getChild(id) {
  const { data } = await apiClient.get(`/children/${id}`);
  return normalizeChild(data.child);
}

async function getChildProfile(id) {
  const { data } = await apiClient.get(`/children/${id}/profile`);
  return normalizeChildProfile(data.profile);
}

async function createChild(payload) {
  const { data } = await apiClient.post('/children', payload);
  return normalizeChild(data.child);
}

async function updateChild(id, payload) {
  const { data } = await apiClient.patch(`/children/${id}`, payload);
  return normalizeChild(data.child);
}

async function updateChildStatus(id, isActive) {
  const { data } = await apiClient.patch(`/children/${id}/status`, {
    isActive,
  });

  return normalizeChild(data.child);
}

async function generateQuestionnaireToken(id, payload = { forceRegenerate: false }) {
  const { data } = await apiClient.post(`/children/${id}/questionnaire-token`, payload);
  return normalizeQuestionnaire(data.questionnaire);
}

async function sendQuestionnaireEmail(id, payload = { forceRegenerate: false }) {
  const { data } = await apiClient.post(`/children/${id}/questionnaire-token/send-email`, payload);

  return {
    questionnaire: normalizeQuestionnaire(data.questionnaire),
    delivery: normalizeQuestionnaireDelivery(data.delivery),
  };
}

async function assignChildToGroup(id, payload) {
  const { data } = await apiClient.post(`/children/${id}/group-assignment`, payload);
  return {
    assignment: {
      childId: Number(data.assignment?.childId),
      groupId: Number(data.assignment?.groupId),
      academyId:
        data.assignment?.academyId !== undefined && data.assignment?.academyId !== null
          ? Number(data.assignment.academyId)
          : null,
      seasonId:
        data.assignment?.seasonId !== undefined && data.assignment?.seasonId !== null
          ? Number(data.assignment.seasonId)
          : null,
      startsOn: data.assignment?.startsOn || null,
    },
  };
}

export default {
  listChildren,
  getChild,
  getChildProfile,
  createChild,
  updateChild,
  updateChildStatus,
  generateQuestionnaireToken,
  sendQuestionnaireEmail,
  assignChildToGroup,
};
