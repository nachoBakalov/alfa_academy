const { pool } = require('../db/postgres');

async function findByCode(code) {
  const query = `
    SELECT id, code, name, description, created_at
    FROM roles
    WHERE code = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [code]);
  return rows[0] || null;
}

async function listRoles() {
  const query = `
    SELECT id, code, name, description, created_at
    FROM roles
    ORDER BY id ASC
  `;

  const { rows } = await pool.query(query);
  return rows;
}

module.exports = {
  findByCode,
  listRoles,
};
