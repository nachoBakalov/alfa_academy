const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function createToken(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO questionnaire_tokens (
      child_id,
      token,
      status,
      expires_at,
      created_by
    )
    VALUES ($1, $2, 'pending', $3, $4)
    RETURNING id, child_id, token, status, expires_at, submitted_at, revoked_at, created_at, updated_at
  `;

  const values = [data.childId, data.token, data.expiresAt, data.createdBy || null];
  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function findPendingByChildId(childId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      child_id,
      token,
      status,
      expires_at,
      submitted_at,
      revoked_at,
      created_at,
      updated_at
    FROM questionnaire_tokens
    WHERE child_id = $1
      AND status = 'pending'
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [childId]);
  return rows[0] || null;
}

async function findByToken(token) {
  const query = `
    SELECT
      qt.id,
      qt.child_id,
      qt.token,
      qt.status,
      qt.expires_at,
      qt.submitted_at,
      qt.revoked_at,
      qt.created_at,
      c.first_name AS child_first_name,
      c.last_name AS child_last_name,
      c.is_active AS child_is_active
    FROM questionnaire_tokens qt
    INNER JOIN children c ON c.id = qt.child_id
    WHERE qt.token = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [token]);
  return rows[0] || null;
}

async function findByTokenForUpdate(token, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      qt.id,
      qt.child_id,
      qt.token,
      qt.status,
      qt.expires_at,
      qt.submitted_at,
      qt.revoked_at,
      qt.created_at,
      c.first_name AS child_first_name,
      c.last_name AS child_last_name,
      c.is_active AS child_is_active
    FROM questionnaire_tokens qt
    INNER JOIN children c ON c.id = qt.child_id
    WHERE qt.token = $1
    LIMIT 1
    FOR UPDATE
  `;

  const { rows } = await executor.query(query, [token]);
  return rows[0] || null;
}

async function revokePendingForChild(childId, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE questionnaire_tokens
    SET status = 'revoked',
        revoked_at = NOW()
    WHERE child_id = $1
      AND status = 'pending'
    RETURNING id, child_id, token, status, expires_at, submitted_at, revoked_at, created_at, updated_at
  `;

  const { rows } = await executor.query(query, [childId]);
  return rows;
}

async function markExpired(tokenId, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE questionnaire_tokens
    SET status = 'expired'
    WHERE id = $1
      AND status = 'pending'
    RETURNING id, child_id, token, status, expires_at, submitted_at, revoked_at, created_at, updated_at
  `;

  const { rows } = await executor.query(query, [tokenId]);
  return rows[0] || null;
}

async function markSubmitted(tokenId, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE questionnaire_tokens
    SET status = 'submitted',
        submitted_at = NOW()
    WHERE id = $1
      AND status = 'pending'
    RETURNING id, child_id, token, status, expires_at, submitted_at, revoked_at, created_at, updated_at
  `;

  const { rows } = await executor.query(query, [tokenId]);
  return rows[0] || null;
}

async function getLatestForChild(childId) {
  const query = `
    SELECT
      id,
      child_id,
      token,
      status,
      expires_at,
      submitted_at,
      revoked_at,
      created_at,
      updated_at
    FROM questionnaire_tokens
    WHERE child_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [childId]);
  return rows[0] || null;
}

module.exports = {
  createToken,
  findPendingByChildId,
  findByToken,
  findByTokenForUpdate,
  revokePendingForChild,
  markExpired,
  markSubmitted,
  getLatestForChild,
};
