const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function createProfile(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO comfort_zone_profiles (
      child_id,
      source_submission_id,
      completed_by_type,
      completed_by_name,
      completed_at
    )
    VALUES ($1, $2, $3, $4, COALESCE($5, NOW()))
    RETURNING id, child_id, source_submission_id, completed_by_type, completed_by_name, completed_at, created_at
  `;

  const values = [
    data.childId,
    data.sourceSubmissionId,
    data.completedByType,
    data.completedByName || null,
    data.completedAt || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function createScore(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO comfort_zone_scores (
      profile_id,
      action_id,
      source_answer_id,
      score_value,
      zone,
      interpretation,
      note
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, profile_id, action_id, source_answer_id, score_value, zone, interpretation, note, created_at
  `;

  const values = [
    data.profileId,
    data.actionId,
    data.sourceAnswerId || null,
    data.scoreValue,
    data.zone,
    data.interpretation || null,
    data.note || null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function getLatestProfileByChildId(childId) {
  const query = `
    SELECT
      p.id,
      p.child_id,
      p.source_submission_id,
      p.completed_by_type,
      p.completed_by_name,
      p.completed_at,
      p.created_at,
      c.first_name AS child_first_name,
      c.last_name AS child_last_name
    FROM comfort_zone_profiles p
    INNER JOIN children c ON c.id = p.child_id
    WHERE p.child_id = $1
    ORDER BY p.completed_at DESC, p.id DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [childId]);
  return rows[0] || null;
}

async function getProfileScores(profileId) {
  const query = `
    SELECT
      cs.id,
      cs.profile_id,
      cs.action_id,
      cs.source_answer_id,
      cs.score_value,
      cs.zone,
      cs.interpretation,
      cs.note,
      cs.created_at,
      a.code AS action_code,
      a.label AS action_label,
      s.code AS sphere_code,
      s.name AS sphere_name,
      s.display_order AS sphere_order
    FROM comfort_zone_scores cs
    INNER JOIN comfort_zone_actions a ON a.id = cs.action_id
    INNER JOIN comfort_zone_spheres s ON s.id = a.sphere_id
    WHERE cs.profile_id = $1
    ORDER BY s.display_order ASC, a.display_order ASC, cs.id ASC
  `;

  const { rows } = await pool.query(query, [profileId]);
  return rows;
}

module.exports = {
  createProfile,
  createScore,
  getLatestProfileByChildId,
  getProfileScores,
};
