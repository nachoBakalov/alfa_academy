const { pool } = require('../db/postgres');

function getExecutor(client) {
  return client || pool;
}

async function createSubmission(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO questionnaire_submissions (
      questionnaire_id,
      questionnaire_token_id,
      child_id,
      submitted_by_name,
      submitted_by_relation
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, questionnaire_id, questionnaire_token_id, child_id, submitted_by_name, submitted_by_relation, submitted_at, created_at
  `;

  const values = [
    data.questionnaireId,
    data.questionnaireTokenId,
    data.childId,
    data.submittedByName || null,
    data.submittedByRelation,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function createAnswer(data, client) {
  const executor = getExecutor(client);

  const query = `
    INSERT INTO questionnaire_answers (
      submission_id,
      question_id,
      score_value,
      text_value,
      note,
      zone,
      interpretation
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, submission_id, question_id, score_value, text_value, note, zone, interpretation, created_at
  `;

  const values = [
    data.submissionId,
    data.questionId,
    data.scoreValue ?? null,
    data.textValue ?? null,
    data.note ?? null,
    data.zone ?? null,
    data.interpretation ?? null,
  ];

  const { rows } = await executor.query(query, values);
  return rows[0] || null;
}

async function findSubmissionByTokenId(tokenId, client) {
  const executor = getExecutor(client);

  const query = `
    SELECT
      id,
      questionnaire_id,
      questionnaire_token_id,
      child_id,
      submitted_by_name,
      submitted_by_relation,
      submitted_at,
      created_at
    FROM questionnaire_submissions
    WHERE questionnaire_token_id = $1
    LIMIT 1
  `;

  const { rows } = await executor.query(query, [tokenId]);
  return rows[0] || null;
}

module.exports = {
  createSubmission,
  createAnswer,
  findSubmissionByTokenId,
};
