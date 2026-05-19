const groupService = require('../services/group.service');
const {
  listGroupsQuerySchema,
  groupIdParamSchema,
  createGroupSchema,
  updateGroupSchema,
  updateGroupStatusSchema,
  importChildrenSchema,
} = require('../validations/group.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listGroups(req, res) {
  const filters = listGroupsQuerySchema.parse(req.query);
  const result = await groupService.listGroups(filters, req.user);
  res.status(200).json(result);
}

async function getGroupById(req, res) {
  const { id } = groupIdParamSchema.parse(req.params);
  const group = await groupService.getGroupById(id, req.user);
  res.status(200).json({ group });
}

async function createGroup(req, res) {
  const payload = createGroupSchema.parse(req.body);
  const group = await groupService.createGroup(payload, getRequestContext(req));
  res.status(201).json({ group });
}

async function updateGroup(req, res) {
  const { id } = groupIdParamSchema.parse(req.params);
  const payload = updateGroupSchema.parse(req.body);
  const group = await groupService.updateGroup(id, payload, getRequestContext(req));
  res.status(200).json({ group });
}

async function updateGroupStatus(req, res) {
  const { id } = groupIdParamSchema.parse(req.params);
  const payload = updateGroupStatusSchema.parse(req.body);
  const group = await groupService.updateGroupStatus(id, payload, getRequestContext(req));
  res.status(200).json({ group });
}

async function importChildren(req, res) {
  const { id } = groupIdParamSchema.parse(req.params);
  const payload = importChildrenSchema.parse(req.body);
  const result = await groupService.importChildren(id, payload, getRequestContext(req));
  res.status(200).json(result);
}

module.exports = {
  listGroups,
  getGroupById,
  createGroup,
  updateGroup,
  updateGroupStatus,
  importChildren,
};
