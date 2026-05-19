const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

function buildListFilters(filters, { startIndex }) {
  const conditions = [];
  const values = [];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`cc.academy_id = $${startIndex + values.length - 1}`);
  }

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`cc.status = $${startIndex + values.length - 1}`);
  }

  if (filters.weekStartDate) {
    values.push(filters.weekStartDate);
    conditions.push(`cc.starts_on = $${startIndex + values.length - 1}::date`);
  }

  if (Array.isArray(filters.accessibleAcademyIds)) {
    if (filters.accessibleAcademyIds.length === 0) {
      conditions.push('FALSE');
    } else {
      values.push(filters.accessibleAcademyIds);
      conditions.push(`cc.academy_id = ANY($${startIndex + values.length - 1}::bigint[])`);
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

async function listChallenges(filters, options = {}, client) {
  const executor = getExecutor(client);
  const selectedGroupId = options.selectedGroupId || null;
  const queryValues = [selectedGroupId];
  const { whereClause, values: filterValues } = buildListFilters(filters, { startIndex: 2 });

  queryValues.push(...filterValues);

  const limitPlaceholder = `$${queryValues.length + 1}`;
  const offsetPlaceholder = `$${queryValues.length + 2}`;

  const query = `
    SELECT
      cc.id,
      cc.academy_id,
      cc.title,
      cc.activity_type,
      cc.description,
      cc.starts_on,
      cc.ends_on,
      cc.status,
      cc.created_by,
      cc.created_at,
      cc.updated_at,
      a.name AS academy_name,
      selected_result.group_id AS selected_group_id,
      selected_result.alpha_balls AS selected_alpha_balls,
      selected_result.result_note AS selected_result_note,
      selected_result.evaluated_at AS selected_evaluated_at,
      summary.groups_count,
      summary.completed_groups_count,
      summary.average_alpha_balls,
      summary.target_reached_groups_count,
      summary.target_not_reached_groups_count
    FROM creative_challenges cc
    INNER JOIN academies a ON a.id = cc.academy_id
    LEFT JOIN creative_challenge_group_results selected_result
      ON selected_result.challenge_id = cc.id
      AND selected_result.group_id = $1
    LEFT JOIN LATERAL (
      SELECT
        COUNT(g.id)::int AS groups_count,
        COUNT(g.id) FILTER (WHERE cgr.alpha_balls IS NOT NULL)::int AS completed_groups_count,
        COALESCE(ROUND(AVG(cgr.alpha_balls) FILTER (WHERE cgr.alpha_balls IS NOT NULL), 2), 0) AS average_alpha_balls,
        COUNT(g.id) FILTER (WHERE cgr.alpha_balls >= 8)::int AS target_reached_groups_count,
        COUNT(g.id) FILTER (WHERE cgr.alpha_balls <= 7 AND cgr.alpha_balls IS NOT NULL)::int AS target_not_reached_groups_count
      FROM groups g
      INNER JOIN seasons s ON s.id = g.season_id
      LEFT JOIN creative_challenge_group_results cgr
        ON cgr.challenge_id = cc.id
        AND cgr.group_id = g.id
      WHERE s.academy_id = cc.academy_id
        AND g.is_active = TRUE
    ) summary ON TRUE
    ${whereClause}
    ORDER BY cc.starts_on DESC, cc.id DESC
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;

  queryValues.push(filters.limit, filters.offset);

  const { rows } = await executor.query(query, queryValues);
  return rows;
}

async function countChallenges(filters, client) {
  const executor = getExecutor(client);
  const { whereClause, values } = buildListFilters(filters, { startIndex: 1 });

  const query = `
    SELECT COUNT(*)::int AS total
    FROM creative_challenges cc
    ${whereClause}
  `;

  const { rows } = await executor.query(query, values);
  return rows[0] ? Number(rows[0].total) : 0;
}

async function findChallengeById(challengeId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      cc.id,
      cc.academy_id,
      cc.title,
      cc.activity_type,
      cc.description,
      cc.starts_on,
      cc.ends_on,
      cc.status,
      cc.created_by,
      cc.created_at,
      cc.updated_at,
      a.name AS academy_name
    FROM creative_challenges cc
    INNER JOIN academies a ON a.id = cc.academy_id
    WHERE cc.id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [challengeId]);
  return rows[0] || null;
}

async function createChallenge(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO creative_challenges (
      academy_id,
      title,
      activity_type,
      description,
      starts_on,
      ends_on,
      status,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8)
    RETURNING id
  `;

  const values = [
    data.academyId,
    data.title,
    data.activityType,
    data.description || null,
    data.startsOn,
    data.endsOn,
    data.status,
    data.createdBy || null,
  ];

  const { rows } = await executor.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findChallengeById(rows[0].id, client);
}

async function updateChallenge(challengeId, data, client) {
  const executor = getExecutor(client);
  const updates = [];
  const values = [];

  if (data.title !== undefined) {
    values.push(data.title);
    updates.push(`title = $${values.length}`);
  }

  if (data.activityType !== undefined) {
    values.push(data.activityType);
    updates.push(`activity_type = $${values.length}`);
  }

  if (data.description !== undefined) {
    values.push(data.description || null);
    updates.push(`description = $${values.length}`);
  }

  if (data.startsOn !== undefined) {
    values.push(data.startsOn);
    updates.push(`starts_on = $${values.length}::date`);
  }

  if (data.endsOn !== undefined) {
    values.push(data.endsOn);
    updates.push(`ends_on = $${values.length}::date`);
  }

  if (updates.length === 0) {
    return findChallengeById(challengeId, client);
  }

  values.push(challengeId);

  const query = `
    UPDATE creative_challenges
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id
  `;

  const { rows } = await executor.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findChallengeById(challengeId, client);
}

async function updateChallengeStatus(challengeId, status, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE creative_challenges
    SET status = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await executor.query(query, [status, challengeId]);

  if (!rows[0]) {
    return null;
  }

  return findChallengeById(challengeId, client);
}

async function upsertGroupResult(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO creative_challenge_group_results (
      challenge_id,
      group_id,
      alpha_balls,
      result_note,
      evaluated_by,
      evaluated_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (challenge_id, group_id)
    DO UPDATE
    SET
      alpha_balls = EXCLUDED.alpha_balls,
      result_note = EXCLUDED.result_note,
      evaluated_by = EXCLUDED.evaluated_by,
      evaluated_at = NOW()
    RETURNING
      id,
      challenge_id,
      group_id,
      alpha_balls,
      result_note,
      evaluated_by,
      evaluated_at,
      created_at,
      updated_at
  `;

  const values = [
    data.challengeId,
    data.groupId,
    data.alphaBalls,
    data.resultNote || null,
    data.evaluatedBy || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function listChallengeResults(challengeId, academyId, options = {}, client) {
  const executor = getExecutor(client);
  const values = [challengeId, academyId];
  const conditions = ['s.academy_id = $2'];

  if (Array.isArray(options.groupIds)) {
    if (options.groupIds.length === 0) {
      return [];
    }

    values.push(options.groupIds);
    conditions.push(`g.id = ANY($${values.length}::bigint[])`);
  }

  const query = `
    SELECT
      g.id AS group_id,
      g.name AS group_name,
      cgr.alpha_balls,
      cgr.result_note,
      cgr.evaluated_by,
      cgr.evaluated_at
    FROM groups g
    INNER JOIN seasons s ON s.id = g.season_id
    LEFT JOIN creative_challenge_group_results cgr
      ON cgr.challenge_id = $1
      AND cgr.group_id = g.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY g.name ASC, g.id ASC
  `;

  const { rows } = await executor.query(query, values);
  return rows;
}

async function listCoachAssignedGroupIdsInAcademy(coachId, academyId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT DISTINCT g.id
    FROM coach_groups cg
    INNER JOIN groups g ON g.id = cg.group_id
    INNER JOIN seasons s ON s.id = g.season_id
    WHERE cg.coach_id = $1
      AND cg.unassigned_at IS NULL
      AND s.academy_id = $2
  `;

  const { rows } = await executor.query(query, [coachId, academyId]);
  return rows.map((row) => Number(row.id));
}

module.exports = {
  listChallenges,
  countChallenges,
  findChallengeById,
  createChallenge,
  updateChallenge,
  updateChallengeStatus,
  upsertGroupResult,
  listChallengeResults,
  listCoachAssignedGroupIdsInAcademy,
};
