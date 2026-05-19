const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

function buildChildrenFilters(filters, actor) {
  const conditions = [];
  const values = [];

  const assignmentConditions = ['cga.child_id = c.id', 'cga.ends_on IS NULL'];

  if (filters.groupId !== undefined) {
    values.push(filters.groupId);
    assignmentConditions.push(`cga.group_id = $${values.length}`);
  }

  if (filters.seasonId !== undefined) {
    values.push(filters.seasonId);
    assignmentConditions.push(`cga.season_id = $${values.length}`);
  }

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    assignmentConditions.push(`sg.academy_id = $${values.length}`);
  }

  if (actor.role === 'coach') {
    values.push(actor.id);
    assignmentConditions.push(`EXISTS (
      SELECT 1
      FROM coach_academies ca
      WHERE ca.coach_id = $${values.length}
        AND ca.academy_id = sg.academy_id
        AND ca.unassigned_at IS NULL
    )`);
  }

  const joins = [
    `LEFT JOIN LATERAL (
      SELECT
        cga.child_id,
        cga.group_id,
        cga.season_id,
        g.name AS group_name,
        sg.id AS academy_season_id,
        sg.name AS season_name,
        ag.id AS academy_id,
        ag.name AS academy_name,
        cga.starts_on,
        cga.ends_on
      FROM child_group_assignments cga
      INNER JOIN groups g ON g.id = cga.group_id
      INNER JOIN seasons sg ON sg.id = g.season_id
      INNER JOIN academies ag ON ag.id = sg.academy_id
      WHERE ${assignmentConditions.join(' AND ')}
      ORDER BY cga.starts_on DESC, cga.id DESC
      LIMIT 1
    ) cga ON TRUE`,
  ];

  if (
    filters.groupId !== undefined ||
    filters.seasonId !== undefined ||
    filters.academyId !== undefined ||
    actor.role === 'coach'
  ) {
    conditions.push('cga.group_id IS NOT NULL');
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
      cga.group_id AS current_group_id,
      cga.group_name AS current_group_name,
      cga.season_id AS current_season_id,
      cga.season_name AS current_season_name,
      cga.academy_id AS current_academy_id,
      cga.academy_name AS current_academy_name,
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

async function findById(id, client) {
  const executor = getExecutor(client);

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

  const { rows } = await executor.query(query, [id]);
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
      cga.group_id AS current_group_id,
      cga.group_name AS current_group_name,
      cga.season_id AS current_season_id,
      cga.season_name AS current_season_name,
      cga.academy_id AS current_academy_id,
      cga.academy_name AS current_academy_name,
      qt.status AS questionnaire_status,
      qt.expires_at AS questionnaire_expires_at,
      qt.token AS questionnaire_token
    FROM children c
    LEFT JOIN LATERAL (
      SELECT
        cga.child_id,
        cga.group_id,
        cga.season_id,
        g.name AS group_name,
        sg.id AS academy_season_id,
        sg.name AS season_name,
        ag.id AS academy_id,
        ag.name AS academy_name,
        cga.starts_on,
        cga.ends_on
      FROM child_group_assignments cga
        INNER JOIN groups g ON g.id = cga.group_id
        INNER JOIN seasons sg ON sg.id = g.season_id
        INNER JOIN academies ag ON ag.id = sg.academy_id
      WHERE cga.child_id = c.id
        AND cga.ends_on IS NULL
      ORDER BY cga.starts_on DESC, cga.id DESC
      LIMIT 1
    ) cga ON TRUE
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
      season_id,
      starts_on,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, child_id, group_id, season_id, starts_on, ends_on, created_at
  `;

  const values = [
    data.childId,
    data.groupId,
    data.seasonId,
    data.startsOn,
    data.createdBy || null,
  ];
  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function findActiveGroupAssignment(childId, seasonId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      child_id,
      group_id,
      season_id,
      starts_on,
      ends_on,
      created_at
    FROM child_group_assignments
    WHERE child_id = $1
      AND season_id = $2
      AND ends_on IS NULL
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [childId, seasonId]);
  return rows[0] || null;
}

async function closeActiveGroupAssignment(childId, seasonId, endsOn, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE child_group_assignments
    SET ends_on = $2
    WHERE child_id = $1
      AND season_id = $3
      AND ends_on IS NULL
    RETURNING id, child_id, group_id, season_id, starts_on, ends_on, created_at
  `;

  const { rows } = await executor.query(query, [childId, endsOn, seasonId]);
  return rows[0] || null;
}

async function findActiveGroupAssignmentInAcademy(childId, academyId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      cga.id,
      cga.child_id,
      cga.group_id,
      cga.season_id,
      cga.starts_on,
      cga.ends_on,
      cga.created_at,
      s.academy_id
    FROM child_group_assignments cga
    INNER JOIN groups g ON g.id = cga.group_id
    INNER JOIN seasons s ON s.id = g.season_id
    WHERE cga.child_id = $1
      AND s.academy_id = $2
      AND cga.ends_on IS NULL
    ORDER BY cga.starts_on DESC, cga.id DESC
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [childId, academyId]);
  return rows[0] || null;
}

