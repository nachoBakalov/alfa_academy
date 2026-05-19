const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

function buildChallengesFilter(filters) {
  const conditions = ['sgc.group_id = $1'];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`sgc.status = $${values.length + 1}`);
  }

  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
}

async function listDefinitions(filters = {}, client) {
  const executor = getExecutor(client);
  const conditions = [];
  const values = [];

  if (typeof filters.isActive === 'boolean') {
    values.push(filters.isActive);
    conditions.push(`is_active = $${values.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      id,
      code,
      name,
      description,
      unit,
      result_direction,
      target_type,
      default_target_reduction_percent,
      default_fail_safe_threshold_percent,
      is_active,
      created_at,
      updated_at
    FROM sports_challenge_definitions
    ${whereClause}
    ORDER BY name ASC, id ASC
  `;

  const { rows } = await executor.query(query, values);
  return rows;
}

async function findDefinitionByCode(code, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      code,
      name,
      description,
      unit,
      result_direction,
      target_type,
      default_target_reduction_percent,
      default_fail_safe_threshold_percent,
      is_active,
      created_at,
      updated_at
    FROM sports_challenge_definitions
    WHERE code = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [code]);
  return rows[0] || null;
}

async function findDefinitionById(id, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      code,
      name,
      description,
      unit,
      result_direction,
      target_type,
      default_target_reduction_percent,
      default_fail_safe_threshold_percent,
      is_active,
      created_at,
      updated_at
    FROM sports_challenge_definitions
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [id]);
  return rows[0] || null;
}

