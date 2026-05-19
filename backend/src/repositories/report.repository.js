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

function defaultDashboardCounts() {
  return {
    activeAcademies: 0,
    activeSeasons: 0,
    activeGroups: 0,
    activeChildren: 0,
    activeCoaches: 0,
  };
}

function defaultQuestionnaireStats() {
  return {
    pending: 0,
    submitted: 0,
    expired: 0,
    revoked: 0,
    expiringSoon: 0,
  };
}

function defaultComfortZoneStats() {
  return {
    childrenWithProfile: 0,
    childrenWithoutProfile: 0,
    profileCompletionPercentage: 0,
  };
}

function defaultSocialWeeklyStats() {
  return {
    groupsWithWeeklySummary: 0,
    targetReachedGroups: 0,
    targetNotReachedGroups: 0,
    averageAlphaBalls: 0,
  };
}

function defaultSportsStats() {
  return {
    activeChallenges: 0,
    completedChallenges: 0,
    passedChallenges: 0,
    notPassedChallenges: 0,
  };
}

async function getAccessibleGroupIds(actor, filters = {}) {
  const joins = [
    'INNER JOIN seasons s ON s.id = g.season_id',
    'INNER JOIN academies a ON a.id = s.academy_id',
  ];
  const conditions = [];
  const values = [];

  if (filters.academyId !== undefined) {
    values.push(filters.academyId);
    conditions.push(`s.academy_id = $${values.length}`);
  }

  if (filters.seasonId !== undefined) {
    values.push(filters.seasonId);
    conditions.push(`g.season_id = $${values.length}`);
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
    SELECT DISTINCT g.id
    FROM groups g
    ${joins.join('\n')}
    ${whereClause}
    ORDER BY g.id ASC
  `;

  const { rows } = await pool.query(query, values);
  return rows.map((row) => Number(row.id));
}

async function getDashboardCounts(groupIds) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return defaultDashboardCounts();
  }

  const query = `
    SELECT
      COUNT(DISTINCT CASE WHEN a.is_active = TRUE THEN a.id END)::int AS active_academies,
      COUNT(DISTINCT CASE WHEN s.is_active = TRUE THEN s.id END)::int AS active_seasons,
      COUNT(DISTINCT CASE WHEN g.is_active = TRUE THEN g.id END)::int AS active_groups,
      COUNT(DISTINCT CASE WHEN c.is_active = TRUE THEN c.id END)::int AS active_children,
      COUNT(DISTINCT CASE
        WHEN u.is_active = TRUE AND r.code = 'coach' THEN u.id
        ELSE NULL
      END)::int AS active_coaches
    FROM groups g
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    LEFT JOIN child_group_assignments cga
      ON cga.group_id = g.id
      AND cga.ends_on IS NULL
    LEFT JOIN children c ON c.id = cga.child_id
    LEFT JOIN coach_groups cg
      ON cg.group_id = g.id
      AND cg.unassigned_at IS NULL
    LEFT JOIN users u ON u.id = cg.coach_id
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE g.id = ANY($1::bigint[])
  `;

  const { rows } = await pool.query(query, [normalizedGroupIds]);
  const row = rows[0] || {};

  return {
    activeAcademies: Number(row.active_academies || 0),
    activeSeasons: Number(row.active_seasons || 0),
    activeGroups: Number(row.active_groups || 0),
    activeChildren: Number(row.active_children || 0),
    activeCoaches: Number(row.active_coaches || 0),
  };
}

async function getQuestionnaireStats(groupIds) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return defaultQuestionnaireStats();
  }

  const query = `
    WITH active_children AS (
      SELECT DISTINCT c.id
      FROM child_group_assignments cga
      INNER JOIN children c ON c.id = cga.child_id
      WHERE cga.group_id = ANY($1::bigint[])
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
    ),
    normalized_tokens AS (
      SELECT
        child_id,
        CASE
          WHEN status = 'pending' AND expires_at < NOW() THEN 'expired'
          ELSE status
        END AS effective_status,
        expires_at
      FROM latest_tokens
    )
    SELECT
      COUNT(*) FILTER (WHERE effective_status = 'pending')::int AS pending,
      COUNT(*) FILTER (WHERE effective_status = 'submitted')::int AS submitted,
      COUNT(*) FILTER (WHERE effective_status = 'expired')::int AS expired,
      COUNT(*) FILTER (WHERE effective_status = 'revoked')::int AS revoked,
      COUNT(*) FILTER (
        WHERE effective_status = 'pending'
          AND expires_at >= NOW()
          AND expires_at <= NOW() + INTERVAL '7 days'
      )::int AS expiring_soon
    FROM normalized_tokens
  `;

  const { rows } = await pool.query(query, [normalizedGroupIds]);
  const row = rows[0] || {};

  return {
    pending: Number(row.pending || 0),
    submitted: Number(row.submitted || 0),
    expired: Number(row.expired || 0),
    revoked: Number(row.revoked || 0),
    expiringSoon: Number(row.expiring_soon || 0),
  };
}

async function getComfortZoneStats(groupIds) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return defaultComfortZoneStats();
  }

  const query = `
    WITH active_children AS (
      SELECT DISTINCT c.id
      FROM child_group_assignments cga
      INNER JOIN children c ON c.id = cga.child_id
      WHERE cga.group_id = ANY($1::bigint[])
        AND cga.ends_on IS NULL
        AND c.is_active = TRUE
    ),
    latest_profiles AS (
      SELECT DISTINCT ON (cp.child_id)
        cp.child_id,
        cp.id AS profile_id
      FROM comfort_zone_profiles cp
      INNER JOIN active_children ac ON ac.id = cp.child_id
      ORDER BY cp.child_id ASC, cp.completed_at DESC, cp.id DESC
    ),
    counts AS (
      SELECT
        (SELECT COUNT(*)::int FROM active_children) AS active_children_count,
        (SELECT COUNT(*)::int FROM latest_profiles) AS children_with_profile
    )
    SELECT
      active_children_count,
      children_with_profile,
      GREATEST(active_children_count - children_with_profile, 0)::int AS children_without_profile,
      CASE
        WHEN active_children_count = 0 THEN 0
        ELSE ROUND((children_with_profile::numeric / active_children_count::numeric) * 100, 2)
      END AS profile_completion_percentage
    FROM counts
  `;

  const { rows } = await pool.query(query, [normalizedGroupIds]);
  const row = rows[0] || {};

  return {
    childrenWithProfile: Number(row.children_with_profile || 0),
    childrenWithoutProfile: Number(row.children_without_profile || 0),
    profileCompletionPercentage: Number(row.profile_completion_percentage || 0),
  };
}

async function getSocialWeeklyStats(groupIds, weekStartDate) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return defaultSocialWeeklyStats();
  }

  const query = `
    SELECT
      COUNT(*)::int AS groups_with_weekly_summary,
      COUNT(*) FILTER (WHERE weekly_status = 'target_reached')::int AS target_reached_groups,
      COUNT(*) FILTER (WHERE weekly_status = 'target_not_reached')::int AS target_not_reached_groups,
      COALESCE(ROUND(AVG(weekly_alpha_balls)::numeric, 2), 0) AS average_alpha_balls
    FROM weekly_social_summaries
    WHERE group_id = ANY($1::bigint[])
      AND week_start_date = $2::date
  `;

  const { rows } = await pool.query(query, [normalizedGroupIds, weekStartDate]);
  const row = rows[0] || {};

  return {
    groupsWithWeeklySummary: Number(row.groups_with_weekly_summary || 0),
    targetReachedGroups: Number(row.target_reached_groups || 0),
    targetNotReachedGroups: Number(row.target_not_reached_groups || 0),
    averageAlphaBalls: Number(row.average_alpha_balls || 0),
  };
}

async function getSportsStats(groupIds) {
  const normalizedGroupIds = normalizeGroupIds(groupIds);

  if (normalizedGroupIds.length === 0) {
    return defaultSportsStats();
  }

  const query = `
    SELECT
      COUNT(*) FILTER (WHERE sgc.status = 'active')::int AS active_challenges,
      COUNT(*) FILTER (WHERE sgc.status = 'completed')::int AS completed_challenges,
      COUNT(DISTINCT sgc.id) FILTER (WHERE scs.final_status = 'passed')::int AS passed_challenges,
      COUNT(DISTINCT sgc.id) FILTER (WHERE scs.final_status = 'not_passed')::int AS not_passed_challenges
    FROM sports_group_challenges sgc
    LEFT JOIN sports_challenge_summaries scs ON scs.challenge_id = sgc.id
    WHERE sgc.group_id = ANY($1::bigint[])
  `;

  const { rows } = await pool.query(query, [normalizedGroupIds]);
  const row = rows[0] || {};

  return {
    activeChallenges: Number(row.active_challenges || 0),
    completedChallenges: Number(row.completed_challenges || 0),
    passedChallenges: Number(row.passed_challenges || 0),
    notPassedChallenges: Number(row.not_passed_challenges || 0),
  };
}

async function getGroupDashboardBase(groupId) {
  const query = `
    SELECT
      g.id,
      g.name,
      s.id AS season_id,
      s.name AS season_name,
      a.id AS academy_id,
      a.name AS academy_name
    FROM groups g
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE g.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [groupId]);
  return rows[0] || null;
}

