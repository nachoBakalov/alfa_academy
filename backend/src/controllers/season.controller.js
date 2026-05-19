const seasonService = require('../services/season.service');
const {
  listSeasonsQuerySchema,
  seasonChildrenQuerySchema,
  seasonIdParamSchema,
  createSeasonSchema,
  updateSeasonSchema,
  updateSeasonStatusSchema,
} = require('../validations/season.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listSeasons(req, res) {
  const filters = listSeasonsQuerySchema.parse(req.query);
  const result = await seasonService.listSeasons(filters, req.user);
  res.status(200).json(result);
}

async function getSeasonById(req, res) {
  const { id } = seasonIdParamSchema.parse(req.params);
  const season = await seasonService.getSeasonById(id, req.user);
  res.status(200).json({ season });
}

async function listSeasonChildren(req, res) {
  const { id } = seasonIdParamSchema.parse(req.params);
  const filters = seasonChildrenQuerySchema.parse(req.query || {});
  const result = await seasonService.listSeasonChildren(id, filters, req.user);
  res.status(200).json(result);
}

async function createSeason(req, res) {
  const payload = createSeasonSchema.parse(req.body);
  const season = await seasonService.createSeason(payload, getRequestContext(req));
  res.status(201).json({ season });
}

async function updateSeason(req, res) {
  const { id } = seasonIdParamSchema.parse(req.params);
  const payload = updateSeasonSchema.parse(req.body);
  const season = await seasonService.updateSeason(id, payload, getRequestContext(req));
  res.status(200).json({ season });
}

async function updateSeasonStatus(req, res) {
  const { id } = seasonIdParamSchema.parse(req.params);
  const payload = updateSeasonStatusSchema.parse(req.body);
  const season = await seasonService.updateSeasonStatus(id, payload, getRequestContext(req));
  res.status(200).json({ season });
}

module.exports = {
  listSeasons,
  listSeasonChildren,
  getSeasonById,
  createSeason,
  updateSeason,
  updateSeasonStatus,
};