async function createDefinition(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO sports_challenge_definitions (
      code,
      name,
      description,
      unit,
      result_direction,
      target_type,
      default_target_reduction_percent,
      default_fail_safe_threshold_percent,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, 'maintain_with_tolerance', $6, $7, TRUE)
    RETURNING
      id,
      code,
      name,
      description,
      unit,
      result_direction,
      target_type,
      default_target_reduction_percent,
      default_fail_safe_threshold_percent,
      is_active,
      created_at,
      updated_at
  `;

  const values = [
    data.code,
    data.name,
    data.description || null,
    data.unit,
    data.resultDirection,
    data.defaultTargetReductionPercent,
    data.defaultFailSafeThresholdPercent,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function updateDefinition(definitionId, data, client) {
  const executor = getExecutor(client);
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

  if (data.unit !== undefined) {
    values.push(data.unit);
    updates.push(`unit = $${values.length}`);
  }

  if (data.resultDirection !== undefined) {
    values.push(data.resultDirection);
    updates.push(`result_direction = $${values.length}`);
  }

  if (data.defaultTargetReductionPercent !== undefined) {
    values.push(data.defaultTargetReductionPercent);
    updates.push(`default_target_reduction_percent = $${values.length}`);
  }

  if (data.defaultFailSafeThresholdPercent !== undefined) {
    values.push(data.defaultFailSafeThresholdPercent);
    updates.push(`default_fail_safe_threshold_percent = $${values.length}`);
  }

  if (updates.length === 0) {
    return findDefinitionById(definitionId, client);
  }

  values.push(definitionId);

  const query = `
    UPDATE sports_challenge_definitions
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING
      id,
      code,
      name,
      description,
      unit,
      result_direction,
      target_type,
      default_target_reduction_percent,
      default_fail_safe_threshold_percent,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function updateDefinitionStatus(definitionId, isActive, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE sports_challenge_definitions
    SET is_active = $1
    WHERE id = $2
    RETURNING
      id,
      code,
      name,
      description,
      unit,
      result_direction,
      target_type,
      default_target_reduction_percent,
      default_fail_safe_threshold_percent,
      is_active,
      created_at,
      updated_at
  `;

  const { rows } = await executor.query(query, [isActive, definitionId]);
  return rows[0] || null;
}

async function listGroupChallenges(groupId, filters, client) {
  const executor = getExecutor(client);
  const { whereClause, values } = buildChallengesFilter(filters);

  const query = `
    SELECT
      sgc.id,
      sgc.definition_id,
      sgc.group_id,
      sgc.title,
      sgc.description,
      sgc.starts_on,
      sgc.ends_on,
      sgc.status,
      sgc.unit,
      sgc.target_reduction_percent,
      sgc.fail_safe_threshold_percent,
      sgc.created_by,
      sgc.created_at,
      sgc.updated_at,
      d.code AS definition_code,
      d.name AS definition_name,
      g.name AS group_name,
      scs.participants_count,
      scs.final_results_count,
      scs.group_target_reached,
      scs.fail_safe_reached,
      scs.final_status
    FROM sports_group_challenges sgc
    INNER JOIN sports_challenge_definitions d ON d.id = sgc.definition_id
    INNER JOIN groups g ON g.id = sgc.group_id
    LEFT JOIN sports_challenge_summaries scs ON scs.challenge_id = sgc.id
    ${whereClause}
    ORDER BY sgc.starts_on DESC, sgc.id DESC
    LIMIT $${values.length + 2}
    OFFSET $${values.length + 3}
  `;

  const queryValues = [groupId, ...values, filters.limit, filters.offset];
  const { rows } = await executor.query(query, queryValues);
  return rows;
}

async function countGroupChallenges(groupId, filters, client) {
  const executor = getExecutor(client);
  const { whereClause, values } = buildChallengesFilter(filters);

  const query = `
    SELECT COUNT(*)::int AS total
    FROM sports_group_challenges sgc
    ${whereClause}
  `;

  const queryValues = [groupId, ...values];
  const { rows } = await executor.query(query, queryValues);
  return rows[0] ? rows[0].total : 0;
}

async function findChallengeById(challengeId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      definition_id,
      group_id,
      title,
      description,
      starts_on,
      ends_on,
      status,
      unit,
      target_reduction_percent,
      fail_safe_threshold_percent,
      created_by,
      created_at,
      updated_at
    FROM sports_group_challenges
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [challengeId]);
  return rows[0] || null;
}

async function findChallengeByIdWithDetails(challengeId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      sgc.id,
      sgc.definition_id,
      sgc.group_id,
      sgc.title,
      sgc.description,
      sgc.starts_on,
      sgc.ends_on,
      sgc.status,
      sgc.unit,
      sgc.target_reduction_percent,
      sgc.fail_safe_threshold_percent,
      sgc.created_by,
      sgc.created_at,
      sgc.updated_at,
      d.code AS definition_code,
      d.name AS definition_name,
      d.description AS definition_description,
      d.result_direction AS definition_result_direction,
      d.target_type AS definition_target_type,
      g.name AS group_name,
      s.id AS season_id,
      s.name AS season_name,
      a.id AS academy_id,
      a.name AS academy_name
    FROM sports_group_challenges sgc
    INNER JOIN sports_challenge_definitions d ON d.id = sgc.definition_id
    INNER JOIN groups g ON g.id = sgc.group_id
    INNER JOIN seasons s ON s.id = g.season_id
    INNER JOIN academies a ON a.id = s.academy_id
    WHERE sgc.id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [challengeId]);
  return rows[0] || null;
}

async function findDuplicateChallenge(groupId, definitionId, startsOn, client) {
  const executor = getExecutor(client);

  // Legacy helper kept for backward compatibility.
  // Reusable definitions intentionally allow multiple challenges with the same
  // group, definition and start date.

  const query = `
    SELECT
      id,
      definition_id,
      group_id,
      starts_on
    FROM sports_group_challenges
    WHERE group_id = $1
      AND definition_id = $2
      AND starts_on = $3::date
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [groupId, definitionId, startsOn]);
  return rows[0] || null;
}