async function getGroupChildrenCounts(groupId) {
  const query = `
    SELECT
      COUNT(DISTINCT CASE WHEN c.is_active = TRUE THEN c.id END)::int AS active_children,
      COUNT(DISTINCT CASE WHEN c.is_active = FALSE THEN c.id END)::int AS inactive_children
    FROM child_group_assignments cga
    INNER JOIN children c ON c.id = cga.child_id
    WHERE cga.group_id = $1
      AND cga.ends_on IS NULL
  `;

  const { rows } = await pool.query(query, [groupId]);
  const row = rows[0] || {};

  return {
    activeChildren: Number(row.active_children || 0),
    inactiveChildren: Number(row.inactive_children || 0),
  };
}

async function getGroupComfortZoneZoneSummary(groupId) {
  const query = `
    WITH active_children AS (
      SELECT DISTINCT c.id
      FROM child_group_assignments cga
      INNER JOIN children c ON c.id = cga.child_id
      WHERE cga.group_id = $1
        AND cga.ends_on IS NULL
        AND c.is_active = TRUE
    ),
    latest_profiles AS (
      SELECT DISTINCT ON (cp.child_id)
        cp.child_id,
        cp.id AS profile_id
      FROM comfort_zone_profiles cp
      INNER JOIN active_children ac ON ac.id = cp.child_id
      ORDER BY cp.child_id ASC, cp.completed_at DESC, cp.id DESC
    )
    SELECT
      COALESCE(SUM(CASE WHEN cs.zone = 'green' THEN 1 ELSE 0 END), 0)::int AS green,
      COALESCE(SUM(CASE WHEN cs.zone = 'yellow' THEN 1 ELSE 0 END), 0)::int AS yellow,
      COALESCE(SUM(CASE WHEN cs.zone = 'red' THEN 1 ELSE 0 END), 0)::int AS red,
      COALESCE(SUM(CASE WHEN cs.zone = 'behavior_indicator' THEN 1 ELSE 0 END), 0)::int AS behavior_indicator,
      COALESCE(SUM(CASE WHEN cs.zone = 'neutral' THEN 1 ELSE 0 END), 0)::int AS neutral
    FROM latest_profiles lp
    LEFT JOIN comfort_zone_scores cs ON cs.profile_id = lp.profile_id
  `;

  const { rows } = await pool.query(query, [groupId]);
  const row = rows[0] || {};

  return {
    green: Number(row.green || 0),
    yellow: Number(row.yellow || 0),
    red: Number(row.red || 0),
    behaviorIndicator: Number(row.behavior_indicator || 0),
    neutral: Number(row.neutral || 0),
  };
}

