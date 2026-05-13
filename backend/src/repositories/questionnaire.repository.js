const { pool } = require('../db/postgres');

async function getActiveQuestionnaireByCode(code) {
  const query = `
    SELECT
      id,
      code,
      version,
      title,
      description,
      is_active,
      created_at,
      updated_at
    FROM questionnaires
    WHERE code = $1
      AND is_active = TRUE
    ORDER BY version DESC, id DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [code]);
  return rows[0] || null;
}

async function getQuestionnaireForm(questionnaireId) {
  const query = `
    SELECT
      q.id AS questionnaire_id,
      q.code AS questionnaire_code,
      q.version AS questionnaire_version,
      q.title AS questionnaire_title,
      q.description AS questionnaire_description,
      s.code AS sphere_code,
      s.name AS sphere_name,
      s.display_order AS sphere_order,
      ss.code AS subsphere_code,
      ss.name AS subsphere_name,
      ss.display_order AS subsphere_order,
      qq.code AS question_code,
      qq.label AS question_label,
      qq.input_type AS question_input_type,
      qq.is_required AS question_is_required,
      qq.display_order AS question_order,
      COALESCE(a.scale_type, 'text_only') AS action_scale_type,
      COALESCE(a.has_note, FALSE) AS action_has_note
    FROM questionnaire_questions qq
    INNER JOIN questionnaires q ON q.id = qq.questionnaire_id
    LEFT JOIN comfort_zone_actions a ON a.id = qq.action_id
    LEFT JOIN comfort_zone_spheres s ON s.id = a.sphere_id
    LEFT JOIN comfort_zone_subspheres ss ON ss.id = a.subsphere_id
    WHERE qq.questionnaire_id = $1
      AND qq.is_active = TRUE
      AND q.is_active = TRUE
    ORDER BY
      COALESCE(s.display_order, 9999) ASC,
      COALESCE(ss.display_order, 9999) ASC,
      qq.display_order ASC,
      qq.id ASC
  `;

  const { rows } = await pool.query(query, [questionnaireId]);
  return rows;
}

async function getQuestionsByQuestionnaireId(questionnaireId) {
  const query = `
    SELECT
      qq.id,
      qq.questionnaire_id,
      qq.action_id,
      qq.code,
      qq.label,
      qq.help_text,
      qq.input_type,
      qq.is_required,
      qq.display_order,
      qq.metadata,
      qq.is_active,
      COALESCE(a.scale_type, 'text_only') AS scale_type,
      COALESCE(a.has_note, FALSE) AS has_note
    FROM questionnaire_questions qq
    LEFT JOIN comfort_zone_actions a ON a.id = qq.action_id
    WHERE qq.questionnaire_id = $1
      AND qq.is_active = TRUE
    ORDER BY qq.display_order ASC, qq.id ASC
  `;

  const { rows } = await pool.query(query, [questionnaireId]);
  return rows;
}

async function findQuestionByCode(questionnaireId, code) {
  const query = `
    SELECT
      qq.id,
      qq.questionnaire_id,
      qq.action_id,
      qq.code,
      qq.label,
      qq.help_text,
      qq.input_type,
      qq.is_required,
      qq.display_order,
      qq.metadata,
      qq.is_active,
      COALESCE(a.scale_type, 'text_only') AS scale_type,
      COALESCE(a.has_note, FALSE) AS has_note
    FROM questionnaire_questions qq
    LEFT JOIN comfort_zone_actions a ON a.id = qq.action_id
    WHERE qq.questionnaire_id = $1
      AND qq.code = $2
      AND qq.is_active = TRUE
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [questionnaireId, code]);
  return rows[0] || null;
}

module.exports = {
  getActiveQuestionnaireByCode,
  getQuestionnaireForm,
  getQuestionsByQuestionnaireId,
  findQuestionByCode,
};
