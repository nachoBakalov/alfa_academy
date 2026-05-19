const { pool } = require('../db/postgres');
const groupRepository = require('./group.repository');

function getExecutor(client) {
  return client || pool;
}

async function getActiveDaysForGroup(groupId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      day_of_week,
      is_active
    FROM group_social_active_days
    WHERE group_id = $1
    ORDER BY day_of_week ASC
  `;

  const { rows } = await executor.query(query, [groupId]);
  return rows;
}

async function upsertActiveDays(groupId, activeDays, actorUserId, client) {
  const executor = getExecutor(client);
  const results = [];

  const query = `
    INSERT INTO group_social_active_days (
      group_id,
      day_of_week,
      is_active,
      created_by
    )
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (group_id, day_of_week)
    DO UPDATE SET
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING
      id,
      group_id,
      day_of_week,
      is_active,
      created_at,
      updated_at
  `;

  for (const day of activeDays) {
    const values = [groupId, day.dayOfWeek, day.isActive, actorUserId || null];
    const { rows } = await executor.query(query, values);

    if (rows[0]) {
      results.push(rows[0]);
    }
  }

  return results;
}

async function getGroupWithSeasonAndAcademy(groupId) {
  const query = `
    SELECT
      g.id,
      g.name,
      g.is_active,
      s.id AS season_id,
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

  const { rows } = await pool.query(query, [groupId]);
  return rows[0] || null;
}

async function getChildrenForGroupOnDate(groupId, date, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT DISTINCT
      c.id,
      c.first_name,
      c.last_name
    FROM child_group_assignments cga
    INNER JOIN children c ON c.id = cga.child_id
    WHERE cga.group_id = $1
      AND cga.starts_on <= $2::date
      AND (cga.ends_on IS NULL OR cga.ends_on >= $2::date)
      AND c.is_active = TRUE
    ORDER BY c.last_name ASC, c.first_name ASC, c.id ASC
  `;

  const { rows } = await executor.query(query, [groupId, date]);
  return rows;
}

async function getDailyEvaluationsForGroupDate(groupId, date, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      child_id,
      group_id,
      evaluation_date,
      coach_relation_color,
      children_relation_color,
      rules_color,
      internal_score,
      daily_status,
      external_points,
      optional_comment,
      evaluated_by,
      evaluated_at,
      created_at,
      updated_at
    FROM daily_social_evaluations
    WHERE group_id = $1
      AND evaluation_date = $2::date
    ORDER BY child_id ASC
  `;

  const { rows } = await executor.query(query, [groupId, date]);
  return rows;
}

async function getDailySummary(groupId, date, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      group_id,
      summary_date,
      is_active_day,
      number_of_children,
      internal_daily_maximum,
      external_daily_maximum,
      daily_social_result,
      green_children_count,
      orange_children_count,
      red_children_count,
      calculated_at,
      created_at,
      updated_at
    FROM daily_social_summaries
    WHERE group_id = $1
      AND summary_date = $2::date
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [groupId, date]);
  return rows[0] || null;
}

