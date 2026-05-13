const questionnaireController = require('./questionnaire.controller');

module.exports = {
  getByToken: questionnaireController.getPublicQuestionnaireForm,
  submit: questionnaireController.submitPublicQuestionnaire,
};
