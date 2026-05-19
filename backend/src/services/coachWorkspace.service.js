const AppError = require('../utils/AppError');
const coachWorkspaceRepository = require('../repositories/coachWorkspace.repository');
const groupRepository = require('../repositories/group.repository');

const COMFORT_OVERVIEW_CATEGORIES = {
  creativity: {
    label: 'Креативност',
    columns: [
      { actionCode: 'drawing_desire', label: 'Рисуване - желание', type: 'score' },
      { actionCode: 'drawing_skill', label: 'Рисуване - умение', type: 'score' },
      { actionCode: 'dancing_desire', label: 'Танци - желание', type: 'score' },
      { actionCode: 'dancing_skill', label: 'Танци - умение', type: 'score' },
    ],
  },
  life_and_technique: {
    label: 'Бит и техника',
    columns: [
      { actionCode: 'daily_life_skills', label: 'Битови умения', type: 'score' },
      { actionCode: 'tools_and_technique', label: 'Инструменти и техника', type: 'score' },
      { actionCode: 'diy', label: 'Направи си сам', type: 'score' },
    ],
  },
  sport: {
    label: 'Спорт',
    columns: [
      { actionCode: 'general_physical_activity', label: 'Физическа активност', type: 'score' },
      { actionCode: 'favorite_sport', label: 'Любим спорт', type: 'text' },
    ],
  },
  social_contact: {
    label: 'Социален контакт',
    columns: [
      { actionCode: 'temperament', label: 'Темперамент', type: 'score' },
      { actionCode: 'social_has_friends', label: 'Социални контакти', type: 'score' },
      { actionCode: 'joining_new_group', label: 'Включване в група', type: 'score' },
      { actionCode: 'stage_performance', label: 'Представяне пред хора', type: 'score' },
      { actionCode: 'emotional_sensitivity', label: 'Обидчивост', type: 'score' },
      { actionCode: 'rules_tendency', label: 'Спазване на правила', type: 'score' },
    ],
  },
  reading: {
    label: 'Четене',
    columns: [
      { actionCode: 'reading_level', label: 'Ниво на четене', type: 'score' },
      { actionCode: 'reading_desire', label: 'Желание за четене', type: 'score' },
    ],
  },
};

function ensureCanUseCoachWorkspace(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

function resolveTargetCoachId(actor, filters = {}) {
  if (actor.role === 'coach') {
    return Number(actor.id);
  }

  if (filters.coachId === undefined) {
    throw new AppError(400, 'coachId is required for this role');
  }

  return Number(filters.coachId);
}

async function ensureTargetCoach(targetCoachId) {
  const coach = await coachWorkspaceRepository.findCoachById(targetCoachId);

  if (!coach) {
    throw new AppError(404, 'Coach not found');
  }

  if (coach.role_code !== 'coach') {
    throw new AppError(400, 'Selected user must have coach role');
  }

  if (!coach.is_active) {
    throw new AppError(400, 'Selected coach must be active');
  }

  return coach;
}

function normalizeQuestionnaireStatus(status, expiresAt) {
  if (!status) {
    return null;
  }

  if (status === 'pending' && expiresAt) {
    const parsed = new Date(expiresAt);

    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now()) {
      return 'expired';
    }
  }

  return status;
}

function mapWorkspaceGroup(row) {
  return {
    id: Number(row.group_id),
    name: row.group_name,
    isPrimary: Boolean(row.is_primary),
    isActive: Boolean(row.group_is_active),
    season: {
      id: Number(row.season_id),
      name: row.season_name,
    },
    childrenCount: Number(row.children_count || 0),
    pendingQuestionnairesCount: Number(row.pending_questionnaires_count || 0),
    latestSocial: row.latest_social_date
      ? {
          date: row.latest_social_date,
          dailySocialResult: Number(row.latest_social_result || 0),
          externalDailyMaximum: Number(row.latest_social_maximum || 0),
        }
      : null,
    weeklySocial: row.week_start_date
      ? {
          weekStartDate: row.week_start_date,
          weeklyAlphaBalls: Number(row.weekly_alpha_balls || 0),
          weeklyStatus: row.weekly_status || null,
        }
      : null,
    activeSportsChallengesCount: Number(row.active_sports_challenges_count || 0),
  };
}

