const { pool } = require('../db/postgres');

function buildGroupFilters(filters, actor) {
  const joins = [
    'INNER JOIN seasons s ON s.id = g.season_id',
    'INNER JOIN academies a ON a.id = s.academy_id',
  ];
  const conditions = [];
  const values = [];

  if (filters.seasonId !== undefined) {
    values.push(filters.seasonId);
    conditions.push(`g.season_id = $${values.length}`);
  }

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`s.academy_id = $${values.length}`);
  }

  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`g.is_active = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(
      `(g.name ILIKE ${placeholder} OR COALESCE(g.description, '') ILIKE ${placeholder})`
    );
  }

  if (actor.role === 'coach') {
    joins.push(
      'INNER JOIN coach_groups cg_actor ON cg_actor.group_id = g.id AND cg_actor.unassigned_at IS NULL'
    );
    values.push(actor.id);
    conditions.push(`cg_actor.coach_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    joins,
    whereClause,
    values,
  };
}

async function listGroups(filters, actor) {
  const { joins, whereClause, values } = buildGroupFilters(filters, actor);

  const query = `
    SELECT DISTINCT
      g.id,
      g.season_id,
      g.name,
      g.description,
      g.age_min,
      g.age_max,
      g.capacity,
      g.is_active,
      g.created_at,
      g.updated_at,
      s.id AS season_id_ref,
      s.name AS season_name,
      a.id AS academy_id,
      a.name AS academy_name
    FROM groups g
    ${joins.join('\n')}
    ${whereClause}
    ORDER BY g.created_at DESC, g.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const queryValues = [...values, filters.limit, filters.offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countGroups(filters, actor) {
  const { joins, whereClause, values } = buildGroupFilters(filters, actor);

  const query = `
    SELECT COUNT(DISTINCT g.id)::int AS total
    FROM groups g
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
      season_id,
      name,
      description,
      age_min,
      age_max,
      capacity,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM groups
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByIdWithSeasonAndAcademy(id) {
  const query = `
    SELECT
      g.id,
      g.season_id,
      g.name,
      g.description,
      g.age_min,
      g.age_max,
      g.capacity,
      g.is_active,
      g.created_by,
      g.created_at,
      g.updated_at,
      s.name AS season_name,
      s.is_active AS season_is_active,
      a.id AS academy_id,
      a.name AS academy_name,
      a.is_active AS academy_is_active
    FROM groups g
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE g.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findBySeasonAndName(seasonId, name) {
  const query = `
    SELECT
      id,
      season_id,
      name,
      description,
      age_min,
      age_max,
      capacity,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM groups
    WHERE season_id = $1
      AND LOWER(name) = LOWER($2)
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [seasonId, name]);
  return rows[0] || null;
}

async function createGroup(data) {
  const query = `
    INSERT INTO groups (
      season_id,
      name,
      description,
      age_min,
      age_max,
      capacity,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id
  `;

  const values = [
    data.seasonId,
    data.name,
    data.description || null,
    data.ageMin ?? null,
    data.ageMax ?? null,
    data.capacity ?? null,
    data.createdBy || null,
  ];

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithSeasonAndAcademy(rows[0].id);
}

async function updateGroup(id, data) {
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

  if (data.ageMin !== undefined) {
    values.push(data.ageMin);
    updates.push(`age_min = $${values.length}`);
  }

  if (data.ageMax !== undefined) {
    values.push(data.ageMax);
    updates.push(`age_max = $${values.length}`);
  }

  if (data.capacity !== undefined) {
    values.push(data.capacity);
    updates.push(`capacity = $${values.length}`);
  }

  if (updates.length === 0) {
    return findByIdWithSeasonAndAcademy(id);
  }

  values.push(id);

  const query = `
    UPDATE groups
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id
  `;

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithSeasonAndAcademy(id);
}

async function updateStatus(id, isActive) {
  const query = `
    UPDATE groups
    SET is_active = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [isActive, id]);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithSeasonAndAcademy(id);
}

async function coachCanAccessGroup(coachId, groupId) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM coach_groups cg
      WHERE cg.coach_id = $1
        AND cg.group_id = $2
        AND cg.unassigned_at IS NULL
    ) AS can_access
  `;

  const { rows } = await pool.query(query, [coachId, groupId]);
  return rows[0] ? rows[0].can_access : false;
}

module.exports = {
  listGroups,
  countGroups,
  findById,
  findByIdWithSeasonAndAcademy,
  findBySeasonAndName,
  createGroup,
  updateGroup,
  updateStatus,
  coachCanAccessGroup,
};
