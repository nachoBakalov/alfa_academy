const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error('Boolean environment values must be "true" or "false"');
}

function parseInteger(value, fallback, fieldName, { min, max } = {}) {
  const parsed = Number(value ?? fallback);

  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  if (min !== undefined && parsed < min) {
    throw new Error(`${fieldName} must be greater than or equal to ${min}`);
  }

  if (max !== undefined && parsed > max) {
    throw new Error(`${fieldName} must be less than or equal to ${max}`);
  }

  return parsed;
}

function parseCorsOrigins(value, nodeEnv) {
  const fallbackOrigins = nodeEnv === 'production' ? '' : 'http://localhost:5173';
  const source = value ?? fallbackOrigins;

  return source
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseString(value, fallback = '') {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value).trim();
}

function isLocalhostUrl(value) {
  try {
    const parsed = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch (_error) {
    return false;
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'change_me';
const databaseUrlFromEnv = process.env.DATABASE_URL;
const databaseUrl =
  databaseUrlFromEnv || 'postgresql://postgres:postgres@localhost:5432/academy_app';

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS, nodeEnv);
const trustProxy = parseBoolean(process.env.TRUST_PROXY, false);

const port = parseInteger(process.env.PORT, 3001, 'PORT', { min: 1 });
const bcryptSaltRounds = parseInteger(
  process.env.BCRYPT_SALT_ROUNDS,
  10,
  'BCRYPT_SALT_ROUNDS',
  { min: 1 }
);
const questionnaireTokenExpiresDays = parseInteger(
  process.env.QUESTIONNAIRE_TOKEN_EXPIRES_DAYS,
  30,
  'QUESTIONNAIRE_TOKEN_EXPIRES_DAYS',
  { min: 1, max: 90 }
);
const rateLimitWindowMs = parseInteger(
  process.env.RATE_LIMIT_WINDOW_MS,
  900000,
  'RATE_LIMIT_WINDOW_MS',
  { min: 1000 }
);
const defaultRateLimitMax = nodeEnv === 'production' ? 300 : 3000;
const rateLimitMax = parseInteger(process.env.RATE_LIMIT_MAX, defaultRateLimitMax, 'RATE_LIMIT_MAX', {
  min: 1,
});
const authRateLimitWindowMs = parseInteger(
  process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  900000,
  'AUTH_RATE_LIMIT_WINDOW_MS',
  { min: 1000 }
);
const authRateLimitMax = parseInteger(
  process.env.AUTH_RATE_LIMIT_MAX,
  20,
  'AUTH_RATE_LIMIT_MAX',
  { min: 1 }
);
const publicQuestionnaireRateLimitWindowMs = parseInteger(
  process.env.PUBLIC_QUESTIONNAIRE_RATE_LIMIT_WINDOW_MS,
  900000,
  'PUBLIC_QUESTIONNAIRE_RATE_LIMIT_WINDOW_MS',
  { min: 1000 }
);
const publicQuestionnaireRateLimitMax = parseInteger(
  process.env.PUBLIC_QUESTIONNAIRE_RATE_LIMIT_MAX,
  60,
  'PUBLIC_QUESTIONNAIRE_RATE_LIMIT_MAX',
  { min: 1 }
);
const disableRateLimits = parseBoolean(process.env.DISABLE_RATE_LIMITS, false);
const publicAppUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
const emailEnabled = parseBoolean(process.env.EMAIL_ENABLED, false);
const emailProvider = parseString(process.env.EMAIL_PROVIDER, 'smtp') || 'smtp';
const smtpHost = parseString(process.env.SMTP_HOST, '');
const smtpPort = parseInteger(process.env.SMTP_PORT, 465, 'SMTP_PORT', {
  min: 1,
  max: 65535,
});
const smtpSecure = parseBoolean(process.env.SMTP_SECURE, true);
const smtpUser = parseString(process.env.SMTP_USER, '');
const smtpPass = parseString(process.env.SMTP_PASS, '');
const emailFromName = parseString(process.env.EMAIL_FROM_NAME, 'Лятна академия');
const emailFromAddress = parseString(process.env.EMAIL_FROM_ADDRESS, '');
const emailReplyTo = parseString(process.env.EMAIL_REPLY_TO, '');
const emailTestRecipient = parseString(process.env.EMAIL_TEST_RECIPIENT, '');

if (nodeEnv === 'production' && jwtAccessSecret === 'change_me') {
  throw new Error(
    'JWT_ACCESS_SECRET must be set in production and must not be change_me'
  );
}

if (nodeEnv === 'production' && !databaseUrlFromEnv) {
  throw new Error('DATABASE_URL must be provided from environment in production');
}

if (nodeEnv === 'production' && corsOrigins.length === 0) {
  throw new Error('CORS_ORIGINS must contain at least one origin in production');
}

if (nodeEnv === 'production' && isLocalhostUrl(publicAppUrl)) {
  throw new Error('PUBLIC_APP_URL must not use localhost in production');
}

if (emailProvider !== 'smtp') {
  throw new Error('EMAIL_PROVIDER must be smtp');
}

if (nodeEnv === 'production' && emailEnabled) {
  const missingFields = [];

  if (!smtpHost) {
    missingFields.push('SMTP_HOST');
  }

  if (!parseString(process.env.SMTP_PORT, '')) {
    missingFields.push('SMTP_PORT');
  }

  if (!smtpUser) {
    missingFields.push('SMTP_USER');
  }

  if (!smtpPass) {
    missingFields.push('SMTP_PASS');
  }

  if (!emailFromAddress) {
    missingFields.push('EMAIL_FROM_ADDRESS');
  }

  if (missingFields.length > 0) {
    throw new Error(`EMAIL_ENABLED=true requires: ${missingFields.join(', ')}`);
  }
}

const env = {
  NODE_ENV: nodeEnv,
  PORT: port,
  DATABASE_URL: databaseUrl,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
  BCRYPT_SALT_ROUNDS: bcryptSaltRounds,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || '',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || '',
  SUPER_ADMIN_FIRST_NAME: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
  SUPER_ADMIN_LAST_NAME: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
  PUBLIC_APP_URL: publicAppUrl,
  QUESTIONNAIRE_TOKEN_EXPIRES_DAYS: questionnaireTokenExpiresDays,
  CORS_ORIGINS: corsOrigins,
  TRUST_PROXY: trustProxy,
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT || '1mb',
  DISABLE_RATE_LIMITS: disableRateLimits,
  RATE_LIMIT_WINDOW_MS: rateLimitWindowMs,
  RATE_LIMIT_MAX: rateLimitMax,
  AUTH_RATE_LIMIT_WINDOW_MS: authRateLimitWindowMs,
  AUTH_RATE_LIMIT_MAX: authRateLimitMax,
  PUBLIC_QUESTIONNAIRE_RATE_LIMIT_WINDOW_MS: publicQuestionnaireRateLimitWindowMs,
  PUBLIC_QUESTIONNAIRE_RATE_LIMIT_MAX: publicQuestionnaireRateLimitMax,
  EMAIL_ENABLED: emailEnabled,
  EMAIL_PROVIDER: emailProvider,
  SMTP_HOST: smtpHost,
  SMTP_PORT: smtpPort,
  SMTP_SECURE: smtpSecure,
  SMTP_USER: smtpUser,
  SMTP_PASS: smtpPass,
  EMAIL_FROM_NAME: emailFromName,
  EMAIL_FROM_ADDRESS: emailFromAddress,
  EMAIL_REPLY_TO: emailReplyTo,
  EMAIL_TEST_RECIPIENT: emailTestRecipient,
};

module.exports = { env };
