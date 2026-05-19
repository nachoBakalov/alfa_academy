const { pool } = require('../../src/db/postgres');

async function run() {
  const payload = {
    code: 'utf8_check',
    name: 'Проверка кирилица',
    description: 'Тестово описание на кирилица',
    unit: 'reps',
    resultDirection: 'higher_is_better',
    targetType: 'maintain_with_tolerance',
    defaultTargetReductionPercent: 0.1,
    defaultFailSafeThresholdPercent: 0.5,
    isActive: true,
  };

  try {
    await pool.query(
      `
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        unit = EXCLUDED.unit,
        result_direction = EXCLUDED.result_direction,
        target_type = EXCLUDED.target_type,
        default_target_reduction_percent = EXCLUDED.default_target_reduction_percent,
        default_fail_safe_threshold_percent = EXCLUDED.default_fail_safe_threshold_percent,
        is_active = EXCLUDED.is_active
      `,
      [
        payload.code,
        payload.name,
        payload.description,
        payload.unit,
        payload.resultDirection,
        payload.targetType,
        payload.defaultTargetReductionPercent,
        payload.defaultFailSafeThresholdPercent,
        payload.isActive,
      ]
    );

    const { rows } = await pool.query(
      `
      SELECT code, name, description
      FROM sports_challenge_definitions
      WHERE code = $1
      LIMIT 1
      `,
      [payload.code]
    );

    const row = rows[0] || null;

    if (!row) {
      console.log('utf8_check row not found');
      return;
    }

    console.log('code:', row.code);
    console.log('name:', row.name);
    console.log('description:', row.description);
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error('UTF-8 check failed:', error.message);
  process.exitCode = 1;
});
