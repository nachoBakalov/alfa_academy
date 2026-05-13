const AppError = require('../utils/AppError');
const childRepository = require('../repositories/child.repository');
const childProfileRepository = require('../repositories/childProfile.repository');
const questionnaireTokenService = require('./questionnaireToken.service');

function ensureCanViewChildProfile(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCoachCanAccessChild(actor, childId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await childRepository.userCanAccessChild(actor.id, childId);

  if (!canAccess) {
    throw new AppError(403, 'Forbidden');
  }
}

function buildQuestionnaireStatus(row) {
  if (!row) {
    return {
      status: null,
      expiresAt: null,
      submittedAt: null,
      link: null,
    };
  }

  const now = Date.now();
  const expiresAtMs = new Date(row.expires_at).getTime();
  const effectiveStatus = row.status === 'pending' && expiresAtMs < now ? 'expired' : row.status;

  return {
    status: effectiveStatus,
    expiresAt: row.expires_at,
    submittedAt: row.submitted_at || null,
    link:
      effectiveStatus === 'pending' && row.token
        ? questionnaireTokenService.buildQuestionnaireLink(row.token)
        : null,
  };
}

function buildScoreInterpretation(zone, rawInterpretation) {
  if (zone === 'green') {
    return 'Комфортна зона';
  }

  if (zone === 'yellow') {
    return 'Зона на развитие';
  }

  if (zone === 'red') {
    return 'Нужда от подкрепа';
  }

  if (zone === 'behavior_indicator') {
    return rawInterpretation || 'Поведенчески индикатор';
  }

  if (zone === 'neutral') {
    return rawInterpretation || 'Поведенчески индикатор';
  }

  return rawInterpretation;
}

function buildComfortZoneSummary(scores) {
  const summary = {
    greenCount: 0,
    yellowCount: 0,
    redCount: 0,
    behaviorIndicatorCount: 0,
    neutralCount: 0,
  };

  for (const score of scores) {
    if (score.zone === 'green') {
      summary.greenCount += 1;
    } else if (score.zone === 'yellow') {
      summary.yellowCount += 1;
    } else if (score.zone === 'red') {
      summary.redCount += 1;
    } else if (score.zone === 'behavior_indicator') {
      summary.behaviorIndicatorCount += 1;
    } else if (score.zone === 'neutral') {
      summary.neutralCount += 1;
    }
  }

  return summary;
}

function buildComfortZoneSectionTree(scores) {
  const sectionsMap = new Map();

  for (const score of scores) {
    if (!sectionsMap.has(score.sphere_code)) {
      sectionsMap.set(score.sphere_code, {
        code: score.sphere_code,
        name: score.sphere_name,
        order: score.sphere_order,
        subsections: new Map(),
      });
    }

    const section = sectionsMap.get(score.sphere_code);
    const subsectionCode = score.subsphere_code || 'general';
    const subsectionName = score.subsphere_name || 'Общо';

    if (!section.subsections.has(subsectionCode)) {
      section.subsections.set(subsectionCode, {
        code: subsectionCode,
        name: subsectionName,
        order: score.subsphere_order ?? 9999,
        scores: [],
      });
    }

    const subsection = section.subsections.get(subsectionCode);
    subsection.scores.push({
      actionCode: score.action_code,
      label: score.action_label,
      scoreValue: score.score_value,
      zone: score.zone,
      interpretation: buildScoreInterpretation(score.zone, score.interpretation),
      note: score.note,
      order: score.action_order,
    });
  }

  return Array.from(sectionsMap.values())
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      code: section.code,
      name: section.name,
      subsections: Array.from(section.subsections.values())
        .sort((a, b) => a.order - b.order)
        .map((subsection) => ({
          code: subsection.code,
          name: subsection.name,
          scores: subsection.scores
            .sort((a, b) => a.order - b.order)
            .map(({ order, ...score }) => score),
        })),
    }));
}

async function getChildProfile(childId, actor) {
  ensureCanViewChildProfile(actor);

  const base = await childProfileRepository.getChildProfileBase(childId);

  if (!base) {
    throw new AppError(404, 'Child not found');
  }

  await ensureCoachCanAccessChild(actor, childId);

  const questionnaireRow = await childProfileRepository.getLatestQuestionnaireStatus(childId);
  const questionnaire = buildQuestionnaireStatus(questionnaireRow);

  const latestComfortProfile = await childProfileRepository.getLatestComfortZoneProfile(childId);

  let comfortZone = {
    hasProfile: false,
    completedAt: null,
    completedByType: null,
    completedByName: null,
    summary: {
      greenCount: 0,
      yellowCount: 0,
      redCount: 0,
      behaviorIndicatorCount: 0,
      neutralCount: 0,
    },
    sections: [],
    textAnswers: [],
  };

  if (latestComfortProfile) {
    const scores = await childProfileRepository.getComfortZoneScores(latestComfortProfile.id);
    const textAnswers = await childProfileRepository.getComfortZoneTextAnswers(
      latestComfortProfile.source_submission_id
    );

    comfortZone = {
      hasProfile: true,
      completedAt: latestComfortProfile.completed_at,
      completedByType: latestComfortProfile.completed_by_type,
      completedByName: latestComfortProfile.completed_by_name,
      summary: buildComfortZoneSummary(scores),
      sections: buildComfortZoneSectionTree(scores),
      textAnswers: textAnswers.map((item) => ({
        questionCode: item.question_code,
        label: item.label,
        textValue: item.text_value,
      })),
    };
  }

  return {
    profile: {
      child: {
        id: base.id,
        firstName: base.first_name,
        lastName: base.last_name,
        birthDate: base.birth_date,
        gender: base.gender,
        isActive: base.is_active,
        parentName: base.parent_name,
        parentEmail: base.parent_email,
        parentPhone: base.parent_phone,
        medicalNotes: base.medical_notes,
        generalNotes: base.general_notes,
      },
      currentGroup: base.group_id
        ? {
            id: base.group_id,
            name: base.group_name,
            season: base.season_id
              ? {
                  id: base.season_id,
                  name: base.season_name,
                }
              : null,
            academy: base.academy_id
              ? {
                  id: base.academy_id,
                  name: base.academy_name,
                }
              : null,
          }
        : null,
      questionnaire,
      comfortZone,
    },
  };
}

module.exports = {
  getChildProfile,
  buildQuestionnaireStatus,
  buildComfortZoneSectionTree,
  buildComfortZoneSummary,
};
