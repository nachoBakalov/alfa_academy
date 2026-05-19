const { pool } = require('../../src/db/postgres');

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateOrThrow(value) {
  const normalized = String(value || '').slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || formatDate(parsed) !== normalized) {
    throw new Error('CHECK_WEEK_START_DATE трябва да е във формат YYYY-MM-DD');
  }

  return parsed;
}

function getCurrentMonday() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = today.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today.getTime());
  monday.setUTCDate(monday.getUTCDate() + diffToMonday);
  return monday;
}

async function hasSportsGroupFinalStatusColumn() {
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
  return Boolean(rows[0]?.has_column);
}

async function resolveGroups(groupIdEnv) {
  if (!groupIdEnv) {
    const query = `
      SELECT
        g.id,
        g.name,
        a.name AS academy_name
      FROM groups g
      INNER JOIN seasons s ON s.id = g.season_id
      INNER JOIN academies a ON a.id = s.academy_id
      WHERE g.is_active = TRUE
      ORDER BY g.id ASC
      LIMIT 5
    `;

    const { rows } = await pool.query(query);
    return rows;
  }

  const groupIds = String(groupIdEnv)
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  if (groupIds.length === 0) {
    throw new Error('CHECK_GROUP_ID трябва да е цяло число или списък от цели числа, разделени със запетая');
  }

  const query = `
    SELECT
      g.id,
      g.name,
      a.name AS academy_name
    FROM groups g
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE g.id = ANY($1::bigint[])
    ORDER BY g.id ASC
  `;

  const { rows } = await pool.query(query, [groupIds]);
  return rows;
}

async function getSocialBreakdown(groupId, weekStartDate) {
  const query = `
    SELECT
      COUNT(*)::int AS social_rows,
      LEAST(10, GREATEST(0, ROUND(AVG(wss.weekly_alpha_balls))))::int AS social_balls
    FROM weekly_social_summaries wss
    WHERE wss.group_id = $1
      AND wss.week_start_date = $2::date
  `;

  const { rows } = await pool.query(query, [groupId, weekStartDate]);
  const row = rows[0] || {};

  return {
    rows: Number(row.social_rows || 0),
    balls: Number(row.social_balls || 0),
  };
}

async function getSportsBreakdown(groupId, weekStartDate, canUseFallbackFinalStatus) {
  const statusExpression = canUseFallbackFinalStatus
    ? "COALESCE(scs.final_status, sgc.final_status)"
    : 'scs.final_status';

  const query = `
    SELECT
      COUNT(DISTINCT sgc.id)::int AS sports_total,
      COUNT(DISTINCT sgc.id) FILTER (WHERE ${statusExpression} = 'passed')::int AS sports_passed,
      LEAST(
        10,
        GREATEST(0, ROUND(AVG(CASE WHEN ${statusExpression} = 'passed' THEN 10 ELSE 0 END)))
      )::int AS sports_balls
    FROM sports_group_challenges sgc
    LEFT JOIN sports_challenge_summaries scs ON scs.challenge_id = sgc.id
    WHERE sgc.group_id = $1
      AND DATE_TRUNC('week', sgc.starts_on::timestamp)::date = $2::date
  `;

  const { rows } = await pool.query(query, [groupId, weekStartDate]);
  const row = rows[0] || {};

  return {
    total: Number(row.sports_total || 0),
    passed: Number(row.sports_passed || 0),
    balls: Number(row.sports_balls || 0),
  };
}

async function getCreativityBreakdown(groupId, weekStartDate) {
  const query = `
    SELECT
      COUNT(*)::int AS creativity_results,
      ROUND(AVG(COALESCE(cgr.alpha_balls, 0)), 2) AS creativity_avg,
      LEAST(10, GREATEST(0, ROUND(AVG(COALESCE(cgr.alpha_balls, 0)))))::int AS creativity_balls
    FROM creative_challenge_group_results cgr
    INNER JOIN creative_challenges cc ON cc.id = cgr.challenge_id
    WHERE cgr.group_id = $1
      AND DATE_TRUNC('week', cc.starts_on::timestamp)::date = $2::date
  `;

  const { rows } = await pool.query(query, [groupId, weekStartDate]);
  const row = rows[0] || {};

  return {
    results: Number(row.creativity_results || 0),
    average: Number(row.creativity_avg || 0),
    balls: Number(row.creativity_balls || 0),
  };
}

async function run() {
  const weekStartDate = process.env.CHECK_WEEK_START_DATE
    ? formatDate(parseDateOrThrow(process.env.CHECK_WEEK_START_DATE))
    : formatDate(getCurrentMonday());

  const groupIdEnv = process.env.CHECK_GROUP_ID || '';
  const groups = await resolveGroups(groupIdEnv);

  if (groups.length === 0) {
    console.log('Не бяха намерени групи за проверка.');
    return;
  }

  const canUseFallbackFinalStatus = await hasSportsGroupFinalStatusColumn();

  console.log(`Проверка за седмица: ${weekStartDate}`);
  console.log(
    `Sports final status fallback: ${canUseFallbackFinalStatus ? 'scs.final_status -> sgc.final_status' : 'само scs.final_status'}`
  );
  console.log('');

  for (const group of groups) {
    const groupId = Number(group.id);
    const social = await getSocialBreakdown(groupId, weekStartDate);
    const sports = await getSportsBreakdown(groupId, weekStartDate, canUseFallbackFinalStatus);
    const creativity = await getCreativityBreakdown(groupId, weekStartDate);

    const total = social.balls + sports.balls + creativity.balls;

    console.log(`Group ${groupId} (${group.name}) / ${weekStartDate}`);
    console.log(`Academy: ${group.academy_name || '-'}`);
    console.log(`Social: ${social.balls} (rows: ${social.rows})`);
    console.log(`Sports: ${sports.balls} (${sports.passed} passed / ${sports.total} total)`);
    console.log(`Creativity: ${creativity.balls} (results: ${creativity.results}, avg ${creativity.average})`);
    console.log(`Total: ${total} / 30`);
    console.log('---');
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