async function createChallenge(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO sports_group_challenges (
      definition_id,
      group_id,
      title,
      description,
      starts_on,
      ends_on,
      status,
      unit,
      target_reduction_percent,
      fail_safe_threshold_percent,
      created_by
    )
    VALUES ($1, $2, $3, $4, $5::date, $6::date, $7, $8, $9, $10, $11)
    RETURNING id
  `;

  const values = [
    data.definitionId,
    data.groupId,
    data.title,
    data.description || null,
    data.startsOn,
    data.endsOn,
    data.status || 'active',
    data.unit,
    data.targetReductionPercent,
    data.failSafeThresholdPercent,
    data.createdBy || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function updateChallenge(challengeId, data, client) {
  const executor = getExecutor(client);
  const updates = [];
  const values = [];

  if (data.title !== undefined) {
    values.push(data.title);
    updates.push(`title = $${values.length}`);
  }

  if (data.description !== undefined) {
    values.push(data.description);
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

  if (data.targetReductionPercent !== undefined) {
    values.push(data.targetReductionPercent);
    updates.push(`target_reduction_percent = $${values.length}`);
  }

  if (data.failSafeThresholdPercent !== undefined) {
    values.push(data.failSafeThresholdPercent);
    updates.push(`fail_safe_threshold_percent = $${values.length}`);
  }

  if (updates.length === 0) {
    return findChallengeByIdWithDetails(challengeId, client);
  }

  values.push(challengeId);

  const query = `
    UPDATE sports_group_challenges
    SET ${updates.join(', ')}
    WHERE id = $${values.length}
    RETURNING id
  `;

  const { rows } = await executor.query(query, values);

  if (!rows[0]) {
    return null;
  }

  return findChallengeByIdWithDetails(challengeId, client);
}

async function updateChallengeStatus(challengeId, status, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE sports_group_challenges
    SET status = $1
    WHERE id = $2
    RETURNING id
  `;

  const { rows } = await executor.query(query, [status, challengeId]);

  if (!rows[0]) {
    return null;
  }

  return findChallengeByIdWithDetails(challengeId, client);
}

async function getChildrenForChallengeGroup(challengeId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT DISTINCT
      c.id,
      c.first_name,
      c.last_name
    FROM sports_group_challenges sgc
    INNER JOIN child_group_assignments cga
      ON cga.group_id = sgc.group_id
      AND cga.starts_on <= sgc.ends_on
      AND (cga.ends_on IS NULL OR cga.ends_on >= sgc.starts_on)
    INNER JOIN children c
      ON c.id = cga.child_id
      AND c.is_active = TRUE
    WHERE sgc.id = $1
    ORDER BY c.last_name ASC, c.first_name ASC, c.id ASC
  `;

  const { rows } = await executor.query(query, [challengeId]);
  return rows;
}

async function getResultsForChallenge(challengeId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      r.id,
      r.challenge_id,
      r.child_id,
      r.baseline_value,
      r.final_value,
      r.individual_target_value,
      r.individual_target_reached,
      r.repeated_or_improved_baseline,
      r.difference_from_baseline,
      r.difference_from_target,
      r.notes,
      r.measured_by,
      r.measured_at,
      r.created_at,
      r.updated_at
    FROM sports_challenge_results r
    WHERE r.challenge_id = $1
    ORDER BY r.child_id ASC
  `;

  const { rows } = await executor.query(query, [challengeId]);
  return rows;
}

