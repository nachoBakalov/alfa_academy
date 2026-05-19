const reportService = require('../services/report.service');
const {
  dashboardQuerySchema,
  groupIdParamSchema,
  groupDashboardQuerySchema,
  childrenOverviewQuerySchema,
} = require('../validations/report.validation');

async function getDashboard(req, res) {
  const filters = dashboardQuerySchema.parse(req.query || {});
  const result = await reportService.getDashboard(filters, req.user);
  res.status(200).json(result);
}

async function getGroupDashboard(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const filters = groupDashboardQuerySchema.parse(req.query || {});

  const result = await reportService.getGroupDashboard(groupId, filters, req.user);
  res.status(200).json(result);
}

async function getGroupChildrenOverview(req, res) {
  const { groupId } = groupIdParamSchema.parse(req.params);
  const filters = childrenOverviewQuerySchema.parse(req.query || {});

  const result = await reportService.getGroupChildrenOverview(groupId, filters, req.user);
  res.status(200).json(result);
}

module.exports = {
  getDashboard,
  getGroupDashboard,
  getGroupChildrenOverview,
};
