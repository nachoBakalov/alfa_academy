const { pool } = require('./src/db/postgres');
const crypto = require('crypto');

async function setup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Academy
    const resAcademy = await client.query("INSERT INTO academies (name, slug) VALUES ('Test Academy ' || NOW(), 'test-academy-' || extract(epoch from now())) RETURNING id");
    const academyId = resAcademy.rows[0].id;

    // 2. Season
    const resSeason = await client.query("INSERT INTO seasons (academy_id, name, start_date, end_date) VALUES ($1, 'Season 2024', '2024-01-01', '2024-12-31') RETURNING id", [academyId]);
    const seasonId = resSeason.rows[0].id;

    // 3. Group
    const resGroup = await client.query("INSERT INTO groups (season_id, name) VALUES ($1, 'Group A') RETURNING id", [seasonId]);
    const groupId = resGroup.rows[0].id;

    // 4. Child
    const resChild = await client.query("INSERT INTO children (academy_id, first_name, last_name, birth_date) VALUES ($1, 'John', 'Doe', '2015-05-05') RETURNING id", [academyId]);
    const childId = resChild.rows[0].id;

    // 5. Link child to group
    await client.query("INSERT INTO group_members (group_id, child_id) VALUES ($1, $2)", [groupId, childId]);

    // 6. Questionnaire template
    const resQ = await client.query(`
      INSERT INTO questionnaire_templates (academy_id, title, description, schema)
      VALUES ($1, 'Initial Assessment', 'Desc', $2)
      RETURNING id
    `, [academyId, JSON.stringify({
      questions: [
        { id: 'fav_sport', type: 'text', text: 'Favorite Sport', required: true },
        ...Array.from({length: 16}, (_, i) => ({ id: `q${i}`, type: 'score', text: `Question ${i}`, required: true }))
      ]
    })]);
    const templateId = resQ.rows[0].id;

    // 7. Assignment
    const resAssign = await client.query(`
      INSERT INTO questionnaire_assignments (season_id, questionnaire_template_id, title)
      VALUES ($1, $2, 'Assignment 1')
      RETURNING id
    `, [seasonId, templateId]);
    const assignmentId = resAssign.rows[0].id;

    // 8. Token
    const token = crypto.randomBytes(20).toString('hex');
    await client.query(`
      INSERT INTO questionnaire_tokens (child_id, questionnaire_assignment_id, token, status, expires_at)
      VALUES ($1, $2, $3, 'pending', NOW() + interval '7 days')
    `, [childId, assignmentId, token]);

    await client.query('COMMIT');
    console.log(JSON.stringify({ token }));
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
