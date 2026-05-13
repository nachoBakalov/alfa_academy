const coachGroupService = require('../services/coachGroup.service');
const {
  groupIdParamSchema,
  groupCoachParamsSchema,
  assignCoachSchema,
  updateCoachAssignmentSchema,
} = require('../validations/coachGroup.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listCoachesForGroup(req, res) {
  const { id } = groupIdParamSchema.parse(req.params);
  const result = await coachGroupService.listCoachesForGroup(id, req.user);
  res.status(200).json(result);
}

async function assignCoachToGroup(req, res) {
  const { id } = groupIdParamSchema.parse(req.params);
  const payload = assignCoachSchema.parse(req.body);
  const result = await coachGroupService.assignCoachToGroup(
    id,
    payload,
    getRequestContext(req)
  );

  res.status(201).json(result);
}

async function updateCoachAssignment(req, res) {
  const { id, coachId } = groupCoachParamsSchema.parse(req.params);
  const payload = updateCoachAssignmentSchema.parse(req.body);
  const result = await coachGroupService.updateCoachAssignment(
    id,
    coachId,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function unassignCoachFromGroup(req, res) {
  const { id, coachId } = groupCoachParamsSchema.parse(req.params);
  const result = await coachGroupService.unassignCoachFromGroup(
    id,
    coachId,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

module.exports = {
  listCoachesForGroup,
  assignCoachToGroup,
  updateCoachAssignment,
  unassignCoachFromGroup,
};
