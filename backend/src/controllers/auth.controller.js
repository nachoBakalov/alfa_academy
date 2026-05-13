const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const { loginSchema } = require('../validations/auth.validation');

async function login(req, res) {
  const payload = loginSchema.parse(req.body);
  const result = await authService.login(payload);

  res.status(200).json(result);
}

async function me(req, res) {
  const user = userService.getCurrentUser(req.user);
  res.status(200).json({ user });
}

module.exports = {
  login,
  me,
};