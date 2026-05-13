const { pool } = require('../db/postgres');

function buildFilters(filters) {
  const conditions = [];
  const values = [];

  if (filters.role) {
    values.push(filters.role);
    conditions.push(`r.code = $${values.length}`);
  }

  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`u.is_active = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(
      `(u.email ILIKE ${placeholder} OR u.first_name ILIKE ${placeholder} OR u.last_name ILIKE ${placeholder})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    whereClause,
    values,
  };
}

async function findByEmail(email) {
  const query = `
    SELECT
      u.id,
      u.role_id,
      u.email,
      u.password_hash,
      u.first_name,
      u.last_name,
      u.phone,
      u.is_active,
      u.last_login_at,
      u.created_at,
      u.updated_at,
      r.code AS role_code
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE LOWER(u.email) = LOWER($1)
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

async function findByIdWithRole(id) {
  const query = `
    SELECT
      u.id,
      u.role_id,
      u.email,
      u.password_hash,
      u.first_name,
      u.last_name,
      u.phone,
      u.is_active,
      u.last_login_at,
      u.created_at,
      u.updated_at,
      r.code AS role_code
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function createUser(data) {
  const query = `
    INSERT INTO users (
      role_id,
      email,
      password_hash,
      first_name,
      last_name,
      phone,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, role_id, email, first_name, last_name, phone, is_active, created_at, updated_at
  `;

  const values = [
    data.roleId,
    data.email,
    data.passwordHash,
    data.firstName,
    data.lastName,
    data.phone || null,
    data.isActive !== undefined ? data.isActive : true,
  ];

  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function listUsers(filters) {
  const { whereClause, values } = buildFilters(filters);

  const query = `
    SELECT
      u.id,
      u.role_id,
      u.email,
      u.first_name,
      u.last_name,
      u.phone,
      u.is_active,
      u.created_at,
      u.updated_at,
      r.code AS role_code
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    ${whereClause}
    ORDER BY u.created_at DESC, u.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const queryValues = [...values, filters.limit, filters.offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countUsers(filters) {
  const { whereClause, values } = buildFilters(filters);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    ${whereClause}
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] ? rows[0].total : 0;
}

async function updateUser(id, data) {
  const updates = [];
  const values = [];

  if (data.roleId !== undefined) {
    values.push(data.roleId);
    updates.push(`role_id = $${values.length}`);
  }

  if (data.email !== undefined) {
    values.push(data.email);
    updates.push(`email = $${values.length}`);
  }

  if (data.firstName !== undefined) {
    values.push(data.firstName);
    updates.push(`first_name = $${values.length}`);
  }

  if (data.lastName !== undefined) {
    values.push(data.lastName);
    updates.push(`last_name = $${values.length}`);
  }

  if (data.phone !== undefined) {
    values.push(data.phone);
    updates.push(`phone = $${values.length}`);
  }

  if (updates.length === 0) {
    return findByIdWithRole(id);
  }

  values.push(id);

  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id
  `;

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithRole(id);
}

async function updatePassword(id, passwordHash) {
  const query = `
    UPDATE users
    SET password_hash = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [passwordHash, id]);
  return rows[0] || null;
}

async function updateStatus(id, isActive) {
  const query = `
    UPDATE users
    SET is_active = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [isActive, id]);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithRole(id);
}

module.exports = {
  listUsers,
  countUsers,
  findByEmail,
  findByIdWithRole,
  createUser,
  updateUser,
  updatePassword,
  updateStatus,
};