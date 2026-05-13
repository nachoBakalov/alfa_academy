const childService = require('../services/child.service');
const childProfileService = require('../services/childProfile.service');
const {
  listChildrenQuerySchema,
  childIdParamSchema,
  createChildSchema,
  updateChildSchema,
  updateChildStatusSchema,
  generateQuestionnaireTokenSchema,
} = require('../validations/child.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listChildren(req, res) {
  const filters = listChildrenQuerySchema.parse(req.query);
  const result = await childService.listChildren(filters, req.user);
  res.status(200).json(result);
}

async function getChildById(req, res) {
  const { id } = childIdParamSchema.parse(req.params);
  const child = await childService.getChildById(id, req.user);
  res.status(200).json({ child });
}

async function getChildProfile(req, res) {
  const { id } = childIdParamSchema.parse(req.params);
  const profile = await childProfileService.getChildProfile(id, req.user);
  res.status(200).json(profile);
}

async function createChild(req, res) {
  const payload = createChildSchema.parse(req.body);
  const child = await childService.createChild(payload, getRequestContext(req));
  res.status(201).json({ child });
}

async function updateChild(req, res) {
  const { id } = childIdParamSchema.parse(req.params);
  const payload = updateChildSchema.parse(req.body);
  const child = await childService.updateChild(id, payload, getRequestContext(req));
  res.status(200).json({ child });
}

async function updateChildStatus(req, res) {
  const { id } = childIdParamSchema.parse(req.params);
  const payload = updateChildStatusSchema.parse(req.body);
  const child = await childService.updateChildStatus(
    id,
    payload,
    getRequestContext(req)
  );

  res.status(200).json({ child });
}

async function generateQuestionnaireToken(req, res) {
  const { id } = childIdParamSchema.parse(req.params);
  const payload = generateQuestionnaireTokenSchema.parse(req.body || {});
  const questionnaire = await childService.generateQuestionnaireToken(
    id,
    payload,
    getRequestContext(req)
  );

  res.status(200).json({ questionnaire });
}

module.exports = {
  listChildren,
  getChildProfile,
  getChildById,
  createChild,
  updateChild,
  updateChildStatus,
  generateQuestionnaireToken,
};
