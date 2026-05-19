const { pool } = require('../db/postgres');

function buildAcademyChildrenFilters(coachId, filters = {}) {
  const values = [coachId];
  const conditions = [
    `EXISTS (
      SELECT 1
      FROM coach_academies ca
      WHERE ca.coach_id = $1
        AND ca.academy_id = a.id
        AND ca.unassigned_at IS NULL
    )`,
  ];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`a.id = $${values.length}`);
  }

  if (filters.seasonId !== undefined) {
    values.push(filters.seasonId);
    conditions.push(`s.id = $${values.length}`);
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
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
  };
}

async function findCoachById(coachId) {
  const query = `
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.is_active,
      r.code AS role_code
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE u.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [coachId]);
  return rows[0] || null;
}

async function listCoachAcademies(coachId, filters = {}) {
  const values = [coachId];
  const conditions = ['ca.coach_id = $1', 'ca.unassigned_at IS NULL'];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`a.id = $${values.length}`);
  }

  const query = `
    SELECT
      a.id,
      a.name,
      ca.assigned_at
    FROM coach_academies ca
    INNER JOIN academies a ON a.id = ca.academy_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY a.name ASC, a.id ASC
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function listCoachGroupWorkspaceRows(coachId, filters = {}) {
  const values = [coachId];
  const conditions = ['cg.coach_id = $1', 'cg.unassigned_at IS NULL'];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`a.id = $${values.length}`);
  }

  if (filters.seasonId !== undefined) {
    values.push(filters.seasonId);
    conditions.push(`s.id = $${values.length}`);
  }

  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`g.is_active = $${values.length}`);
  }

  const query = `
    SELECT
      a.id AS academy_id,
      a.name AS academy_name,
      g.id AS group_id,
      g.name AS group_name,
      g.is_active AS group_is_active,
      cg.is_primary,
      s.id AS season_id,
      s.name AS season_name,
      COALESCE(children.children_count, 0) AS children_count,
      COALESCE(questionnaires.pending_questionnaires_count, 0) AS pending_questionnaires_count,
      latest_daily.summary_date AS latest_social_date,
      latest_daily.daily_social_result AS latest_social_result,
      latest_daily.external_daily_maximum AS latest_social_maximum,
      latest_weekly.week_start_date,
      latest_weekly.weekly_alpha_balls,
      latest_weekly.weekly_status,
      COALESCE(sports.active_sports_challenges_count, 0) AS active_sports_challenges_count
    FROM coach_groups cg
    INNER JOIN groups g ON g.id = cg.group_id
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS children_count
      FROM child_group_assignments cga
      INNER JOIN children c ON c.id = cga.child_id
      WHERE cga.group_id = g.id
        AND cga.ends_on IS NULL
        AND c.is_active = TRUE
    ) children ON TRUE
    LEFT JOIN LATERAL (
      WITH active_children AS (
        SELECT c.id
        FROM child_group_assignments cga
        INNER JOIN children c ON c.id = cga.child_id
        WHERE cga.group_id = g.id
          AND cga.ends_on IS NULL
          AND c.is_active = TRUE
      ),
      latest_tokens AS (
        SELECT DISTINCT ON (qt.child_id)
          qt.child_id,
          qt.status,
          qt.expires_at
        FROM questionnaire_tokens qt
        INNER JOIN active_children ac ON ac.id = qt.child_id
        ORDER BY qt.child_id ASC, qt.created_at DESC, qt.id DESC
      )
      SELECT COUNT(*) FILTER (
        WHERE (
          CASE
            WHEN status = 'pending' AND expires_at < NOW() THEN 'expired'
            ELSE status
          END
        ) = 'pending'
      )::int AS pending_questionnaires_count
      FROM latest_tokens
    ) questionnaires ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        dss.summary_date,
        dss.daily_social_result,
        dss.external_daily_maximum
      FROM daily_social_summaries dss
      WHERE dss.group_id = g.id
      ORDER BY dss.summary_date DESC, dss.id DESC
      LIMIT 1
    ) latest_daily ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        wss.week_start_date,
        wss.weekly_alpha_balls,
        wss.weekly_status
      FROM weekly_social_summaries wss
      WHERE wss.group_id = g.id
      ORDER BY wss.week_start_date DESC, wss.id DESC
      LIMIT 1
    ) latest_weekly ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS active_sports_challenges_count
      FROM sports_group_challenges sgc
      WHERE sgc.group_id = g.id
        AND sgc.status = 'active'
    ) sports ON TRUE
    WHERE ${conditions.join(' AND ')}
    ORDER BY a.name ASC, s.name ASC, g.name ASC
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function listCoachAvailableSeasons(coachId, filters = {}) {
  const values = [coachId];
  const conditions = ['cs.coach_id = $1', 'cs.unassigned_at IS NULL'];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`a.id = $${values.length}`);
  }

  const query = `
    SELECT
      s.id,
      s.name,
      s.starts_on,
      s.ends_on,
      s.is_active,
      a.id AS academy_id,
      a.name AS academy_name
    FROM coach_seasons cs
    INNER JOIN seasons s ON s.id = cs.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY s.starts_on DESC, s.id DESC
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function listAcademyChildrenForCoach(coachId, filters = {}) {
  const { values, whereClause } = buildAcademyChildrenFilters(coachId, filters);

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
    INNER JOIN child_group_assignments cga
      ON cga.child_id = c.id
      AND cga.ends_on IS NULL
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
    ${whereClause}
    ORDER BY c.last_name ASC, c.first_name ASC, c.id ASC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  const queryValues = [...values, filters.limit, filters.offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countAcademyChildrenForCoach(coachId, filters = {}) {
  const { values, whereClause } = buildAcademyChildrenFilters(coachId, filters);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM children c
    INNER JOIN child_group_assignments cga
      ON cga.child_id = c.id
      AND cga.ends_on IS NULL
    INNER JOIN groups g ON g.id = cga.group_id
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    ${whereClause}
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] ? Number(rows[0].total) : 0;
}

async function getGroupComfortZoneOverviewRows(groupId, actionCodes = []) {
  if (!Array.isArray(actionCodes) || actionCodes.length === 0) {
    return [];
  }

  const query = `
    WITH selected_actions AS (
      SELECT
        a.id AS action_id,
        a.code AS action_code,
        array_position($2::text[], a.code) AS action_order
      FROM comfort_zone_actions a
      WHERE a.code = ANY($2::text[])
    ),
    active_children AS (
      SELECT
        c.id AS child_id,
        c.first_name,
        c.last_name,
        c.is_active
      FROM child_group_assignments cga
      INNER JOIN children c ON c.id = cga.child_id
      WHERE cga.group_id = $1
        AND cga.ends_on IS NULL
        AND c.is_active = TRUE
    ),
    latest_profiles AS (
      SELECT DISTINCT ON (cp.child_id)
        cp.id AS profile_id,
        cp.child_id,
        cp.source_submission_id,
        cp.completed_at
      FROM comfort_zone_profiles cp
      INNER JOIN active_children ac ON ac.child_id = cp.child_id
      ORDER BY cp.child_id ASC, cp.completed_at DESC, cp.id DESC
    ),
    favorite_sport_answers AS (
      SELECT
        lp.child_id,
        qa.text_value
      FROM latest_profiles lp
      INNER JOIN questionnaire_answers qa ON qa.submission_id = lp.source_submission_id
      INNER JOIN questionnaire_questions qq ON qq.id = qa.question_id
      WHERE qq.code = 'favorite_sport'
        AND qa.text_value IS NOT NULL
        AND LENGTH(TRIM(qa.text_value)) > 0
    )
    SELECT
      ac.child_id,
      ac.first_name,
      ac.last_name,
      ac.is_active,
      lp.profile_id,
      lp.completed_at,
      sa.action_code,
      cs.score_value,
      cs.zone,
      cs.interpretation,
      cs.note,
      CASE
        WHEN sa.action_code = 'favorite_sport' THEN fsa.text_value
        ELSE NULL
      END AS text_value
    FROM active_children ac
    CROSS JOIN selected_actions sa
    LEFT JOIN latest_profiles lp ON lp.child_id = ac.child_id
    LEFT JOIN comfort_zone_scores cs
      ON cs.profile_id = lp.profile_id
      AND cs.action_id = sa.action_id
    LEFT JOIN favorite_sport_answers fsa ON fsa.child_id = ac.child_id
    ORDER BY
      ac.last_name ASC,
      ac.first_name ASC,
      ac.child_id ASC,
      sa.action_order ASC,
      sa.action_code ASC
  `;

  const { rows } = await pool.query(query, [groupId, actionCodes]);
  return rows;
}

module.exports = {
  findCoachById,
  listCoachAcademies,
  listCoachGroupWorkspaceRows,
  listCoachAvailableSeasons,
  listAcademyChildrenForCoach,
  countAcademyChildrenForCoach,
  getGroupComfortZoneOverviewRows,
};