function mapAcademyOption(row) {
  return {
    id: Number(row.id),
    name: row.name,
    assignedAt: row.assigned_at || null,
  };
}

function resolveSelectedAcademy(availableAcademies, requestedAcademyId) {
  if (!Array.isArray(availableAcademies) || availableAcademies.length === 0) {
    if (requestedAcademyId !== undefined) {
      throw new AppError(403, 'Forbidden');
    }

    return null;
  }

  if (requestedAcademyId !== undefined) {
    const selected = availableAcademies.find(
      (academy) => Number(academy.id) === Number(requestedAcademyId)
    );

    if (!selected) {
      throw new AppError(403, 'Forbidden');
    }

    return selected;
  }

  const sorted = [...availableAcademies].sort((a, b) => {
    const dateA = a.assignedAt ? new Date(a.assignedAt).getTime() : 0;
    const dateB = b.assignedAt ? new Date(b.assignedAt).getTime() : 0;

    if (dateB !== dateA) {
      return dateB - dateA;
    }

    return Number(b.id) - Number(a.id);
  });

  return sorted.find(Boolean) || null;
}

function mapAvailableAcademy(academy) {
  return {
    id: Number(academy.id),
    name: academy.name,
  };
}

function buildSelectedAcademyPayload(academy) {
  if (!academy) {
    return null;
  }

  return {
    id: Number(academy.id),
    name: academy.name,
  };
}

function mapGroupRowsToSelectedAcademy(selectedAcademy, groupRows) {
  if (!selectedAcademy) {
    return [];
  }

  const groups = (groupRows || []).map(mapWorkspaceGroup).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return [
    {
      id: Number(selectedAcademy.id),
      name: selectedAcademy.name,
      groups,
    },
  ];
}

async function ensureCoachCanAccessGroup(actor, groupId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await groupRepository.coachCanAccessGroup(actor.id, groupId);

  if (!canAccess) {
    throw new AppError(403, 'Нямате достъп до тази група.');
  }
}

function normalizeScoreInterpretation(zone, rawInterpretation) {
  if (zone === 'green') {
    return 'Комфортна зона';
  }

  if (zone === 'yellow') {
    return 'Зона на развитие';
  }

  if (zone === 'red') {
    return 'Нужда от подкрепа';
  }

  if (zone === 'behavior_indicator' || zone === 'neutral') {
    return rawInterpretation || 'Поведенчески индикатор';
  }

  return rawInterpretation || null;
}

function mapComfortOverviewChildren(rows, category) {
  const childrenMap = new Map();

  for (const row of rows || []) {
    const childId = Number(row.child_id);

    if (!childrenMap.has(childId)) {
      const values = {};

      for (const column of category.columns) {
        if (column.type === 'text') {
          values[column.actionCode] = {
            type: 'text',
            textValue: null,
          };
        } else {
          values[column.actionCode] = {
            type: 'score',
            scoreValue: null,
            zone: null,
            interpretation: null,
            note: null,
          };
        }
      }

      childrenMap.set(childId, {
        id: childId,
        firstName: row.first_name,
        lastName: row.last_name,
        isActive: Boolean(row.is_active),
        comfortProfile: {
          hasProfile: Boolean(row.profile_id),
          completedAt: row.completed_at || null,
        },
        values,
      });
    }

    const child = childrenMap.get(childId);
    const actionCode = row.action_code;
    const column = category.columns.find((item) => item.actionCode === actionCode);

    if (!column || !child.values[actionCode]) {
      continue;
    }

    if (column.type === 'text') {
      child.values[actionCode] = {
        type: 'text',
        textValue: row.text_value || null,
      };
      continue;
    }

    child.values[actionCode] = {
      type: 'score',
      scoreValue: row.score_value === null || row.score_value === undefined ? null : Number(row.score_value),
      zone: row.zone || null,
      interpretation: normalizeScoreInterpretation(row.zone, row.interpretation),
      note: row.note || null,
    };
  }

  return Array.from(childrenMap.values());
}

