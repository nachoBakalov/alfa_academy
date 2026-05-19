const { pool } = require('../../src/db/postgres');

async function createFixture() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const suffix = Date.now();

    const academyRes = await client.query(
      `INSERT INTO academies (name, is_active) VALUES ($1, TRUE) RETURNING id`,
      [`Dev Academy ${suffix}`]
    );
    const academyId = academyRes.rows[0].id;

    const seasonRes = await client.query(
      `INSERT INTO seasons (academy_id, name, starts_on, ends_on, is_active)
       VALUES ($1, $2, '2026-01-01'::date, '2026-12-31'::date, TRUE)
       RETURNING id`,
      [academyId, `Dev Season ${suffix}`]
    );
    const seasonId = seasonRes.rows[0].id;

    const groupRes = await client.query(
      `INSERT INTO groups (season_id, name, is_active) VALUES ($1, $2, TRUE) RETURNING id`,
      [seasonId, `Dev Group ${suffix}`]
    );
    const groupId = groupRes.rows[0].id;

    const childRes = await client.query(
      `INSERT INTO children (first_name, last_name, is_active) VALUES ('Dev', $1, TRUE) RETURNING id`,
      [`Child ${suffix}`]
    );
    const childId = childRes.rows[0].id;

    await client.query(
      `INSERT INTO child_group_assignments (child_id, group_id, starts_on)
       VALUES ($1, $2, CURRENT_DATE)`,
      [childId, groupId]
    );

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          academyId,
          seasonId,
          groupId,
          childId,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

createFixture();
