const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function createDeliveryLog(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO questionnaire_delivery_logs (
      child_id,
      questionnaire_token_id,
      channel,
      recipient,
      status,
      sent_at,
      error_message,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING
      id,
      child_id,
      questionnaire_token_id,
      channel,
      recipient,
      status,
      sent_at,
      error_message,
      created_at
  `;

  const values = [
    data.childId,
    data.questionnaireTokenId || null,
    data.channel || 'email',
    data.recipient,
    data.status,
    data.sentAt || null,
    data.errorMessage || null,
    data.createdBy || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function getLatestForChild(childId, channel = 'email', client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      child_id,
      questionnaire_token_id,
      channel,
      recipient,
      status,
      sent_at,
      error_message,
      created_at
    FROM questionnaire_delivery_logs
    WHERE child_id = $1
      AND channel = $2
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [childId, channel]);
  return rows[0] || null;
}

async function getLatestForToken(questionnaireTokenId, channel = 'email', client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      child_id,
      questionnaire_token_id,
      channel,
      recipient,
      status,
      sent_at,
      error_message,
      created_at
    FROM questionnaire_delivery_logs
    WHERE questionnaire_token_id = $1
      AND channel = $2
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [questionnaireTokenId, channel]);
  return rows[0] || null;
}

module.exports = {
  createDeliveryLog,
  getLatestForChild,
  getLatestForToken,
};
