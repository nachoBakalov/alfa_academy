const { pool } = require('./src/db/postgres');
async function inspect() {
  const tables = ['academies', 'seasons', 'groups', 'children', 'group_members', 'questionnaire_templates', 'questionnaire_assignments', 'questionnaire_tokens'];
  for (const table of tables) {
    try {
      const { rows } = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
      console.log(`${table}: ${rows.map(r => r.column_name).join(', ')}`);
    } catch (e) {
      console.log(`${table}: ERROR ${e.message}`);
    }
  }
  await pool.end();
}
inspect();
