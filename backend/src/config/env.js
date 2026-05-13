const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'change_me';

if (nodeEnv === 'production' && jwtAccessSecret === 'change_me') {
  throw new Error(
    'JWT_ACCESS_SECRET must be set in production and must not be change_me'
  );
}

const bcryptSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

if (!Number.isInteger(bcryptSaltRounds) || bcryptSaltRounds <= 0) {
  throw new Error('BCRYPT_SALT_ROUNDS must be a positive integer');
}

const questionnaireTokenExpiresDays = Number(
  process.env.QUESTIONNAIRE_TOKEN_EXPIRES_DAYS || 30
);

if (
  !Number.isInteger(questionnaireTokenExpiresDays) ||
  questionnaireTokenExpiresDays < 1 ||
  questionnaireTokenExpiresDays > 90
) {
  throw new Error('QUESTIONNAIRE_TOKEN_EXPIRES_DAYS must be an integer between 1 and 90');
}

const env = {
  NODE_ENV: nodeEnv,
  PORT: Number(process.env.PORT) || 3001,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/academy_app',
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '1d',
  BCRYPT_SALT_ROUNDS: bcryptSaltRounds,
  SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL || '',
  SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD || '',
  SUPER_ADMIN_FIRST_NAME: process.env.SUPER_ADMIN_FIRST_NAME || 'Super',
  SUPER_ADMIN_LAST_NAME: process.env.SUPER_ADMIN_LAST_NAME || 'Admin',
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || 'http://localhost:5173',
  QUESTIONNAIRE_TOKEN_EXPIRES_DAYS: questionnaireTokenExpiresDays,
};

module.exports = { env };
