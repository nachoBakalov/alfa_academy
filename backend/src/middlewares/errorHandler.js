const { ZodError } = require('zod');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }

  const response = { message };

  if (errors) {
    response.errors = errors;
  }

  if (env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
