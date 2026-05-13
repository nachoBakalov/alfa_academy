const AppError = require('../utils/AppError');
const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');

async function authenticate(req, res, next) {
  try {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
      throw new AppError(401, 'Unauthorized');
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'Unauthorized');
    }

    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      throw new AppError(401, 'Unauthorized');
    }

    const userId = Number(payload.sub);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const user = await userRepository.findByIdWithRole(userId);

    if (!user || !user.is_active) {
      throw new AppError(401, 'Unauthorized');
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role_code,
    };

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authenticate;