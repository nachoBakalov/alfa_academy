const AppError = require('../utils/AppError');
const coachWorkspaceRepository = require('../repositories/coachWorkspace.repository');

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

module.exports = {
  getMyGroups,
  getAcademyChildren,
};