async function getGroupSocialWeeklySummary(groupId, weekStartDate) {
  const query = `
    SELECT
      id,
      group_id,
      week_start_date,
      week_end_date,
      weekly_social_result,
      weekly_maximum,
      weekly_percentage,
      weekly_alpha_balls,
      weekly_status,
      calculated_at
    FROM weekly_social_summaries
    WHERE group_id = $1
      AND week_start_date = $2::date
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [groupId, weekStartDate]);
  return rows[0] || null;
}

async function getGroupLatestSportsChallenges(groupId, limit = 5) {
  const query = `
    SELECT
      sgc.id,
      sgc.title,
      sgc.status,
      sgc.starts_on,
      sgc.ends_on,
      scs.final_status,
      scs.participants_count,
      scs.final_results_count
    FROM sports_group_challenges sgc
    LEFT JOIN sports_challenge_summaries scs ON scs.challenge_id = sgc.id
    WHERE sgc.group_id = $1
    ORDER BY sgc.starts_on DESC, sgc.id DESC
    LIMIT $2
  `;

  const { rows } = await pool.query(query, [groupId, limit]);
  return rows;
}

function buildChildrenOverviewConditions(groupId, filters = {}) {
  const conditions = ['cga.group_id = $1', 'cga.ends_on IS NULL'];
  const values = [groupId];

  if (filters.search) {
    values.push(`%${filters.search}%`);
    const placeholder = `$${values.length}`;
    conditions.push(`(c.first_name ILIKE ${placeholder} OR c.last_name ILIKE ${placeholder})`);
  }

  return {
    conditions,
    values,
  };
}

async function listGroupChildrenOverview(groupId, filters = {}) {
  const { conditions, values } = buildChildrenOverviewConditions(groupId, filters);

  const limit = Number(filters.limit || 50);
  const offset = Number(filters.offset || 0);

  const limitPlaceholder = `$${values.length + 1}`;
  const offsetPlaceholder = `$${values.length + 2}`;

  const query = `
    WITH filtered_children AS (
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.is_active
      FROM child_group_assignments cga
      INNER JOIN children c ON c.id = cga.child_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.last_name ASC, c.first_name ASC, c.id ASC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    ),
    group_active_challenges AS (
      SELECT COUNT(*)::int AS active_challenges_count
      FROM sports_group_challenges sgc
      WHERE sgc.group_id = $1
        AND sgc.status = 'active'
    )
    SELECT
      fc.id,
      fc.first_name,
      fc.last_name,
      fc.is_active,
      qt.status AS questionnaire_status,
      qt.expires_at AS questionnaire_expires_at,
      qt.submitted_at AS questionnaire_submitted_at,
      (cp.id IS NOT NULL) AS comfort_has_profile,
      cp.completed_at AS comfort_completed_at,
      dse.evaluation_date AS social_latest_evaluation_date,
      dse.daily_status AS social_latest_daily_status,
      gac.active_challenges_count,
      COALESCE(scr.completed_results_count, 0)::int AS sports_completed_results_count
    FROM filtered_children fc
    LEFT JOIN LATERAL (
      SELECT
        q.status,
        q.expires_at,
        q.submitted_at
      FROM questionnaire_tokens q
      WHERE q.child_id = fc.id
      ORDER BY q.created_at DESC, q.id DESC
      LIMIT 1
    ) qt ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        p.id,
        p.completed_at
      FROM comfort_zone_profiles p
      WHERE p.child_id = fc.id
      ORDER BY p.completed_at DESC, p.id DESC
      LIMIT 1
    ) cp ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        e.evaluation_date,
        e.daily_status
      FROM daily_social_evaluations e
      WHERE e.child_id = fc.id
        AND e.group_id = $1
      ORDER BY e.evaluation_date DESC, e.id DESC
      LIMIT 1
    ) dse ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS completed_results_count
      FROM sports_challenge_results r
      INNER JOIN sports_group_challenges sgc ON sgc.id = r.challenge_id
      WHERE sgc.group_id = $1
        AND r.child_id = fc.id
        AND r.final_value IS NOT NULL
    ) scr ON TRUE
    CROSS JOIN group_active_challenges gac
    ORDER BY fc.last_name ASC, fc.first_name ASC, fc.id ASC
  `;

  const queryValues = [...values, limit, offset];
  const { rows } = await pool.query(query, queryValues);
  return rows;
}

async function countGroupChildrenOverview(groupId, filters = {}) {
  const { conditions, values } = buildChildrenOverviewConditions(groupId, filters);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM child_group_assignments cga
    INNER JOIN children c ON c.id = cga.child_id
    WHERE ${conditions.join(' AND ')}
  `;

  const { rows } = await pool.query(query, values);
  return rows[0] ? Number(rows[0].total) : 0;
}

module.exports = {
  getAccessibleGroupIds,
  getDashboardCounts,
  getQuestionnaireStats,
  getComfortZoneStats,
  getSocialWeeklyStats,
  getSportsStats,
  getGroupDashboardBase,
  getGroupChildrenCounts,
  getGroupComfortZoneZoneSummary,
  getGroupSocialWeeklySummary,
  getGroupLatestSportsChallenges,
  listGroupChildrenOverview,
  countGroupChildrenOverview,
};
