const coachAcademyService = require('../services/coachAcademy.service');
const {
  coachAcademyParamsSchema,
  coachIdParamsSchema,
  academyIdParamsSchema,
  assignCoachAcademySchema,
} = require('../validations/coachAcademy.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listCoachAcademies(req, res) {
  const { coachId } = coachIdParamsSchema.parse(req.params);
  const result = await coachAcademyService.listCoachAcademies(coachId, req.user);
  res.status(200).json(result);
}

async function listAcademyCoaches(req, res) {
  const { academyId } = academyIdParamsSchema.parse(req.params);
  const result = await coachAcademyService.listAcademyCoaches(academyId, req.user);
  res.status(200).json(result);
}

async function assignCoachToAcademy(req, res) {
  const payload = assignCoachAcademySchema.parse(req.body);
  const result = await coachAcademyService.assignCoachToAcademy(payload, getRequestContext(req));
  res.status(201).json(result);
}

async function unassignCoachFromAcademy(req, res) {
  const { academyId, coachId } = coachAcademyParamsSchema.parse(req.params);
  const result = await coachAcademyService.unassignCoachFromAcademy(
    academyId,
    coachId,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

module.exports = {
  listCoachAcademies,
  listAcademyCoaches,
  assignCoachToAcademy,
  unassignCoachFromAcademy,
};
