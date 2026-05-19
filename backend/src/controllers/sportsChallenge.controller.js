const sportsChallengeService = require('../services/sportsChallenge.service');
const {
  groupIdParamSchema,
  challengeIdParamSchema,
  definitionIdParamSchema,
  listDefinitionsQuerySchema,
  createDefinitionSchema,
  updateDefinitionSchema,
  updateDefinitionStatusSchema,
  listGroupChallengesQuerySchema,
  createSportsChallengeSchema,
  updateSportsChallengeSchema,
  updateSportsChallengeStatusSchema,
  saveSportsResultsSchema,
} = require('../validations/sportsChallenge.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listDefinitions(req, res) {
  const filters = listDefinitionsQuerySchema.parse(req.query || {});
  const result = await sportsChallengeService.listDefinitions(filters, req.user);
  res.status(200).json(result);
}

async function createDefinition(req, res) {
  const payload = createDefinitionSchema.parse(req.body);
  const result = await sportsChallengeService.createDefinition(payload, getRequestContext(req));
  res.status(201).json(result);
}

async function updateDefinition(req, res) {
  const { definitionId } = definitionIdParamSchema.parse(req.params);
  const payload = updateDefinitionSchema.parse(req.body);

  const result = await sportsChallengeService.updateDefinition(
    definitionId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function updateDefinitionStatus(req, res) {
  const { definitionId } = definitionIdParamSchema.parse(req.params);
  const payload = updateDefinitionStatusSchema.parse(req.body);

  const result = await sportsChallengeService.updateDefinitionStatus(
    definitionId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function listGroupChallenges(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const filters = listGroupChallengesQuerySchema.parse(req.query || {});

  const result = await sportsChallengeService.listGroupChallenges(groupId, filters, req.user);
  res.status(200).json(result);
}

async function createGroupChallenge(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const payload = createSportsChallengeSchema.parse(req.body);

  const result = await sportsChallengeService.createGroupChallenge(
    groupId,
    payload,
    getRequestContext(req)
  );

  res.status(201).json(result);
}

async function getChallengeById(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const result = await sportsChallengeService.getChallengeById(challengeId, req.user);
  res.status(200).json(result);
}

async function updateChallenge(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const payload = updateSportsChallengeSchema.parse(req.body);

  const result = await sportsChallengeService.updateChallenge(
    challengeId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function updateChallengeStatus(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const payload = updateSportsChallengeStatusSchema.parse(req.body);

  const result = await sportsChallengeService.updateChallengeStatus(
    challengeId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function saveChallengeResults(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const payload = saveSportsResultsSchema.parse(req.body);

  const result = await sportsChallengeService.saveChallengeResults(
    challengeId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function recalculateChallengeSummary(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const result = await sportsChallengeService.recalculateChallengeSummary(
    challengeId,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

module.exports = {
  listDefinitions,
  createDefinition,
  updateDefinition,
  updateDefinitionStatus,
  listGroupChallenges,
  createGroupChallenge,
  getChallengeById,
  updateChallenge,
  updateChallengeStatus,
  saveChallengeResults,
  recalculateChallengeSummary,
};