async function getMyGroups(filters, actor) {
  ensureCanUseCoachWorkspace(actor);

  const targetCoachId = resolveTargetCoachId(actor, filters);
  const coach = await ensureTargetCoach(targetCoachId);

  const academyRows = await coachWorkspaceRepository.listCoachAcademies(targetCoachId);
  const availableAcademies = academyRows.map(mapAcademyOption);
  const selectedAcademy = resolveSelectedAcademy(availableAcademies, filters.academyId);

  const groupRows = selectedAcademy
    ? await coachWorkspaceRepository.listCoachGroupWorkspaceRows(targetCoachId, {
        academyId: selectedAcademy.id,
        isActive: filters.isActive,
      })
    : [];

  const academies = mapGroupRowsToSelectedAcademy(selectedAcademy, groupRows);

  return {
    coach: {
      id: Number(coach.id),
      firstName: coach.first_name,
      lastName: coach.last_name,
      email: coach.email,
    },
    selectedAcademy: buildSelectedAcademyPayload(selectedAcademy),
    availableAcademies: availableAcademies.map(mapAvailableAcademy),
    selectedSeason: null,
    availableSeasons: [],
    academies,
  };
}

async function getAcademyChildren(filters, actor) {
  ensureCanUseCoachWorkspace(actor);

  const targetCoachId = resolveTargetCoachId(actor, filters);
  await ensureTargetCoach(targetCoachId);

  const academyRows = await coachWorkspaceRepository.listCoachAcademies(targetCoachId);
  const availableAcademies = academyRows.map(mapAcademyOption);
  const selectedAcademy = resolveSelectedAcademy(availableAcademies, filters.academyId);

  if (!selectedAcademy) {
    return {
      selectedAcademy: null,
      availableAcademies: availableAcademies.map(mapAvailableAcademy),
      selectedSeason: null,
      availableSeasons: [],
      children: [],
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: 0,
      },
    };
  }

  const [childrenRows, total] = await Promise.all([
    coachWorkspaceRepository.listAcademyChildrenForCoach(targetCoachId, {
      academyId: selectedAcademy.id,
      seasonId: filters.seasonId,
      search: filters.search,
      limit: filters.limit,
      offset: filters.offset,
    }),
    coachWorkspaceRepository.countAcademyChildrenForCoach(targetCoachId, {
      academyId: selectedAcademy.id,
      seasonId: filters.seasonId,
      search: filters.search,
    }),
  ]);

  return {
    selectedAcademy: buildSelectedAcademyPayload(selectedAcademy),
    availableAcademies: availableAcademies.map(mapAvailableAcademy),
    selectedSeason: null,
    availableSeasons: [],
    children: childrenRows.map((row) => ({
      id: Number(row.id),
      firstName: row.first_name,
      lastName: row.last_name,
      isActive: Boolean(row.is_active),
      currentGroup: row.current_group_id
        ? {
            id: Number(row.current_group_id),
            name: row.current_group_name,
          }
        : null,
      academy: {
        id: Number(row.academy_id),
        name: row.academy_name,
      },
      questionnaire: {
        status: normalizeQuestionnaireStatus(
          row.questionnaire_status,
          row.questionnaire_expires_at
        ),
      },
    })),
    pagination: {
      limit: filters.limit,
      offset: filters.offset,
      total,
    },
  };
}

async function getGroupComfortZoneOverview(groupId, filters, actor) {
  ensureCanUseCoachWorkspace(actor);

  const group = await groupRepository.findByIdWithSeasonAndAcademy(groupId);

  if (!group) {
    throw new AppError(404, 'Групата не е намерена.');
  }

  await ensureCoachCanAccessGroup(actor, groupId);

  const categoryKey = filters.category || 'creativity';
  const category = COMFORT_OVERVIEW_CATEGORIES[categoryKey];

  if (!category) {
    throw new AppError(400, 'Невалидна категория за комфортните зони.');
  }

  const actionCodes = category.columns.map((column) => column.actionCode);
  const rows = await coachWorkspaceRepository.getGroupComfortZoneOverviewRows(groupId, actionCodes);

  return {
    group: {
      id: Number(group.id),
      name: group.name,
      academy: {
        id: Number(group.academy_id),
        name: group.academy_name,
      },
    },
    category: {
      key: categoryKey,
      label: category.label,
      columns: category.columns.map((column) => ({ ...column })),
    },
    children: mapComfortOverviewChildren(rows, category),
  };
}

module.exports = {
  getMyGroups,
  getAcademyChildren,
  getGroupComfortZoneOverview,
};