async function closeActiveGroupAssignmentsInAcademy(childId, academyId, endsOn, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE child_group_assignments cga
    SET ends_on = $3
    FROM groups g
    INNER JOIN seasons s ON s.id = g.season_id
    WHERE cga.group_id = g.id
      AND cga.child_id = $1
      AND s.academy_id = $2
      AND cga.ends_on IS NULL
  `;

  const result = await executor.query(query, [childId, academyId, endsOn]);
  return result.rowCount || 0;
}

async function getLatestProtectedActivityDateForChildGroup(childId, groupId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT MAX(activity_date)::date AS latest_activity_date
    FROM (
      SELECT MAX(dse.evaluation_date)::date AS activity_date
      FROM daily_social_evaluations dse
      WHERE dse.child_id = $1
        AND dse.group_id = $2

      UNION ALL

      SELECT MAX(sgc.ends_on)::date AS activity_date
      FROM sports_challenge_results r
      INNER JOIN sports_group_challenges sgc ON sgc.id = r.challenge_id
      WHERE r.child_id = $1
        AND sgc.group_id = $2
    ) activity
    WHERE activity.activity_date IS NOT NULL
  `;

  const { rows } = await executor.query(query, [childId, groupId]);
  return rows[0] ? rows[0].latest_activity_date : null;
}

async function countActiveChildrenInSeason(seasonId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT COUNT(DISTINCT cga.child_id)::int AS total
    FROM child_group_assignments cga
    WHERE cga.season_id = $1
      AND cga.ends_on IS NULL
  `;

  const { rows } = await executor.query(query, [seasonId]);
  return rows[0] ? Number(rows[0].total) : 0;
}

async function importChildrenFromSeasonToGroup(data, client) {
  const executor = getExecutor(client);

  const query = `
    WITH source_children AS (
      SELECT DISTINCT cga.child_id
      FROM child_group_assignments cga
      WHERE cga.season_id = $1
        AND cga.ends_on IS NULL
    ),
    inserted AS (
      INSERT INTO child_group_assignments (
        child_id,
        group_id,
        season_id,
        starts_on,
        created_by
      )
      SELECT
        sc.child_id,
        $2,
        $3,
        $4,
        $5
      FROM source_children sc
      WHERE NOT EXISTS (
        SELECT 1
        FROM child_group_assignments target
        WHERE target.child_id = sc.child_id
          AND target.season_id = $3
          AND target.ends_on IS NULL
      )
      RETURNING child_id
    )
    SELECT COUNT(*)::int AS imported_count
    FROM inserted
  `;

  const values = [
    data.sourceSeasonId,
    data.targetGroupId,
    data.targetSeasonId,
    data.startsOn,
    data.createdBy || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] ? Number(rows[0].imported_count) : 0;
}

async function importChildrenToGroup(data, client) {
  const executor = getExecutor(client);

  const query = `
    WITH requested_children AS (
      SELECT DISTINCT UNNEST($1::int[]) AS child_id
    ),
    eligible_children AS (
      SELECT rc.child_id
      FROM requested_children rc
      WHERE EXISTS (
        SELECT 1
        FROM child_group_assignments source_cga
        INNER JOIN groups source_group ON source_group.id = source_cga.group_id
        INNER JOIN seasons source_season ON source_season.id = source_group.season_id
        WHERE source_cga.child_id = rc.child_id
          AND source_cga.ends_on IS NULL
          AND ($2::int IS NULL OR source_group.id = $2)
          AND ($3::int IS NULL OR source_season.academy_id = $3)
      )
    ),
    inserted AS (
      INSERT INTO child_group_assignments (
        child_id,
        group_id,
        season_id,
        starts_on,
        created_by
      )
      SELECT
        ec.child_id,
        $4,
        $5,
        $6,
        $7
      FROM eligible_children ec
      WHERE NOT EXISTS (
        SELECT 1
        FROM child_group_assignments target_cga
        WHERE target_cga.child_id = ec.child_id
          AND target_cga.season_id = $5
          AND target_cga.ends_on IS NULL
      )
      RETURNING child_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM requested_children) AS requested_count,
      (SELECT COUNT(*)::int FROM inserted) AS imported_count
  `;

  const values = [
    data.childIds,
    data.sourceGroupId || null,
    data.sourceAcademyId || null,
    data.targetGroupId,
    data.targetSeasonId,
    data.startsOn,
    data.createdBy || null,
  ];

  const { rows } = await executor.query(query, values);
  const requestedCount = rows[0] ? Number(rows[0].requested_count || 0) : 0;
  const importedCount = rows[0] ? Number(rows[0].imported_count || 0) : 0;

  return {
    requestedCount,
    importedCount,
    skippedCount: Math.max(requestedCount - importedCount, 0),
  };
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
  findActiveGroupAssignment,
  closeActiveGroupAssignment,
  findActiveGroupAssignmentInAcademy,
  closeActiveGroupAssignmentsInAcademy,
  getLatestProtectedActivityDateForChildGroup,
  countActiveChildrenInSeason,
  importChildrenFromSeasonToGroup,
  importChildrenToGroup,
  userCanAccessChild,
  userCanAccessGroup,
};
