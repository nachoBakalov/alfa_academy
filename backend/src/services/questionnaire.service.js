const AppError = require('../utils/AppError');
const { withTransaction } = require('../db/postgres');
const childRepository = require('../repositories/child.repository');
const questionnaireRepository = require('../repositories/questionnaire.repository');
const questionnaireTokenRepository = require('../repositories/questionnaireToken.repository');
const questionnaireSubmissionRepository = require('../repositories/questionnaireSubmission.repository');
const comfortZoneRepository = require('../repositories/comfortZone.repository');
const auditLogRepository = require('../repositories/auditLog.repository');
const comfortZoneService = require('./comfortZone.service');

const ACTIVE_QUESTIONNAIRE_CODE = 'comfort_zone_parent_v1';

function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() < Date.now();
}

async function assertTokenUsable(tokenRecord, client) {
  if (!tokenRecord) {
    throw new AppError(404, 'Questionnaire token not found');
  }

  if (tokenRecord.status === 'submitted') {
    throw new AppError(409, 'Questionnaire has already been submitted');
  }

  if (tokenRecord.status === 'revoked') {
    throw new AppError(410, 'Questionnaire link has been revoked');
  }

  if (tokenRecord.status === 'expired') {
    throw new AppError(410, 'Questionnaire link has expired');
  }

  if (isExpired(tokenRecord.expires_at)) {
    await questionnaireTokenRepository.markExpired(tokenRecord.id, client);
    throw new AppError(410, 'Questionnaire link has expired');
  }

  if (!tokenRecord.child_is_active) {
    throw new AppError(410, 'Questionnaire is no longer available');
  }
}

function buildSections(formRows) {
  const sectionsMap = new Map();

  for (const row of formRows) {
    const sectionCode = row.sphere_code || 'general';
    const sectionName = row.sphere_name || 'Общо';

    if (!sectionsMap.has(sectionCode)) {
      sectionsMap.set(sectionCode, {
        code: sectionCode,
        name: sectionName,
        order: row.sphere_order ?? 9999,
        subsections: new Map(),
      });
    }

    const section = sectionsMap.get(sectionCode);
    const subsectionCode = row.subsphere_code || 'general';
    const subsectionName = row.subsphere_name || 'Общо';

    if (!section.subsections.has(subsectionCode)) {
      section.subsections.set(subsectionCode, {
        code: subsectionCode,
        name: subsectionName,
        order: row.subsphere_order ?? 9999,
        questions: [],
      });
    }

    const subsection = section.subsections.get(subsectionCode);
    subsection.questions.push({
      code: row.question_code,
      label: row.question_label,
      inputType: row.question_input_type,
      scaleType: row.action_scale_type,
      isRequired: row.question_is_required,
      hasNote: row.action_has_note,
      order: row.question_order,
    });
  }

  const sections = Array.from(sectionsMap.values())
    .sort((a, b) => a.order - b.order)
    .map((section) => ({
      code: section.code,
      name: section.name,
      subsections: Array.from(section.subsections.values())
        .sort((a, b) => a.order - b.order)
        .map((subsection) => ({
          code: subsection.code,
          name: subsection.name,
          questions: subsection.questions
            .sort((a, b) => a.order - b.order)
            .map(({ order, ...question }) => question),
        })),
    }));

  return sections;
}

function validateQuestionnaireAnswers(questions, payloadAnswers) {
  const questionsByCode = new Map(questions.map((question) => [question.code, question]));
  const submittedCodes = new Set(payloadAnswers.map((answer) => answer.questionCode));

  const missingRequired = questions.filter(
    (question) => question.is_required && !submittedCodes.has(question.code)
  );

  if (missingRequired.length > 0) {
    throw new AppError(400, 'Invalid questionnaire answers');
  }

  const normalizedAnswers = [];

  for (const answer of payloadAnswers) {
    const question = questionsByCode.get(answer.questionCode);

    if (!question) {
      throw new AppError(400, 'Invalid questionnaire answers');
    }

    if (question.input_type === 'score') {
      if (!Number.isInteger(answer.scoreValue) || answer.scoreValue < 1 || answer.scoreValue > 10) {
        throw new AppError(400, 'Invalid questionnaire answers');
      }

      normalizedAnswers.push({
        question,
        scoreValue: answer.scoreValue,
        textValue: null,
        note: answer.note || null,
      });
      continue;
    }

    if (question.input_type === 'text') {
      const textValue = typeof answer.textValue === 'string' ? answer.textValue.trim() : '';

      if (!textValue) {
        throw new AppError(400, 'Invalid questionnaire answers');
      }

      normalizedAnswers.push({
        question,
        scoreValue: null,
        textValue,
        note: answer.note || null,
      });
      continue;
    }

    throw new AppError(400, 'Invalid questionnaire answers');
  }

  return normalizedAnswers;
}

function mapRelationToProfileType(relation) {
  if (relation === 'parent') {
    return 'parent';
  }

  if (relation === 'guardian') {
    return 'guardian';
  }

  return 'other';
}

function ensureCanViewChildProfile(actor) {
  if (!['super_admin', 'admin', 'manager', 'coach'].includes(actor.role)) {
    throw new AppError(403, 'Forbidden');
  }
}

async function ensureCoachCanViewChild(actor, childId) {
  if (actor.role !== 'coach') {
    return;
  }

  const canAccess = await childRepository.userCanAccessChild(actor.id, childId);

  if (!canAccess) {
    throw new AppError(403, 'Forbidden');
  }
}

