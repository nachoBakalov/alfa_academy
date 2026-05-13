const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function signAccessToken(user) {
  return jwt.sign(
    { role: user.role },
    env.JWT_ACCESS_SECRET,
    {
      subject: String(user.id),
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};