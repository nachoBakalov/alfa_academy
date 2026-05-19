const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function listActiveSeasonsForCoach(coachId) {
  const query = `
    SELECT
      s.id,
      s.name,
      s.starts_on,
      s.ends_on,
      s.is_active,
      a.id AS academy_id,
      a.name AS academy_name,
      cs.assigned_at
    FROM coach_seasons cs
    INNER JOIN seasons s ON s.id = cs.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE cs.coach_id = $1
      AND cs.unassigned_at IS NULL
    ORDER BY s.starts_on DESC, s.id DESC
  `;

  const { rows } = await pool.query(query, [coachId]);
  return rows;
}

async function listActiveCoachesForSeason(seasonId) {
  const query = `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      cs.assigned_at
    FROM coach_seasons cs
    INNER JOIN users u ON u.id = cs.coach_id
    INNER JOIN roles r ON r.id = u.role_id
    WHERE cs.season_id = $1
      AND cs.unassigned_at IS NULL
      AND u.is_active = TRUE
      AND r.code = 'coach'
    ORDER BY u.first_name ASC, u.last_name ASC, u.id ASC
  `;

  const { rows } = await pool.query(query, [seasonId]);
  return rows;
}

async function findActiveAssignment(coachId, seasonId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      coach_id,
      season_id,
      assigned_at,
      unassigned_at,
      created_by,
      created_at
    FROM coach_seasons
    WHERE coach_id = $1
      AND season_id = $2
      AND unassigned_at IS NULL
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [coachId, seasonId]);
  return rows[0] || null;
}

async function assignCoachToSeason(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO coach_seasons (coach_id, season_id, created_by)
    VALUES ($1, $2, $3)
    RETURNING id, coach_id, season_id, assigned_at, unassigned_at, created_by, created_at
  `;

  const values = [data.coachId, data.seasonId, data.createdBy || null];
  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function ensureActiveAssignment(data, client) {
  const existing = await findActiveAssignment(data.coachId, data.seasonId, client);

  if (existing) {
    return existing;
  }

  return assignCoachToSeason(data, client);
}

async function unassignCoachFromSeason(coachId, seasonId, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE coach_seasons
    SET unassigned_at = NOW()
    WHERE coach_id = $1
      AND season_id = $2
      AND unassigned_at IS NULL
    RETURNING id, coach_id, season_id, assigned_at, unassigned_at, created_by, created_at
  `;

  const { rows } = await executor.query(query, [coachId, seasonId]);
  return rows[0] || null;
}

async function countActiveGroupAssignments(coachId, seasonId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM coach_groups cg
    INNER JOIN groups g ON g.id = cg.group_id
    WHERE cg.coach_id = $1
      AND g.season_id = $2
      AND cg.unassigned_at IS NULL
  `;

  const { rows } = await executor.query(query, [coachId, seasonId]);
  return rows[0] ? Number(rows[0].total) : 0;
}

module.exports = {
  listActiveSeasonsForCoach,
  listActiveCoachesForSeason,
  findActiveAssignment,
  assignCoachToSeason,
  ensureActiveAssignment,
  unassignCoachFromSeason,
  countActiveGroupAssignments,
};
