const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const TOO_MANY_REQUESTS_MESSAGE = 'Too many requests, please try again later';
const noopLimiter = (_req, _res, next) => next();

function buildLimiter({ windowMs, max, skip }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    handler: (req, res) => {
      const response = {
        message: TOO_MANY_REQUESTS_MESSAGE,
      };

      if (req.id) {
        response.requestId = req.id;
      }

      res.status(429).json(response);
    },
  });
}

const globalApiLimiter = env.DISABLE_RATE_LIMITS
  ? noopLimiter
  : buildLimiter({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      skip: (req) =>
        req.path === '/auth/login' ||
        req.path === '/public/questionnaires' ||
        req.path.startsWith('/public/questionnaires/'),
    });

const authLimiter = env.DISABLE_RATE_LIMITS
  ? noopLimiter
  : buildLimiter({
      windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
      max: env.AUTH_RATE_LIMIT_MAX,
    });

const publicQuestionnaireLimiter = env.DISABLE_RATE_LIMITS
  ? noopLimiter
  : buildLimiter({
      windowMs: env.PUBLIC_QUESTIONNAIRE_RATE_LIMIT_WINDOW_MS,
      max: env.PUBLIC_QUESTIONNAIRE_RATE_LIMIT_MAX,
    });

module.exports = {
  globalApiLimiter,
  authLimiter,
  publicQuestionnaireLimiter,
};
