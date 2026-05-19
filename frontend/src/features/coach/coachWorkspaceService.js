import apiClient from '../../services/apiClient';

function sanitizeParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );
}

function normalizeGroup(group = {}) {
  return {
    id: Number(group.id),
    name: group.name || '',
    isPrimary: Boolean(group.isPrimary),
    isActive: Boolean(group.isActive),
    season: group.season
      ? {
          id: Number(group.season.id),
          name: group.season.name || '',
        }
      : null,
    childrenCount: Number(group.childrenCount || 0),
    pendingQuestionnairesCount: Number(group.pendingQuestionnairesCount || 0),
    latestSocial: group.latestSocial
      ? {
          date: group.latestSocial.date || null,
          dailySocialResult: Number(group.latestSocial.dailySocialResult || 0),
          externalDailyMaximum: Number(group.latestSocial.externalDailyMaximum || 0),
        }
      : null,
    weeklySocial: group.weeklySocial
      ? {
          weekStartDate: group.weeklySocial.weekStartDate || null,
          weeklyAlphaBalls: Number(group.weeklySocial.weeklyAlphaBalls || 0),
          weeklyStatus: group.weeklySocial.weeklyStatus || null,
        }
      : null,
    activeSportsChallengesCount: Number(group.activeSportsChallengesCount || 0),
  };
}

function normalizeAcademy(academy = {}) {
  return {
    id: Number(academy.id),
    name: academy.name || '',
    groups: (academy.groups || []).map(normalizeGroup),
  };
}

function normalizeAcademyOption(academy = {}) {
  return {
    id: Number(academy.id),
    name: academy.name || '',
  };
}

function normalizeQuestionnaire(questionnaire = {}) {
  return {
    status: questionnaire.status || null,
  };
}

function normalizeSeasonOption(season = {}) {
  return {
    id: Number(season.id),
    name: season.name || '',
    startsOn: season.startsOn || null,
    endsOn: season.endsOn || null,
    isActive: Boolean(season.isActive),
    academy: season.academy
      ? {
          id: Number(season.academy.id),
          name: season.academy.name || '',
        }
      : null,
  };
}

function normalizeAcademyChild(child = {}) {
  return {
    id: Number(child.id),
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    isActive: Boolean(child.isActive),
    currentGroup: child.currentGroup
      ? {
          id: Number(child.currentGroup.id),
          name: child.currentGroup.name || '',
        }
      : null,
    academy: child.academy
      ? {
          id: Number(child.academy.id),
          name: child.academy.name || '',
        }
      : null,
    questionnaire: normalizeQuestionnaire(child.questionnaire || {}),
  };
}

function normalizeComfortOverviewColumn(column = {}) {
  return {
    actionCode: column.actionCode || '',
    label: column.label || '',
    type: column.type === 'text' ? 'text' : 'score',
  };
}

function normalizeComfortOverviewValue(value = {}) {
  if (value.type === 'text') {
    return {
      type: 'text',
      textValue: value.textValue || null,
    };
  }

  return {
    type: 'score',
    scoreValue:
      value.scoreValue === null || value.scoreValue === undefined ? null : Number(value.scoreValue),
    zone: value.zone || null,
    interpretation: value.interpretation || null,
    note: value.note || null,
  };
}

function normalizeComfortOverviewChild(child = {}) {
  const values = Object.fromEntries(
    Object.entries(child.values || {}).map(([actionCode, value]) => [
      actionCode,
      normalizeComfortOverviewValue(value || {}),
    ])
  );

  return {
    id: Number(child.id),
    firstName: child.firstName || '',
    lastName: child.lastName || '',
    isActive: Boolean(child.isActive),
    comfortProfile: {
      hasProfile: Boolean(child.comfortProfile?.hasProfile),
      completedAt: child.comfortProfile?.completedAt || null,
    },
    values,
  };
}

async function getMyGroups(params = {}) {
  const { data } = await apiClient.get('/coach-workspace/my-groups', {
    params: sanitizeParams(params),
  });

  return {
    coach: data.coach
      ? {
          id: Number(data.coach.id),
          firstName: data.coach.firstName || '',
          lastName: data.coach.lastName || '',
          email: data.coach.email || '',
        }
      : null,
    selectedAcademy: data.selectedAcademy ? normalizeAcademyOption(data.selectedAcademy) : null,
    availableAcademies: (data.availableAcademies || []).map(normalizeAcademyOption),
    selectedSeason: data.selectedSeason ? normalizeSeasonOption(data.selectedSeason) : null,
    availableSeasons: (data.availableSeasons || []).map(normalizeSeasonOption),
    academies: (data.academies || []).map(normalizeAcademy),
  };
}

async function getAcademyChildren(params = {}) {
  const { data } = await apiClient.get('/coach-workspace/academy-children', {
    params: sanitizeParams(params),
  });

  return {
    selectedAcademy: data.selectedAcademy ? normalizeAcademyOption(data.selectedAcademy) : null,
    availableAcademies: (data.availableAcademies || []).map(normalizeAcademyOption),
    selectedSeason: data.selectedSeason ? normalizeSeasonOption(data.selectedSeason) : null,
    availableSeasons: (data.availableSeasons || []).map(normalizeSeasonOption),
    children: (data.children || []).map(normalizeAcademyChild),
    pagination: data.pagination || { limit: 50, offset: 0, total: 0 },
  };
}

async function getGroupComfortZoneOverview(groupId, params = {}) {
  const { data } = await apiClient.get(`/coach-workspace/groups/${groupId}/comfort-zone-overview`, {
    params: sanitizeParams(params),
  });

  return {
    group: data.group
      ? {
          id: Number(data.group.id),
          name: data.group.name || '',
          academy: data.group.academy
            ? {
                id: Number(data.group.academy.id),
                name: data.group.academy.name || '',
              }
            : null,
        }
      : null,
    category: data.category
      ? {
          key: data.category.key || 'creativity',
          label: data.category.label || 'Креативност',
          columns: (data.category.columns || []).map(normalizeComfortOverviewColumn),
        }
      : {
          key: 'creativity',
          label: 'Креативност',
          columns: [],
        },
    children: (data.children || []).map(normalizeComfortOverviewChild),
  };
}

export default {
  getMyGroups,
  getAcademyChildren,
  getGroupComfortZoneOverview,
};
