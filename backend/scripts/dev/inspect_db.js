const { pool } = require('../../src/db/postgres');

const tables = [
  'roles',
  'users',
  'academies',
  'seasons',
  'groups',
  'children',
  'questionnaire_tokens',
  'comfort_zone_profiles',
  'weekly_social_summaries',
  'sports_group_challenges',
];

async function inspectDb() {
  try {
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
      console.log(`${table}: ${rows[0].total}`);
    }
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

inspectDb();
