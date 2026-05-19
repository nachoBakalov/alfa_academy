const AppError = require('../utils/AppError');
const { env } = require('./env');

const helmetOptions = {};

function buildCorsOptions() {
  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError(403, 'Origin is not allowed'));
    },
    credentials: false,
  };
}

module.exports = {
  helmetOptions,
  buildCorsOptions,
};
