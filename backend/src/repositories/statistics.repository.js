const { pool } = require('../db/postgres');

function normalizeGroupIds(groupIds) {
  if (!Array.isArray(groupIds)) {
    return [];
  }

  const normalized = groupIds
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  return Array.from(new Set(normalized));
}

let hasSportsGroupFinalStatusColumnCache = null;

async function hasSportsGroupFinalStatusColumn() {
  if (hasSportsGroupFinalStatusColumnCache !== null) {
    return hasSportsGroupFinalStatusColumnCache;
  }

  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sports_group_challenges'
        AND column_name = 'final_status'
    ) AS has_column
  `;

  const { rows } = await pool.query(query);
  hasSportsGroupFinalStatusColumnCache = Boolean(rows[0]?.has_column);
  return hasSportsGroupFinalStatusColumnCache;
}

async function listAccessibleGroups(actor, filters = {}) {
  const joins = [
    'INNER JOIN seasons s ON s.id = g.season_id',
    'INNER JOIN academies a ON a.id = s.academy_id',
  ];
  const conditions = ['g.is_active = TRUE'];
  const values = [];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`s.academy_id = $${values.length}`);
  }

  if (filters.groupId !== undefined) {
    values.push(filters.groupId);
    conditions.push(`g.id = $${values.length}`);
  }

  if (actor.role === 'coach') {
    joins.push(
      'INNER JOIN coach_groups cg ON cg.group_id = g.id AND cg.unassigned_at IS NULL'
    );
    values.push(actor.id);
    conditions.push(`cg.coach_id = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT DISTINCT
      g.id,
      g.name,
      s.academy_id,
      a.name AS academy_name
    FROM groups g
    ${joins.join('\n')}
    ${whereClause}
    ORDER BY a.name ASC, g.name ASC, g.id ASC
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

async function getDataDateBounds(groupIds) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return {
      minDate: null,
      maxDate: null,
    };
  }

  const query = `
    SELECT
      TO_CHAR(MIN(source_date)::date, 'YYYY-MM-DD') AS min_date,
      TO_CHAR(MAX(source_date)::date, 'YYYY-MM-DD') AS max_date
    FROM (
      SELECT wss.week_start_date AS source_date
      FROM weekly_social_summaries wss
      WHERE wss.group_id = ANY($1::bigint[])

      UNION ALL

      SELECT sgc.starts_on AS source_date
      FROM sports_group_challenges sgc
      WHERE sgc.group_id = ANY($1::bigint[])

      UNION ALL

      SELECT cc.starts_on AS source_date
      FROM creative_challenge_group_results cgr
      INNER JOIN creative_challenges cc ON cc.id = cgr.challenge_id
      WHERE cgr.group_id = ANY($1::bigint[])
    ) source
  `;

  const { rows } = await pool.query(query, [normalizedGroupIds]);
  const row = rows[0] || {};

  return {
    minDate: row.min_date || null,
    maxDate: row.max_date || null,
  };
}

async function getSocialWeeklyBuckets(groupIds, firstWeekStartDate, lastWeekStartDate) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return [];
  }

  const query = `
    SELECT
      wss.group_id,
      TO_CHAR(wss.week_start_date::date, 'YYYY-MM-DD') AS week_start_date,
      LEAST(10, GREATEST(0, ROUND(AVG(wss.weekly_alpha_balls))))::int AS social_balls
    FROM weekly_social_summaries wss
    WHERE wss.group_id = ANY($1::bigint[])
      AND wss.week_start_date >= $2::date
      AND wss.week_start_date <= $3::date
    GROUP BY wss.group_id, wss.week_start_date::date
    ORDER BY wss.week_start_date::date ASC, wss.group_id ASC
  `;

  const { rows } = await pool.query(query, [
    normalizedGroupIds,
    firstWeekStartDate,
    lastWeekStartDate,
  ]);

  return rows;
}

async function getSportsWeeklyBuckets(groupIds, firstWeekStartDate, lastWeekStartDate) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return [];
  }

  const canUseGroupChallengeFinalStatus = await hasSportsGroupFinalStatusColumn();
  const finalStatusExpression = canUseGroupChallengeFinalStatus
    ? "COALESCE(scs.final_status, sgc.final_status)"
    : 'scs.final_status';

  const query = `
    WITH sports_source AS (
      SELECT
        sgc.group_id,
        DATE_TRUNC('week', sgc.starts_on::timestamp)::date AS week_start_date,
        CASE
          WHEN ${finalStatusExpression} = 'passed' THEN 10
          ELSE 0
        END AS sports_points
      FROM sports_group_challenges sgc
      LEFT JOIN sports_challenge_summaries scs ON scs.challenge_id = sgc.id
      WHERE sgc.group_id = ANY($1::bigint[])
        AND sgc.starts_on >= $2::date
        AND sgc.starts_on < ($3::date + INTERVAL '7 days')
    )
    SELECT
      group_id,
      TO_CHAR(week_start_date, 'YYYY-MM-DD') AS week_start_date,
      LEAST(10, GREATEST(0, ROUND(AVG(sports_points))))::int AS sports_balls
    FROM sports_source
    GROUP BY group_id, week_start_date
    ORDER BY week_start_date ASC, group_id ASC
  `;

  const { rows } = await pool.query(query, [
    normalizedGroupIds,
    firstWeekStartDate,
    lastWeekStartDate,
  ]);

  return rows;
}

async function getCreativityWeeklyBuckets(groupIds, firstWeekStartDate, lastWeekStartDate) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return [];
  }

  const query = `
    WITH creativity_source AS (
      SELECT
        cgr.group_id,
        DATE_TRUNC('week', cc.starts_on::timestamp)::date AS week_start_date,
        COALESCE(cgr.alpha_balls, 0) AS alpha_balls
      FROM creative_challenge_group_results cgr
      INNER JOIN creative_challenges cc ON cc.id = cgr.challenge_id
      WHERE cgr.group_id = ANY($1::bigint[])
        AND cc.starts_on >= $2::date
        AND cc.starts_on < ($3::date + INTERVAL '7 days')
    )
    SELECT
      group_id,
      TO_CHAR(week_start_date, 'YYYY-MM-DD') AS week_start_date,
      LEAST(10, GREATEST(0, ROUND(AVG(alpha_balls))))::int AS creativity_balls
    FROM creativity_source
    GROUP BY group_id, week_start_date
    ORDER BY week_start_date ASC, group_id ASC
  `;

  const { rows } = await pool.query(query, [
    normalizedGroupIds,
    firstWeekStartDate,
    lastWeekStartDate,
  ]);

  return rows;
}

module.exports = {
  listAccessibleGroups,
  getDataDateBounds,
  getSocialWeeklyBuckets,
  getSportsWeeklyBuckets,
  getCreativityWeeklyBuckets,
};
