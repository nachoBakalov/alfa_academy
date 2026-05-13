const { pool } = require('../db/postgres');

async function getChildProfileBase(childId) {
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
      c.created_at,
      c.updated_at,
      g.id AS group_id,
      g.name AS group_name,
      s.id AS season_id,
      s.name AS season_name,
      a.id AS academy_id,
      a.name AS academy_name
    FROM children c
    LEFT JOIN child_group_assignments cga
      ON cga.child_id = c.id
      AND cga.ends_on IS NULL
    LEFT JOIN groups g ON g.id = cga.group_id
    LEFT JOIN seasons s ON s.id = g.season_id
    LEFT JOIN academies a ON a.id = s.academy_id
    WHERE c.id = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [childId]);
  return rows[0] || null;
}

async function getLatestQuestionnaireStatus(childId) {
  const query = `
    SELECT
      status,
      expires_at,
      submitted_at,
      token,
      created_at
    FROM questionnaire_tokens
    WHERE child_id = $1
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [childId]);
  return rows[0] || null;
}

async function getLatestComfortZoneProfile(childId) {
  const query = `
    SELECT
      id,
      child_id,
      source_submission_id,
      completed_by_type,
      completed_by_name,
      completed_at,
      created_at
    FROM comfort_zone_profiles
    WHERE child_id = $1
    ORDER BY completed_at DESC, id DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [childId]);
  return rows[0] || null;
}

async function getComfortZoneScores(profileId) {
  const query = `
    SELECT
      cs.id,
      cs.profile_id,
      cs.action_id,
      cs.score_value,
      cs.zone,
      cs.interpretation,
      cs.note,
      s.code AS sphere_code,
      s.name AS sphere_name,
      s.display_order AS sphere_order,
      ss.code AS subsphere_code,
      ss.name AS subsphere_name,
      ss.display_order AS subsphere_order,
      a.code AS action_code,
      a.label AS action_label,
      a.display_order AS action_order
    FROM comfort_zone_scores cs
    INNER JOIN comfort_zone_actions a ON a.id = cs.action_id
    INNER JOIN comfort_zone_spheres s ON s.id = a.sphere_id
    LEFT JOIN comfort_zone_subspheres ss ON ss.id = a.subsphere_id
    WHERE cs.profile_id = $1
    ORDER BY
      s.display_order ASC,
      COALESCE(ss.display_order, 9999) ASC,
      a.display_order ASC,
      cs.id ASC
  `;

  const { rows } = await pool.query(query, [profileId]);
  return rows;
}

async function getComfortZoneTextAnswers(sourceSubmissionId) {
  const query = `
    SELECT
      qq.code AS question_code,
      qq.label,
      qa.text_value
    FROM questionnaire_answers qa
    INNER JOIN questionnaire_questions qq ON qq.id = qa.question_id
    WHERE qa.submission_id = $1
      AND qq.input_type = 'text'
      AND qa.text_value IS NOT NULL
      AND LENGTH(TRIM(qa.text_value)) > 0
    ORDER BY qq.display_order ASC, qq.id ASC
  `;

  const { rows } = await pool.query(query, [sourceSubmissionId]);
  return rows;
}

module.exports = {
  getChildProfileBase,
  getLatestQuestionnaireStatus,
  getLatestComfortZoneProfile,
  getComfortZoneScores,
  getComfortZoneTextAnswers,
};
