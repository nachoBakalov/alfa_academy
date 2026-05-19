const creativeChallengeService = require('../services/creativeChallenge.service');
const {
  listCreativeChallengesQuerySchema,
  challengeIdParamSchema,
  groupIdParamSchema,
  createCreativeChallengeSchema,
  updateCreativeChallengeSchema,
  updateCreativeChallengeStatusSchema,
  upsertCreativeChallengeGroupResultSchema,
} = require('../validations/creativeChallenge.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listChallenges(req, res) {
  const filters = listCreativeChallengesQuerySchema.parse(req.query || {});
  const result = await creativeChallengeService.listChallenges(filters, req.user);
  res.status(200).json(result);
}

async function createChallenge(req, res) {
  const payload = createCreativeChallengeSchema.parse(req.body);
  const result = await creativeChallengeService.createChallenge(payload, getRequestContext(req));
  res.status(201).json(result);
}

async function getChallengeById(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const result = await creativeChallengeService.getChallengeById(challengeId, req.user);
  res.status(200).json(result);
}

async function updateChallenge(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const payload = updateCreativeChallengeSchema.parse(req.body);

  const result = await creativeChallengeService.updateChallenge(
    challengeId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function saveGroupResult(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const { groupId } = groupIdParamSchema.parse(req.params);
  const payload = upsertCreativeChallengeGroupResultSchema.parse(req.body);

  const result = await creativeChallengeService.saveGroupResult(
    challengeId,
    groupId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function updateChallengeStatus(req, res) {
  const { challengeId } = challengeIdParamSchema.parse(req.params);
  const payload = updateCreativeChallengeStatusSchema.parse(req.body);

  const result = await creativeChallengeService.updateChallengeStatus(
    challengeId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

module.exports = {
  listChallenges,
  createChallenge,
  getChallengeById,
  updateChallenge,
  saveGroupResult,
  updateChallengeStatus,
};
