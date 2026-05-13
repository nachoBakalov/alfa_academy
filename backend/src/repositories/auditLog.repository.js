const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function createAuditLog(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO audit_logs (
      actor_user_id,
      entity_type,
      entity_id,
      action,
      metadata,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
    RETURNING id
  `;

  const values = [
    data.actorUserId || null,
    data.entityType,
    data.entityId || null,
    data.action,
    JSON.stringify(data.metadata || {}),
    data.ipAddress || null,
    data.userAgent || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

module.exports = {
  createAuditLog,
};
