const statisticsService = require('../services/statistics.service');
const {
  groupOverviewQuerySchema,
  groupLeaderboardQuerySchema,
} = require('../validations/statistics.validation');

async function getGroupOverview(req, res) {
  const filters = groupOverviewQuerySchema.parse(req.query || {});
  const result = await statisticsService.getGroupOverview(filters, req.user);
  res.status(200).json(result);
}

async function getGroupLeaderboard(req, res) {
  const filters = groupLeaderboardQuerySchema.parse(req.query || {});
  const result = await statisticsService.getGroupLeaderboard(filters, req.user);
  res.status(200).json(result);
}

module.exports = {
  getGroupOverview,
  getGroupLeaderboard,
};
