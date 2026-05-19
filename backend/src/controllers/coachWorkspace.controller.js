const coachWorkspaceService = require('../services/coachWorkspace.service');
const {
  myGroupsQuerySchema,
  academyChildrenQuerySchema,
} = require('../validations/coachWorkspace.validation');

async function getMyGroups(req, res) {
  const filters = myGroupsQuerySchema.parse(req.query || {});
  const result = await coachWorkspaceService.getMyGroups(filters, req.user);
  res.status(200).json(result);
}

async function getAcademyChildren(req, res) {
  const filters = academyChildrenQuerySchema.parse(req.query || {});
  const result = await coachWorkspaceService.getAcademyChildren(filters, req.user);
  res.status(200).json(result);
}

module.exports = {
  getMyGroups,
  getAcademyChildren,
};
