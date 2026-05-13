const { pool } = require('../db/postgres');

function buildSeasonFilters(filters, actor) {
  const joins = ['INNER JOIN academies a ON a.id = s.academy_id'];
  const conditions = [];
  const values = [];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`s.academy_id = $${values.length}`);
  }

  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`s.is_active = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(`s.name ILIKE ${placeholder}`);
  }

  if (actor.role === 'coach') {
    joins.push(
      'INNER JOIN groups g ON g.season_id = s.id',
      'INNER JOIN coach_groups cg ON cg.group_id = g.id AND cg.unassigned_at IS NULL'
    );
    values.push(actor.id);
    conditions.push(`cg.coach_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    joins,
    whereClause,
    values,
  };
}

async function listSeasons(filters, actor) {
  const { joins, whereClause, values } = buildSeasonFilters(filters, actor);

  const query = `
    SELECT DISTINCT
      s.id,
      s.academy_id,
      s.name,
      s.starts_on,
      s.ends_on,
      s.is_active,
      s.created_at,
      s.updated_at,
      a.name AS academy_name
    FROM seasons s
    ${joins.join('\n')}
    ${whereClause}
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const queryValues = [...values, filters.limit, filters.offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countSeasons(filters, actor) {
  const { joins, whereClause, values } = buildSeasonFilters(filters, actor);

  const query = `
    SELECT COUNT(DISTINCT s.id)::int AS total
    FROM seasons s
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
      academy_id,
      name,
      starts_on,
      ends_on,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM seasons
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByIdWithAcademy(id) {
  const query = `
    SELECT
      s.id,
      s.academy_id,
      s.name,
      s.starts_on,
      s.ends_on,
      s.is_active,
      s.created_by,
      s.created_at,
      s.updated_at,
      a.name AS academy_name,
      a.is_active AS academy_is_active
    FROM seasons s
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE s.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByAcademyAndName(academyId, name) {
  const query = `
    SELECT
      id,
      academy_id,
      name,
      starts_on,
      ends_on,
      is_active,
      created_by,
      created_at,
      updated_at
    FROM seasons
    WHERE academy_id = $1
      AND LOWER(name) = LOWER($2)
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [academyId, name]);
  return rows[0] || null;
}

async function createSeason(data) {
  const query = `
    INSERT INTO seasons (
      academy_id,
      name,
      starts_on,
      ends_on,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;

  const values = [
    data.academyId,
    data.name,
    data.startsOn,
    data.endsOn,
    data.createdBy || null,
  ];

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithAcademy(rows[0].id);
}

async function updateSeason(id, data) {
  const updates = [];
  const values = [];

  if (data.name !== undefined) {
    values.push(data.name);
    updates.push(`name = $${values.length}`);
  }

  if (data.startsOn !== undefined) {
    values.push(data.startsOn);
    updates.push(`starts_on = $${values.length}`);
  }

  if (data.endsOn !== undefined) {
    values.push(data.endsOn);
    updates.push(`ends_on = $${values.length}`);
  }

  if (updates.length === 0) {
    return findByIdWithAcademy(id);
  }

  values.push(id);

  const query = `
    UPDATE seasons
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id
  `;

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithAcademy(id);
}

async function updateStatus(id, isActive) {
  const query = `
    UPDATE seasons
    SET is_active = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [isActive, id]);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithAcademy(id);
}

async function coachCanAccessSeason(coachId, seasonId) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM coach_groups cg
      INNER JOIN groups g ON g.id = cg.group_id
      WHERE cg.coach_id = $1
        AND cg.unassigned_at IS NULL
        AND g.season_id = $2
    ) AS can_access
  `;

  const { rows } = await pool.query(query, [coachId, seasonId]);
  return rows[0] ? rows[0].can_access : false;
}

module.exports = {
  listSeasons,
  countSeasons,
  findById,
  findByIdWithAcademy,
  findByAcademyAndName,
  createSeason,
  updateSeason,
  updateStatus,
  coachCanAccessSeason,
};
