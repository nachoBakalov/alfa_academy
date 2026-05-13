const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../src/db/postgres');

async function runSqlFile(relativePath) {
  const filePath = path.resolve(process.cwd(), relativePath);
  const sql = await fs.readFile(filePath, 'utf8');

  console.log(`Running ${relativePath}...`);
  await pool.query(sql);
  console.log(`Done: ${relativePath}`);
}

async function main() {
  await runSqlFile('src/db/schema.sql');
  await runSqlFile('src/db/seed.sql');

  console.log('Database setup completed successfully.');
}

main()
  .catch((error) => {
    console.error('Database setup failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });