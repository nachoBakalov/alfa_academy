const { pool } = require('../db/postgres');

function buildAcademyFilters(filters, actor) {
  const joins = [];
  const conditions = [];
  const values = [];

  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`a.is_active = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(`(a.name ILIKE ${placeholder} OR COALESCE(a.description, '') ILIKE ${placeholder})`);
  }

  if (actor.role === 'coach') {
    values.push(actor.id);
    const coachIdPlaceholder = `$${values.length}`;
    conditions.push(`(
      EXISTS (
        SELECT 1
        FROM coach_academies ca
        WHERE ca.coach_id = ${coachIdPlaceholder}
          AND ca.academy_id = a.id
          AND ca.unassigned_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM coach_groups cg
        INNER JOIN groups g ON g.id = cg.group_id
        INNER JOIN seasons s ON s.id = g.season_id
        WHERE cg.coach_id = ${coachIdPlaceholder}
          AND cg.unassigned_at IS NULL
          AND s.academy_id = a.id
      )
    )`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    joins,
    whereClause,
    values,
  };
}

async function listAcademies(filters, actor) {
  const { joins, whereClause, values } = buildAcademyFilters(filters, actor);

  const query = `
    SELECT DISTINCT
      a.id,
      a.name,
      a.description,
      a.is_active,
      a.created_at,
      a.updated_at
    FROM academies a
    ${joins.join('\n')}
    ${whereClause}
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const queryValues = [...values, filters.limit, filters.offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countAcademies(filters, actor) {
  const { joins, whereClause, values } = buildAcademyFilters(filters, actor);

  const query = `
    SELECT COUNT(DISTINCT a.id)::int AS total
    FROM academies a
    ${joins.join('\n')}
    ${whereClause}
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] ? rows[0].total : 0;
}

async function findById(id) {
  const query = `
    SELECT
      id,
      name,
      description,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM academies
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByName(name) {
  const query = `
    SELECT
      id,
      name,
      description,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM academies
    WHERE LOWER(name) = LOWER($1)
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [name]);
  return rows[0] || null;
}

async function createAcademy(data) {
  const query = `
    INSERT INTO academies (name, description, created_by)
    VALUES ($1, $2, $3)
    RETURNING id, name, description, is_active, created_at, updated_at
  `;

  const values = [data.name, data.description || null, data.createdBy || null];
  const { rows } = await pool.query(query, values);
  return rows[0] || null;
}

async function updateAcademy(id, data) {
  const updates = [];
  const values = [];

  if (data.name !== undefined) {
    values.push(data.name);
    updates.push(`name = $${values.length}`);
  }

  if (data.description !== undefined) {
    values.push(data.description);
    updates.push(`description = $${values.length}`);
  }

  if (updates.length === 0) {
    return findById(id);
  }

  values.push(id);

  const query = `
    UPDATE academies
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id
  `;

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findById(id);
}

async function updateStatus(id, isActive) {
  const query = `
    UPDATE academies
    SET is_active = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [isActive, id]);

  if (!rows[0]) {
    return null;
  }

  return findById(id);
}

async function coachCanAccessAcademy(coachId, academyId) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM coach_academies ca
      WHERE ca.coach_id = $1
        AND ca.academy_id = $2
        AND ca.unassigned_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM coach_groups cg
      INNER JOIN groups g ON g.id = cg.group_id
      INNER JOIN seasons s ON s.id = g.season_id
      WHERE cg.coach_id = $1
        AND cg.unassigned_at IS NULL
        AND s.academy_id = $2
    ) AS can_access
  `;

  const { rows } = await pool.query(query, [coachId, academyId]);
  return rows[0] ? rows[0].can_access : false;
}

function buildAcademyChildrenFilters(academyId, filters = {}) {
  const values = [academyId];
  const conditions = ['TRUE'];

  if (filters.groupId !== undefined) {
    values.push(filters.groupId);
    conditions.push(`cga.group_id = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(`(
      c.first_name ILIKE ${placeholder}
      OR c.last_name ILIKE ${placeholder}
      OR CONCAT(c.first_name, ' ', c.last_name) ILIKE ${placeholder}
    )`);
  }

  return {
    values,
    whereClause: conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '',
  };
}

async function listAcademyChildren(academyId, filters = {}) {
  const { values, whereClause } = buildAcademyChildrenFilters(academyId, filters);

  const query = `
    SELECT
      c.id,
      c.first_name,
      c.last_name,
      c.is_active,
      g.id AS current_group_id,
      g.name AS current_group_name,
      a.id AS academy_id,
      a.name AS academy_name,
      qt.status AS questionnaire_status,
      qt.expires_at AS questionnaire_expires_at
    FROM children c
    INNER JOIN LATERAL (
      SELECT
        cga.child_id,
        cga.group_id
      FROM child_group_assignments cga
      INNER JOIN groups g ON g.id = cga.group_id
      INNER JOIN seasons s ON s.id = g.season_id
      WHERE cga.child_id = c.id
        AND cga.ends_on IS NULL
        AND s.academy_id = $1
      ORDER BY cga.starts_on DESC, cga.id DESC
      LIMIT 1
    ) cga ON TRUE
    INNER JOIN groups g ON g.id = cga.group_id
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    LEFT JOIN LATERAL (
      SELECT qt.status, qt.expires_at
      FROM questionnaire_tokens qt
      WHERE qt.child_id = c.id
      ORDER BY qt.created_at DESC, qt.id DESC
      LIMIT 1
    ) qt ON TRUE
    WHERE a.id = $1
    ${whereClause}
    ORDER BY c.last_name ASC, c.first_name ASC, c.id ASC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const queryValues = [...values, filters.limit, filters.offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countAcademyChildren(academyId, filters = {}) {
  const { values, whereClause } = buildAcademyChildrenFilters(academyId, filters);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM children c
    INNER JOIN LATERAL (
      SELECT
        cga.child_id,
        cga.group_id
      FROM child_group_assignments cga
      INNER JOIN groups g ON g.id = cga.group_id
      INNER JOIN seasons s ON s.id = g.season_id
      WHERE cga.child_id = c.id
        AND cga.ends_on IS NULL
        AND s.academy_id = $1
      ORDER BY cga.starts_on DESC, cga.id DESC
      LIMIT 1
    ) cga ON TRUE
    INNER JOIN groups g ON g.id = cga.group_id
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE a.id = $1
    ${whereClause}
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] ? Number(rows[0].total) : 0;
}

module.exports = {
  listAcademies,
  countAcademies,
  findById,
  findByName,
  createAcademy,
  updateAcademy,
  updateStatus,
  coachCanAccessAcademy,
  listAcademyChildren,
  countAcademyChildren,
};
