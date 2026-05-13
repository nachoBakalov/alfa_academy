const questionnaireService = require('../services/questionnaire.service');
const {
  questionnaireTokenParamSchema,
  submitQuestionnaireSchema,
  childIdParamSchema,
} = require('../validations/questionnaire.validation');

function getPublicContext(req) {
  return {
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function getPublicQuestionnaireForm(req, res) {
  const { token } = questionnaireTokenParamSchema.parse(req.params);
  const result = await questionnaireService.getPublicQuestionnaireForm(token);
  res.status(200).json(result);
}

async function submitPublicQuestionnaire(req, res) {
  const { token } = questionnaireTokenParamSchema.parse(req.params);
  const payload = submitQuestionnaireSchema.parse(req.body);
  const result = await questionnaireService.submitPublicQuestionnaire(
    token,
    payload,
    getPublicContext(req)
  );

  res.status(200).json(result);
}

async function getChildComfortZoneProfile(req, res) {
  const { childId } = childIdParamSchema.parse(req.params);
  const result = await questionnaireService.getChildComfortZoneProfile(childId, req.user);
  res.status(200).json(result);
}

module.exports = {
  getPublicQuestionnaireForm,
  submitPublicQuestionnaire,
  getChildComfortZoneProfile,
};
