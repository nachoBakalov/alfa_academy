const coachSeasonService = require('../services/coachSeason.service');
const {
  seasonIdParamsSchema,
  coachIdParamsSchema,
  coachSeasonParamsSchema,
  assignCoachSeasonSchema,
} = require('../validations/coachSeason.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listSeasonCoaches(req, res) {
  const { seasonId } = seasonIdParamsSchema.parse(req.params);
  const result = await coachSeasonService.listSeasonCoaches(seasonId, req.user);
  res.status(200).json(result);
}

async function listCoachSeasons(req, res) {
  const { coachId } = coachIdParamsSchema.parse(req.params);
  const result = await coachSeasonService.listCoachSeasons(coachId, req.user);
  res.status(200).json(result);
}

async function assignCoachToSeason(req, res) {
  const payload = assignCoachSeasonSchema.parse(req.body);
  const result = await coachSeasonService.assignCoachToSeason(payload, getRequestContext(req));
  res.status(201).json(result);
}

async function unassignCoachFromSeason(req, res) {
  const { seasonId, coachId } = coachSeasonParamsSchema.parse(req.params);
  const result = await coachSeasonService.unassignCoachFromSeason(
    seasonId,
    coachId,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

module.exports = {
  listSeasonCoaches,
  listCoachSeasons,
  assignCoachToSeason,
  unassignCoachFromSeason,
};