async function getDailySummariesForGroupRange(groupId, startDate, endDate, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      group_id,
      summary_date,
      is_active_day,
      number_of_children,
      internal_daily_maximum,
      external_daily_maximum,
      daily_social_result,
      green_children_count,
      orange_children_count,
      red_children_count,
      calculated_at,
      created_at,
      updated_at
    FROM daily_social_summaries
    WHERE group_id = $1
      AND summary_date BETWEEN $2::date AND $3::date
    ORDER BY summary_date ASC
  `;

  const { rows } = await executor.query(query, [groupId, startDate, endDate]);
  return rows;
}

async function upsertDailyEvaluation(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO daily_social_evaluations (
      child_id,
      group_id,
      evaluation_date,
      coach_relation_color,
      children_relation_color,
      rules_color,
      internal_score,
      daily_status,
      external_points,
      optional_comment,
      evaluated_by,
      evaluated_at
    )
    VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (child_id, group_id, evaluation_date)
    DO UPDATE SET
      coach_relation_color = EXCLUDED.coach_relation_color,
      children_relation_color = EXCLUDED.children_relation_color,
      rules_color = EXCLUDED.rules_color,
      internal_score = EXCLUDED.internal_score,
      daily_status = EXCLUDED.daily_status,
      external_points = EXCLUDED.external_points,
      optional_comment = EXCLUDED.optional_comment,
      evaluated_by = EXCLUDED.evaluated_by,
      evaluated_at = NOW(),
      updated_at = NOW()
    RETURNING
      id,
      child_id,
      group_id,
      evaluation_date,
      internal_score,
      daily_status,
      external_points,
      optional_comment,
      evaluated_by,
      evaluated_at,
      created_at,
      updated_at
  `;

  const values = [
    data.childId,
    data.groupId,
    data.date,
    data.coachRelationColor,
    data.childrenRelationColor,
    data.rulesColor,
    data.internalScore,
    data.dailyStatus,
    data.externalPoints,
    data.optionalComment || null,
    data.evaluatedBy || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function getEvaluationsForGroupDate(groupId, date, client) {
  return getDailyEvaluationsForGroupDate(groupId, date, client);
}

async function upsertDailySummary(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO daily_social_summaries (
      group_id,
      summary_date,
      is_active_day,
      number_of_children,
      internal_daily_maximum,
      external_daily_maximum,
      daily_social_result,
      green_children_count,
      orange_children_count,
      red_children_count,
      calculated_at
    )
    VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (group_id, summary_date)
    DO UPDATE SET
      is_active_day = EXCLUDED.is_active_day,
      number_of_children = EXCLUDED.number_of_children,
      internal_daily_maximum = EXCLUDED.internal_daily_maximum,
      external_daily_maximum = EXCLUDED.external_daily_maximum,
      daily_social_result = EXCLUDED.daily_social_result,
      green_children_count = EXCLUDED.green_children_count,
      orange_children_count = EXCLUDED.orange_children_count,
      red_children_count = EXCLUDED.red_children_count,
      calculated_at = NOW(),
      updated_at = NOW()
    RETURNING
      id,
      group_id,
      summary_date,
      is_active_day,
      number_of_children,
      internal_daily_maximum,
      external_daily_maximum,
      daily_social_result,
      green_children_count,
      orange_children_count,
      red_children_count,
      calculated_at,
      created_at,
      updated_at
  `;

  const values = [
    data.groupId,
    data.date,
    data.isActiveDay,
    data.numberOfChildren,
    data.internalDailyMaximum,
    data.externalDailyMaximum,
    data.dailySocialResult,
    data.greenChildrenCount,
    data.orangeChildrenCount,
    data.redChildrenCount,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function getWeeklySummary(groupId, weekStartDate, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      group_id,
      week_start_date,
      week_end_date,
      active_days_count,
      number_of_children,
      weekly_maximum,
      weekly_social_result,
      weekly_percentage,
      weekly_alpha_balls,
      weekly_status,
      calculated_at,
      created_at,
      updated_at
    FROM weekly_social_summaries
    WHERE group_id = $1
      AND week_start_date = $2::date
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [groupId, weekStartDate]);
  return rows[0] || null;
}

async function upsertWeeklySummary(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO weekly_social_summaries (
      group_id,
      week_start_date,
      week_end_date,
      active_days_count,
      number_of_children,
      weekly_maximum,
      weekly_social_result,
      weekly_percentage,
      weekly_alpha_balls,
      weekly_status,
      calculated_at
    )
    VALUES ($1, $2::date, $3::date, $4, $5, $6, $7, $8, $9, $10, NOW())
    ON CONFLICT (group_id, week_start_date)
    DO UPDATE SET
      week_end_date = EXCLUDED.week_end_date,
      active_days_count = EXCLUDED.active_days_count,
      number_of_children = EXCLUDED.number_of_children,
      weekly_maximum = EXCLUDED.weekly_maximum,
      weekly_social_result = EXCLUDED.weekly_social_result,
      weekly_percentage = EXCLUDED.weekly_percentage,
      weekly_alpha_balls = EXCLUDED.weekly_alpha_balls,
      weekly_status = EXCLUDED.weekly_status,
      calculated_at = NOW(),
      updated_at = NOW()
    RETURNING
      id,
      group_id,
      week_start_date,
      week_end_date,
      active_days_count,
      number_of_children,
      weekly_maximum,
      weekly_social_result,
      weekly_percentage,
      weekly_alpha_balls,
      weekly_status,
      calculated_at,
      created_at,
      updated_at
  `;

  const values = [
    data.groupId,
    data.weekStartDate,
    data.weekEndDate,
    data.activeDaysCount,
    data.numberOfChildren,
    data.weeklyMaximum,
    data.weeklySocialResult,
    data.weeklyPercentage,
    data.weeklyAlphaBalls,
    data.weeklyStatus,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function coachCanAccessGroup(coachId, groupId) {
  return groupRepository.coachCanAccessGroup(coachId, groupId);
}

module.exports = {
  getActiveDaysForGroup,
  upsertActiveDays,
  getGroupWithSeasonAndAcademy,
  getChildrenForGroupOnDate,
  getDailyEvaluationsForGroupDate,
  getDailySummary,
  getDailySummariesForGroupRange,
  upsertDailyEvaluation,
  getEvaluationsForGroupDate,
  upsertDailySummary,
  getWeeklySummary,
  upsertWeeklySummary,
  coachCanAccessGroup,
};
