const academyService = require('../services/academy.service');
const {
  listAcademiesQuerySchema,
  academyIdParamSchema,
  createAcademySchema,
  updateAcademySchema,
  updateAcademyStatusSchema,
} = require('../validations/academy.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listAcademies(req, res) {
  const filters = listAcademiesQuerySchema.parse(req.query);
  const result = await academyService.listAcademies(filters, req.user);
  res.status(200).json(result);
}

async function getAcademyById(req, res) {
  const { id } = academyIdParamSchema.parse(req.params);
  const academy = await academyService.getAcademyById(id, req.user);
  res.status(200).json({ academy });
}

async function createAcademy(req, res) {
  const payload = createAcademySchema.parse(req.body);
  const academy = await academyService.createAcademy(payload, getRequestContext(req));
  res.status(201).json({ academy });
}

async function updateAcademy(req, res) {
  const { id } = academyIdParamSchema.parse(req.params);
  const payload = updateAcademySchema.parse(req.body);
  const academy = await academyService.updateAcademy(id, payload, getRequestContext(req));
  res.status(200).json({ academy });
}

async function updateAcademyStatus(req, res) {
  const { id } = academyIdParamSchema.parse(req.params);
  const payload = updateAcademyStatusSchema.parse(req.body);
  const academy = await academyService.updateAcademyStatus(
    id,
    payload,
    getRequestContext(req)
  );

  res.status(200).json({ academy });
}

module.exports = {
  listAcademies,
  getAcademyById,
  createAcademy,
  updateAcademy,
  updateAcademyStatus,
};