async function getPublicQuestionnaireForm(token) {
  const tokenRecord = await questionnaireTokenRepository.findByToken(token);
  await assertTokenUsable(tokenRecord);

  const questionnaire = await questionnaireRepository.getActiveQuestionnaireByCode(
    ACTIVE_QUESTIONNAIRE_CODE
  );

  if (!questionnaire) {
    throw new AppError(404, 'Questionnaire not found');
  }

  const formRows = await questionnaireRepository.getQuestionnaireForm(questionnaire.id);
  const sections = buildSections(formRows);

  return {
    questionnaire: {
      status: tokenRecord.status,
      expiresAt: tokenRecord.expires_at,
      child: {
        firstName: tokenRecord.child_first_name,
        lastName: tokenRecord.child_last_name,
      },
      form: {
        code: questionnaire.code,
        title: questionnaire.title,
        version: questionnaire.version,
        sections,
      },
    },
  };
}

async function submitPublicQuestionnaire(token, payload, context) {
  return withTransaction(async (client) => {
    const tokenRecord = await questionnaireTokenRepository.findByTokenForUpdate(token, client);
    await assertTokenUsable(tokenRecord, client);

    const existingSubmission = await questionnaireSubmissionRepository.findSubmissionByTokenId(
      tokenRecord.id,
      client
    );

    if (existingSubmission) {
      throw new AppError(409, 'Questionnaire has already been submitted');
    }

    const questionnaire = await questionnaireRepository.getActiveQuestionnaireByCode(
      ACTIVE_QUESTIONNAIRE_CODE
    );

    if (!questionnaire) {
      throw new AppError(404, 'Questionnaire not found');
    }

    const questions = await questionnaireRepository.getQuestionsByQuestionnaireId(questionnaire.id);
    const normalizedAnswers = validateQuestionnaireAnswers(questions, payload.answers);

    const submission = await questionnaireSubmissionRepository.createSubmission(
      {
        questionnaireId: questionnaire.id,
        questionnaireTokenId: tokenRecord.id,
        childId: tokenRecord.child_id,
        submittedByName: payload.submittedByName,
        submittedByRelation: payload.submittedByRelation,
      },
      client
    );

    const insertedAnswers = [];

    for (const normalizedAnswer of normalizedAnswers) {
      let zone = null;
      let interpretation = null;

      if (normalizedAnswer.question.input_type === 'score') {
        const actionResult = comfortZoneService.calculateActionResult(
          normalizedAnswer.scoreValue,
          normalizedAnswer.question.scale_type
        );

        zone = actionResult.zone;
        interpretation = actionResult.interpretation;
      }

      const answerRow = await questionnaireSubmissionRepository.createAnswer(
        {
          submissionId: submission.id,
          questionId: normalizedAnswer.question.id,
          scoreValue: normalizedAnswer.scoreValue,
          textValue: normalizedAnswer.textValue,
          note: normalizedAnswer.note,
          zone,
          interpretation,
        },
        client
      );

      insertedAnswers.push({
        question: normalizedAnswer.question,
        answer: answerRow,
      });
    }

    const profile = await comfortZoneRepository.createProfile(
      {
        childId: tokenRecord.child_id,
        sourceSubmissionId: submission.id,
        completedByType: mapRelationToProfileType(payload.submittedByRelation),
        completedByName: payload.submittedByName,
      },
      client
    );

    for (const insertedAnswer of insertedAnswers) {
      const question = insertedAnswer.question;
      const answer = insertedAnswer.answer;

      if (question.input_type !== 'score' || !question.action_id) {
        continue;
      }

      await comfortZoneRepository.createScore(
        {
          profileId: profile.id,
          actionId: question.action_id,
          sourceAnswerId: answer.id,
          scoreValue: answer.score_value,
          zone: answer.zone || 'neutral',
          interpretation: answer.interpretation,
          note: answer.note,
        },
        client
      );
    }

    const submittedToken = await questionnaireTokenRepository.markSubmitted(tokenRecord.id, client);

    if (!submittedToken) {
      throw new AppError(409, 'Questionnaire has already been submitted');
    }

    await auditLogRepository.createAuditLog(
      {
        actorUserId: null,
        entityType: 'questionnaire',
        entityId: submission.id,
        action: 'questionnaire.submitted',
        metadata: {
          childId: tokenRecord.child_id,
          questionnaireCode: ACTIVE_QUESTIONNAIRE_CODE,
          answersCount: normalizedAnswers.length,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
      client
    );

    return {
      message: 'Questionnaire submitted successfully',
    };
  });
}

async function getChildComfortZoneProfile(childId, actor) {
  ensureCanViewChildProfile(actor);
  await ensureCoachCanViewChild(actor, childId);

  const profile = await comfortZoneRepository.getLatestProfileByChildId(childId);

  if (!profile) {
    throw new AppError(404, 'Comfort zone profile not found');
  }

  const scores = await comfortZoneRepository.getProfileScores(profile.id);
  const sectionsMap = new Map();

  for (const score of scores) {
    if (!sectionsMap.has(score.sphere_code)) {
      sectionsMap.set(score.sphere_code, {
        code: score.sphere_code,
        name: score.sphere_name,
        order: score.sphere_order,
        scores: [],
      });
    }

    const section = sectionsMap.get(score.sphere_code);
    section.scores.push({
      actionCode: score.action_code,
      label: score.action_label,
      scoreValue: score.score_value,
      zone: score.zone,
      interpretation: score.interpretation,
      note: score.note,
    });
  }

  const sections = Array.from(sectionsMap.values())
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...section }) => section);

  return {
    profile: {
      id: profile.id,
      child: {
        id: profile.child_id,
        firstName: profile.child_first_name,
        lastName: profile.child_last_name,
      },
      completedAt: profile.completed_at,
      completedByType: profile.completed_by_type,
      completedByName: profile.completed_by_name,
      sections,
    },
  };
}

module.exports = {
  getPublicQuestionnaireForm,
  submitPublicQuestionnaire,
  getChildComfortZoneProfile,
};
