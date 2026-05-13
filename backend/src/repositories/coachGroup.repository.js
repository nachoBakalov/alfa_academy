const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function listCoachesForGroup(groupId) {
  const query = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.phone,
      cg.is_primary,
      cg.assigned_at,
      cg.unassigned_at
    FROM coach_groups cg
    INNER JOIN users u ON u.id = cg.coach_id
    INNER JOIN roles r ON r.id = u.role_id
    WHERE cg.group_id = $1
      AND cg.unassigned_at IS NULL
      AND r.code = 'coach'
    ORDER BY cg.is_primary DESC, cg.assigned_at ASC
  `;

  const { rows } = await pool.query(query, [groupId]);
  return rows;
}

async function findActiveAssignment(groupId, coachId) {
  const query = `
    SELECT
      id,
      group_id,
      coach_id,
      is_primary,
      assigned_at,
      unassigned_at
    FROM coach_groups
    WHERE group_id = $1
      AND coach_id = $2
      AND unassigned_at IS NULL
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [groupId, coachId]);
  return rows[0] || null;
}

async function assignCoachToGroup(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO coach_groups (coach_id, group_id, is_primary, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, group_id, coach_id, is_primary, assigned_at, unassigned_at
  `;

  const values = [data.coachId, data.groupId, data.isPrimary, data.createdBy || null];
  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function updateAssignmentPrimary(groupId, coachId, isPrimary, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE coach_groups
    SET is_primary = $3
    WHERE group_id = $1
      AND coach_id = $2
      AND unassigned_at IS NULL
    RETURNING id, group_id, coach_id, is_primary, assigned_at, unassigned_at
  `;

  const { rows } = await executor.query(query, [groupId, coachId, isPrimary]);
  return rows[0] || null;
}

async function clearPrimaryCoachForGroup(groupId, exceptCoachId, client) {
  const executor = getExecutor(client);

  const values = [groupId];
  let exceptCondition = '';

  if (exceptCoachId !== undefined && exceptCoachId !== null) {
    values.push(exceptCoachId);
    exceptCondition = ` AND coach_id <> $${values.length}`;
  }

  const query = `
    UPDATE coach_groups
    SET is_primary = FALSE
    WHERE group_id = $1
      AND unassigned_at IS NULL
      ${exceptCondition}
  `;

  await executor.query(query, values);
}

async function unassignCoachFromGroup(groupId, coachId) {
  const query = `
    UPDATE coach_groups
    SET unassigned_at = NOW(),
        is_primary = FALSE
    WHERE group_id = $1
      AND coach_id = $2
      AND unassigned_at IS NULL
    RETURNING id, group_id, coach_id, is_primary, assigned_at, unassigned_at
  `;

  const { rows } = await pool.query(query, [groupId, coachId]);
  return rows[0] || null;
}

async function findActiveGroupsForCoach(coachId) {
  const query = `
    SELECT
      g.id,
      g.season_id,
      g.name,
      g.is_active
    FROM coach_groups cg
    INNER JOIN groups g ON g.id = cg.group_id
    WHERE cg.coach_id = $1
      AND cg.unassigned_at IS NULL
    ORDER BY g.name ASC
  `;

  const { rows } = await pool.query(query, [coachId]);
  return rows;
}

module.exports = {
  listCoachesForGroup,
  findActiveAssignment,
  assignCoachToGroup,
  updateAssignmentPrimary,
  clearPrimaryCoachForGroup,
  unassignCoachFromGroup,
  findActiveGroupsForCoach,
};
