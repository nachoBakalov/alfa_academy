const userService = require('../services/user.service');
const {
  listUsersQuerySchema,
  userIdParamSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  updateUserStatusSchema,
} = require('../validations/user.validation');

function getRequestContext(req) {
  return {
    actor: req.user,
    ipAddress: req.ip,
    userAgent: req.get('user-agent') || null,
  };
}

async function listUsers(req, res) {
  const filters = listUsersQuerySchema.parse(req.query);
  const result = await userService.listUsers(filters, req.user);
  res.status(200).json(result);
}

async function getUserById(req, res) {
  const { id } = userIdParamSchema.parse(req.params);
  const user = await userService.getUserById(id, req.user);
  res.status(200).json({ user });
}

async function createUser(req, res) {
  const payload = createUserSchema.parse(req.body);
  const user = await userService.createUser(payload, getRequestContext(req));
  res.status(201).json({ user });
}

async function updateUser(req, res) {
  const { id } = userIdParamSchema.parse(req.params);
  const payload = updateUserSchema.parse(req.body);
  const user = await userService.updateUser(id, payload, getRequestContext(req));
  res.status(200).json({ user });
}

async function resetUserPassword(req, res) {
  const { id } = userIdParamSchema.parse(req.params);
  const payload = resetPasswordSchema.parse(req.body);
  const result = await userService.resetUserPassword(
    id,
    payload,
    getRequestContext(req)
  );

  res.status(200).json(result);
}

async function updateUserStatus(req, res) {
  const { id } = userIdParamSchema.parse(req.params);
  const payload = updateUserStatusSchema.parse(req.body);
  const user = await userService.updateUserStatus(
    id,
    payload,
    getRequestContext(req)
  );

  res.status(200).json({ user });
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  updateUserStatus,
};
