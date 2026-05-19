import axios from 'axios';

const DEFAULT_API_BASE_URL = 'http://localhost:3001/api';

const publicApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function normalizeQuestion(question = {}) {
  return {
    code: question.code || '',
    label: question.label || '',
    inputType: question.inputType || 'text',
    scaleType: question.scaleType || null,
    isRequired: Boolean(question.isRequired),
    hasNote: Boolean(question.hasNote),
  };
}

function normalizeSection(section = {}) {
  return {
    code: section.code || '',
    name: section.name || '',
    subsections: (section.subsections || []).map((subsection) => ({
      code: subsection.code || '',
      name: subsection.name || '',
      questions: (subsection.questions || []).map(normalizeQuestion),
    })),
  };
}

function normalizeQuestionnaire(questionnaire = {}) {
  return {
    status: questionnaire.status || null,
    expiresAt: questionnaire.expiresAt || null,
    child: {
      firstName: questionnaire.child?.firstName || '',
      lastName: questionnaire.child?.lastName || '',
    },
    form: {
      code: questionnaire.form?.code || '',
      title: questionnaire.form?.title || 'Въпросник за комфортна зона',
      version: questionnaire.form?.version || 1,
      sections: (questionnaire.form?.sections || []).map(normalizeSection),
    },
  };
}

async function getQuestionnaireByToken(token) {
  const { data } = await publicApiClient.get(`/public/questionnaires/${token}`);
  return normalizeQuestionnaire(data.questionnaire);
}

async function submitQuestionnaire(token, payload) {
  const { data } = await publicApiClient.post(`/public/questionnaires/${token}/submit`, payload);
  return {
    message: data.message || 'Questionnaire submitted successfully',
  };
}

export default {
  getQuestionnaireByToken,
  submitQuestionnaire,
};
