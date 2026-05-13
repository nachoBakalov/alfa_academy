const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

function buildChildrenFilters(filters, actor) {
  const joins = [
    'LEFT JOIN child_group_assignments cga ON cga.child_id = c.id AND cga.ends_on IS NULL',
    'LEFT JOIN groups g ON g.id = cga.group_id',
  ];
  const conditions = [];
  const values = [];

  if (filters.groupId !== undefined) {
    values.push(filters.groupId);
    conditions.push(`cga.group_id = $${values.length}`);
  }

  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`c.is_active = $${values.length}`);
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(
      `(c.first_name ILIKE ${placeholder} OR c.last_name ILIKE ${placeholder} OR COALESCE(c.parent_name, '') ILIKE ${placeholder})`
    );
  }

  if (actor.role === 'coach') {
    joins.push(
      'INNER JOIN coach_groups cg ON cg.group_id = cga.group_id AND cg.unassigned_at IS NULL'
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

async function listChildren(filters, actor) {
  const { joins, whereClause, values } = buildChildrenFilters(filters, actor);

  const query = `
    SELECT DISTINCT
      c.id,
      c.first_name,
      c.last_name,
      c.birth_date,
      c.gender,
      c.parent_name,
      c.parent_email,
      c.parent_phone,
      c.is_active,
      c.created_at,
      c.updated_at,
      g.id AS current_group_id,
      g.name AS current_group_name,
      qt.status AS questionnaire_status,
      qt.expires_at AS questionnaire_expires_at,
      qt.token AS questionnaire_token
    FROM children c
    ${joins.join('\n')}
    LEFT JOIN LATERAL (
      SELECT q.token, q.status, q.expires_at, q.created_at
      FROM questionnaire_tokens q
      WHERE q.child_id = c.id
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT 1
    ) qt ON TRUE
    ${whereClause}
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const queryValues = [...values, filters.limit, filters.offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countChildren(filters, actor) {
  const { joins, whereClause, values } = buildChildrenFilters(filters, actor);

  const query = `
    SELECT COUNT(DISTINCT c.id)::int AS total
    FROM children c
    ${joins.join('\n')}
    ${whereClause}
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] ? rows[0].total : 0;
}

async function findById(id) {
  const query = `
    SELECT
      c.id,
      c.first_name,
      c.last_name,
      c.birth_date,
      c.gender,
      c.parent_name,
      c.parent_email,
      c.parent_phone,
      c.medical_notes,
      c.general_notes,
      c.is_active,
      c.created_by,
      c.created_at,
      c.updated_at
    FROM children c
    WHERE c.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function findByIdWithCurrentGroup(id) {
  const query = `
    SELECT
      c.id,
      c.first_name,
      c.last_name,
      c.birth_date,
      c.gender,
      c.parent_name,
      c.parent_email,
      c.parent_phone,
      c.medical_notes,
      c.general_notes,
      c.is_active,
      c.created_by,
      c.created_at,
      c.updated_at,
      g.id AS current_group_id,
      g.name AS current_group_name,
      qt.status AS questionnaire_status,
      qt.expires_at AS questionnaire_expires_at,
      qt.token AS questionnaire_token
    FROM children c
    LEFT JOIN child_group_assignments cga
      ON cga.child_id = c.id
      AND cga.ends_on IS NULL
    LEFT JOIN groups g ON g.id = cga.group_id
    LEFT JOIN LATERAL (
      SELECT q.token, q.status, q.expires_at, q.created_at
      FROM questionnaire_tokens q
      WHERE q.child_id = c.id
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT 1
    ) qt ON TRUE
    WHERE c.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [id]);
  return rows[0] || null;
}

async function createChild(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO children (
      first_name,
      last_name,
      birth_date,
      gender,
      parent_name,
      parent_email,
      parent_phone,
      medical_notes,
      general_notes,
      is_active,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
    RETURNING id
  `;

  const values = [
    data.firstName,
    data.lastName,
    data.birthDate || null,
    data.gender || null,
    data.parentName || null,
    data.parentEmail || null,
    data.parentPhone || null,
    data.medicalNotes || null,
    data.generalNotes || null,
    data.createdBy || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function updateChild(id, data) {
  const updates = [];
  const values = [];

  if (data.firstName !== undefined) {
    values.push(data.firstName);
    updates.push(`first_name = $${values.length}`);
  }

  if (data.lastName !== undefined) {
    values.push(data.lastName);
    updates.push(`last_name = $${values.length}`);
  }

  if (data.birthDate !== undefined) {
    values.push(data.birthDate);
    updates.push(`birth_date = $${values.length}`);
  }

  if (data.gender !== undefined) {
    values.push(data.gender);
    updates.push(`gender = $${values.length}`);
  }

  if (data.parentName !== undefined) {
    values.push(data.parentName);
    updates.push(`parent_name = $${values.length}`);
  }

  if (data.parentEmail !== undefined) {
    values.push(data.parentEmail);
    updates.push(`parent_email = $${values.length}`);
  }

  if (data.parentPhone !== undefined) {
    values.push(data.parentPhone);
    updates.push(`parent_phone = $${values.length}`);
  }

  if (data.medicalNotes !== undefined) {
    values.push(data.medicalNotes);
    updates.push(`medical_notes = $${values.length}`);
  }

  if (data.generalNotes !== undefined) {
    values.push(data.generalNotes);
    updates.push(`general_notes = $${values.length}`);
  }

  if (updates.length === 0) {
    return findByIdWithCurrentGroup(id);
  }

  values.push(id);

  const query = `
    UPDATE children
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id
  `;

  const { rows } = await pool.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithCurrentGroup(id);
}

async function updateStatus(id, isActive) {
  const query = `
    UPDATE children
    SET is_active = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await pool.query(query, [isActive, id]);

  if (!rows[0]) {
    return null;
  }

  return findByIdWithCurrentGroup(id);
}

async function assignChildToGroup(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO child_group_assignments (
      child_id,
      group_id,
      starts_on,
      created_by
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id, child_id, group_id, starts_on, ends_on, created_at
  `;

  const values = [data.childId, data.groupId, data.startsOn, data.createdBy || null];
  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function userCanAccessChild(actorUserId, childId) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM child_group_assignments cga
      INNER JOIN coach_groups cg
        ON cg.group_id = cga.group_id
        AND cg.unassigned_at IS NULL
      WHERE cga.child_id = $1
        AND cga.ends_on IS NULL
        AND cg.coach_id = $2
    ) AS can_access
  `;

  const { rows } = await pool.query(query, [childId, actorUserId]);
  return rows[0] ? rows[0].can_access : false;
}

async function userCanAccessGroup(actorUserId, groupId) {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM coach_groups cg
      WHERE cg.group_id = $1
        AND cg.coach_id = $2
        AND cg.unassigned_at IS NULL
    ) AS can_access
  `;

  const { rows } = await pool.query(query, [groupId, actorUserId]);
  return rows[0] ? rows[0].can_access : false;
}

module.exports = {
  listChildren,
  countChildren,
  findById,
  findByIdWithCurrentGroup,
  createChild,
  updateChild,
  updateStatus,
  assignChildToGroup,
  userCanAccessChild,
  userCanAccessGroup,
};
