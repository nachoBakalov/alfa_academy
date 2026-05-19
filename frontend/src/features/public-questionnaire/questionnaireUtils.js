export const RELATION_OPTIONS = [
  { value: 'parent', label: 'Родител' },
  { value: 'guardian', label: 'Настойник' },
  { value: 'other', label: 'Друго' },
];

const NOTE_MAX_LENGTH = 2000;
const NAME_MAX_LENGTH = 150;

const SCALE_HELPERS = {
  standard_comfort: [
    '1-4: Извън комфортната зона / нужда от подкрепа',
    '5-7: Междинна зона / участва с насока',
    '8-10: Комфортна зона / чувства се уверено',
  ],
  temperament: [
    '1-2: По-пасивно поведение',
    '3-5: Спокойно поведение',
    '6-8: Активно поведение',
    '9-10: Много висока активност',
  ],
  emotional_sensitivity: [
    '1-4: По-широко скроено / не се засяга лесно',
    '5-7: Понякога се засяга според ситуацията',
    '8-10: По-силна емоционална реактивност',
  ],
  rules_tendency: [
    '1-3: Обикновено спазва правилата',
    '4-6: Понякога тества граници',
    '7-10: По-често тества правила и има нужда от ясна структура',
  ],
};

export function getScaleHelper(scaleType) {
  if (!scaleType || scaleType === 'text_only') {
    return [];
  }

  return SCALE_HELPERS[scaleType] || SCALE_HELPERS.standard_comfort;
}

export function flattenQuestions(form) {
  const sections = form?.sections || [];

  return sections.flatMap((section) =>
    (section.subsections || []).flatMap((subsection) =>
      (subsection.questions || []).map((question) => ({
        ...question,
        sectionCode: section.code,
        sectionName: section.name,
        subsectionCode: subsection.code,
        subsectionName: subsection.name,
      }))
    )
  );
}

export function buildInitialAnswers(questions) {
  return Object.fromEntries(
    (questions || []).map((question) => [
      question.code,
      {
        scoreValue: null,
        textValue: '',
        note: '',
      },
    ])
  );
}

function isScoreSelected(value) {
  return Number.isInteger(value) && value >= 1 && value <= 10;
}

function hasTextValue(value) {
  return String(value || '').trim().length > 0;
}

export function calculateProgress(questions, answersByCode) {
  const requiredQuestions = (questions || []).filter((question) => question.isRequired);

  if (requiredQuestions.length === 0) {
    return {
      answeredRequired: 0,
      totalRequired: 0,
      percentage: 100,
    };
  }

  const answeredRequired = requiredQuestions.filter((question) => {
    const answer = answersByCode?.[question.code] || {};

    if (question.inputType === 'score') {
      return isScoreSelected(answer.scoreValue);
    }

    if (question.inputType === 'text') {
      return hasTextValue(answer.textValue);
    }

    return false;
  }).length;

  return {
    answeredRequired,
    totalRequired: requiredQuestions.length,
    percentage: Math.round((answeredRequired / requiredQuestions.length) * 100),
  };
}

export function validateQuestionnaireForm({ questions, answersByCode, submittedByName, submittedByRelation }) {
  const errors = {
    submittedByName: '',
    submittedByRelation: '',
    questions: {},
  };

  let firstInvalidCode = null;

  if (String(submittedByName || '').trim().length > NAME_MAX_LENGTH) {
    errors.submittedByName = 'Името е твърде дълго.';
  }

  if (!submittedByRelation) {
    errors.submittedByRelation = 'Моля, изберете кой попълва формата.';
  }

  for (const question of questions || []) {
    const answer = answersByCode?.[question.code] || {};

    if (question.inputType === 'score') {
      if (question.isRequired && !isScoreSelected(answer.scoreValue)) {
        errors.questions[question.code] = 'Моля, изберете оценка.';
      }

      if (String(answer.note || '').trim().length > NOTE_MAX_LENGTH) {
        errors.questions[question.code] = 'Бележката е твърде дълга.';
      }
    }

    if (question.inputType === 'text') {
      if (question.isRequired && !hasTextValue(answer.textValue)) {
        errors.questions[question.code] = 'Моля, попълнете това поле.';
      }
    }

    if (!firstInvalidCode && errors.questions[question.code]) {
      firstInvalidCode = question.code;
    }
  }

  if (!firstInvalidCode && errors.submittedByName) {
    firstInvalidCode = 'submittedByName';
  }

  if (!firstInvalidCode && errors.submittedByRelation) {
    firstInvalidCode = 'submittedByRelation';
  }

  const hasErrors =
    Boolean(errors.submittedByName) ||
    Boolean(errors.submittedByRelation) ||
    Object.keys(errors.questions).length > 0;

  return {
    isValid: !hasErrors,
    errors,
    firstInvalidCode,
  };
}

export function buildSubmitPayload({ questions, answersByCode, submittedByName, submittedByRelation }) {
  const answers = [];

  for (const question of questions || []) {
    const answer = answersByCode?.[question.code] || {};

    if (question.inputType === 'score') {
      if (!isScoreSelected(answer.scoreValue)) {
        continue;
      }

      const scoreAnswer = {
        questionCode: question.code,
        scoreValue: answer.scoreValue,
      };

      const note = String(answer.note || '').trim();

      if (note) {
        scoreAnswer.note = note;
      }

      answers.push(scoreAnswer);
      continue;
    }

    if (question.inputType === 'text') {
      const textValue = String(answer.textValue || '').trim();

      if (!textValue) {
        continue;
      }

      answers.push({
        questionCode: question.code,
        textValue,
      });
    }
  }

  const payload = {
    submittedByRelation,
    answers,
  };

  const normalizedName = String(submittedByName || '').trim();

  if (normalizedName) {
    payload.submittedByName = normalizedName;
  }

  return payload;
}

export function mapUnavailableFromError(error) {
  const status = error?.response?.status;
  const backendMessage = String(error?.response?.data?.message || '').toLowerCase();

  if (status === 409) {
    return {
      title: 'Въпросникът вече е изпратен',
      message: 'Формата за този линк вече е попълнена успешно.',
    };
  }

  if (status === 410 && backendMessage.includes('expired')) {
    return {
      title: 'Линкът е изтекъл',
      message: 'Свържете се с екипа на академията за нов линк.',
    };
  }

  if (status === 410 && backendMessage.includes('revoked')) {
    return {
      title: 'Линкът вече не е активен',
      message: 'Свържете се с екипа на академията за актуален линк.',
    };
  }

  if (status === 410) {
    return {
      title: 'Формата не е налична',
      message: 'Свържете се с екипа на академията.',
    };
  }

  if (status === 404) {
    return {
      title: 'Невалиден линк',
      message: 'Проверете дали линкът е копиран правилно.',
    };
  }

  return {
    title: 'Възникна грешка',
    message: 'Опитайте отново след малко.',
  };
}
