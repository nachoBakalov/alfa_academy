const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function listActiveAcademiesForCoach(coachId) {
  const query = `
    SELECT
      a.id,
      a.name,
      ca.assigned_at
    FROM coach_academies ca
    INNER JOIN academies a ON a.id = ca.academy_id
    WHERE ca.coach_id = $1
      AND ca.unassigned_at IS NULL
    ORDER BY a.name ASC, a.id ASC
  `;

  const { rows } = await pool.query(query, [coachId]);
  return rows;
}

async function listActiveCoachesForAcademy(academyId) {
  const query = `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      ca.assigned_at
    FROM coach_academies ca
    INNER JOIN users u ON u.id = ca.coach_id
    INNER JOIN roles r ON r.id = u.role_id
    WHERE ca.academy_id = $1
      AND ca.unassigned_at IS NULL
      AND u.is_active = TRUE
      AND r.code = 'coach'
    ORDER BY u.first_name ASC, u.last_name ASC, u.id ASC
  `;

  const { rows } = await pool.query(query, [academyId]);
  return rows;
}

async function findActiveAssignment(coachId, academyId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      coach_id,
      academy_id,
      assigned_at,
      unassigned_at,
      created_by,
      created_at
    FROM coach_academies
    WHERE coach_id = $1
      AND academy_id = $2
      AND unassigned_at IS NULL
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [coachId, academyId]);
  return rows[0] || null;
}

async function assignCoachToAcademy(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO coach_academies (coach_id, academy_id, created_by)
    VALUES ($1, $2, $3)
    RETURNING id, coach_id, academy_id, assigned_at, unassigned_at, created_by, created_at
  `;

  const values = [data.coachId, data.academyId, data.createdBy || null];
  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function ensureActiveAssignment(data, client) {
  const existing = await findActiveAssignment(data.coachId, data.academyId, client);

  if (existing) {
    return existing;
  }

  return assignCoachToAcademy(data, client);
}

async function unassignCoachFromAcademy(coachId, academyId, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE coach_academies
    SET unassigned_at = NOW()
    WHERE coach_id = $1
      AND academy_id = $2
      AND unassigned_at IS NULL
    RETURNING id, coach_id, academy_id, assigned_at, unassigned_at, created_by, created_at
  `;

  const { rows } = await executor.query(query, [coachId, academyId]);
  return rows[0] || null;
}

module.exports = {
  listActiveAcademiesForCoach,
  listActiveCoachesForAcademy,
  findActiveAssignment,
  assignCoachToAcademy,
  ensureActiveAssignment,
  unassignCoachFromAcademy,
};
