const socialBehaviorService = require('../services/socialBehavior.service');
const {
  groupIdParamSchema,
  dailyQuerySchema,
  updateActiveDaysSchema,
  saveDailyEvaluationsSchema,
} = require('../validations/socialBehavior.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function getGroupActiveDays(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const result = await socialBehaviorService.getGroupActiveDays(groupId, req.user);
  res.status(200).json(result);
}

async function updateGroupActiveDays(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const payload = updateActiveDaysSchema.parse(req.body);

  const result = await socialBehaviorService.updateGroupActiveDays(
    groupId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function getDailyEvaluationScreen(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const { date } = dailyQuerySchema.parse(req.query);

  const result = await socialBehaviorService.getDailyEvaluationScreen(
    groupId,
    date,
    req.user
  );

  res.status(200).json(result);
}

async function saveDailyEvaluations(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const payload = saveDailyEvaluationsSchema.parse(req.body);

  const result = await socialBehaviorService.saveDailyEvaluations(
    groupId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function getDailySummary(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const { date } = dailyQuerySchema.parse(req.query);

  const result = await socialBehaviorService.getDailySummary(groupId, date, req.user);
  res.status(200).json(result);
}

module.exports = {
  getGroupActiveDays,
  updateGroupActiveDays,
  getDailyEvaluationScreen,
  saveDailyEvaluations,
  getDailySummary,
};