async function upsertChallengeResult(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO sports_challenge_results (
      challenge_id,
      child_id,
      baseline_value,
      final_value,
      individual_target_value,
      individual_target_reached,
      repeated_or_improved_baseline,
      difference_from_baseline,
      difference_from_target,
      notes,
      measured_by,
      measured_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      NOW()
    )
    ON CONFLICT (challenge_id, child_id)
    DO UPDATE SET
      baseline_value = EXCLUDED.baseline_value,
      final_value = EXCLUDED.final_value,
      individual_target_value = EXCLUDED.individual_target_value,
      individual_target_reached = EXCLUDED.individual_target_reached,
      repeated_or_improved_baseline = EXCLUDED.repeated_or_improved_baseline,
      difference_from_baseline = EXCLUDED.difference_from_baseline,
      difference_from_target = EXCLUDED.difference_from_target,
      notes = EXCLUDED.notes,
      measured_by = EXCLUDED.measured_by,
      measured_at = NOW(),
      updated_at = NOW()
    RETURNING
      id,
      challenge_id,
      child_id,
      baseline_value,
      final_value,
      individual_target_value,
      individual_target_reached,
      repeated_or_improved_baseline,
      difference_from_baseline,
      difference_from_target,
      notes,
      measured_by,
      measured_at,
      created_at,
      updated_at
  `;

  const values = [
    data.challengeId,
    data.childId,
    data.baselineValue,
    data.finalValue,
    data.individualTargetValue,
    data.individualTargetReached,
    data.repeatedOrImprovedBaseline,
    data.differenceFromBaseline,
    data.differenceFromTarget,
    data.notes || null,
    data.measuredBy || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function updateChallengeResultCalculatedFields(data, client) {
  const executor = getExecutor(client);

  const query = `
    UPDATE sports_challenge_results
    SET
      individual_target_value = $3,
      individual_target_reached = $4,
      repeated_or_improved_baseline = $5,
      difference_from_baseline = $6,
      difference_from_target = $7,
      updated_at = NOW()
    WHERE challenge_id = $1
      AND child_id = $2
    RETURNING
      id,
      challenge_id,
      child_id,
      baseline_value,
      final_value,
      individual_target_value,
      individual_target_reached,
      repeated_or_improved_baseline,
      difference_from_baseline,
      difference_from_target,
      notes,
      measured_by,
      measured_at,
      created_at,
      updated_at
  `;

  const values = [
    data.challengeId,
    data.childId,
    data.individualTargetValue,
    data.individualTargetReached,
    data.repeatedOrImprovedBaseline,
    data.differenceFromBaseline,
    data.differenceFromTarget,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function getChallengeSummary(challengeId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      challenge_id,
      participants_count,
      final_results_count,
      baseline_total,
      group_target_total,
      final_total,
      group_target_reached,
      repeated_or_improved_count,
      repeated_or_improved_percentage,
      fail_safe_reached,
      final_status,
      target_reduction_percent,
      fail_safe_threshold_percent,
      calculated_at,
      created_at,
      updated_at
    FROM sports_challenge_summaries
    WHERE challenge_id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [challengeId]);
  return rows[0] || null;
}

async function upsertChallengeSummary(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO sports_challenge_summaries (
      challenge_id,
      participants_count,
      final_results_count,
      baseline_total,
      group_target_total,
      final_total,
      group_target_reached,
      repeated_or_improved_count,
      repeated_or_improved_percentage,
      fail_safe_reached,
      final_status,
      target_reduction_percent,
      fail_safe_threshold_percent,
      calculated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      NOW()
    )
    ON CONFLICT (challenge_id)
    DO UPDATE SET
      participants_count = EXCLUDED.participants_count,
      final_results_count = EXCLUDED.final_results_count,
      baseline_total = EXCLUDED.baseline_total,
      group_target_total = EXCLUDED.group_target_total,
      final_total = EXCLUDED.final_total,
      group_target_reached = EXCLUDED.group_target_reached,
      repeated_or_improved_count = EXCLUDED.repeated_or_improved_count,
      repeated_or_improved_percentage = EXCLUDED.repeated_or_improved_percentage,
      fail_safe_reached = EXCLUDED.fail_safe_reached,
      final_status = EXCLUDED.final_status,
      target_reduction_percent = EXCLUDED.target_reduction_percent,
      fail_safe_threshold_percent = EXCLUDED.fail_safe_threshold_percent,
      calculated_at = NOW(),
      updated_at = NOW()
    RETURNING
      id,
      challenge_id,
      participants_count,
      final_results_count,
      baseline_total,
      group_target_total,
      final_total,
      group_target_reached,
      repeated_or_improved_count,
      repeated_or_improved_percentage,
      fail_safe_reached,
      final_status,
      target_reduction_percent,
      fail_safe_threshold_percent,
      calculated_at,
      created_at,
      updated_at
  `;

  const values = [
    data.challengeId,
    data.participantsCount,
    data.finalResultsCount,
    data.baselineTotal,
    data.groupTargetTotal,
    data.finalTotal,
    data.groupTargetReached,
    data.repeatedOrImprovedCount,
    data.repeatedOrImprovedPercentage,
    data.failSafeReached,
    data.finalStatus,
    data.targetReductionPercent,
    data.failSafeThresholdPercent,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function getChallengeGroupId(challengeId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT group_id
    FROM sports_group_challenges
    WHERE id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [challengeId]);

  if (!rows[0]) {
    return null;
  }

  return rows[0].group_id;
}

module.exports = {
  listDefinitions,
  findDefinitionByCode,
  findDefinitionById,
  createDefinition,
  updateDefinition,
  updateDefinitionStatus,
  listGroupChallenges,
  countGroupChallenges,
  findChallengeById,
  findChallengeByIdWithDetails,
  findDuplicateChallenge,
  createChallenge,
  updateChallenge,
  updateChallengeStatus,
  getChildrenForChallengeGroup,
  getResultsForChallenge,
  upsertChallengeResult,
  updateChallengeResultCalculatedFields,
  getChallengeSummary,
  upsertChallengeSummary,
  getChallengeGroupId,
};
