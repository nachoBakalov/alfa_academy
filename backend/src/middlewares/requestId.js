const crypto = require('crypto');

const MAX_REQUEST_ID_LENGTH = 100;

function sanitizeRequestId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_REQUEST_ID_LENGTH);
}

function requestId(req, res, next) {
  const headerRequestId = sanitizeRequestId(req.get('x-request-id'));
  const requestIdValue = headerRequestId || crypto.randomUUID();

  req.id = requestIdValue;
  res.setHeader('x-request-id', requestIdValue);

  next();
}

module.exports = requestId;
