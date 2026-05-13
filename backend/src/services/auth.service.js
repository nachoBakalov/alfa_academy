const AppError = require('../utils/AppError');
const { comparePassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

function toSafeUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role_code,
  };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);

  if (!user || !user.is_active) {
    throw new AppError(401, INVALID_CREDENTIALS_MESSAGE);
  }

  const isPasswordValid = await comparePassword(password, user.password_hash);

  if (!isPasswordValid) {
    throw new AppError(401, INVALID_CREDENTIALS_MESSAGE);
  }

  const safeUser = toSafeUser(user);
  const token = signAccessToken({
    id: safeUser.id,
    role: safeUser.role,
  });

  return {
    token,
    user: safeUser,
  };
}

module.exports = {
  login,
};