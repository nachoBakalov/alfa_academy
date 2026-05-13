const { env } = require('../src/config/env');
const { pool } = require('../src/db/postgres');
const { hashPassword } = require('../src/utils/password');
const userRepository = require('../src/repositories/user.repository');

function assertSuperAdminEnv() {
  if (!env.SUPER_ADMIN_EMAIL) {
    throw new Error('SUPER_ADMIN_EMAIL is required');
  }

  if (!env.SUPER_ADMIN_PASSWORD) {
    throw new Error('SUPER_ADMIN_PASSWORD is required');
  }

  if (!env.SUPER_ADMIN_FIRST_NAME) {
    throw new Error('SUPER_ADMIN_FIRST_NAME is required');
  }

  if (!env.SUPER_ADMIN_LAST_NAME) {
    throw new Error('SUPER_ADMIN_LAST_NAME is required');
  }
}

async function findSuperAdminRoleId() {
  const query = 'SELECT id FROM roles WHERE code = $1 LIMIT 1';
  const { rows } = await pool.query(query, ['super_admin']);
  return rows[0] ? rows[0].id : null;
}

async function main() {
  assertSuperAdminEnv();

  const roleId = await findSuperAdminRoleId();

  if (!roleId) {
    throw new Error(
      'Role super_admin not found. Run src/db/schema.sql and src/db/seed.sql first.'
    );
  }

  const existingUser = await userRepository.findByEmail(env.SUPER_ADMIN_EMAIL);

  if (existingUser) {
    console.log('Super admin already exists. Skipping create.');
    return;
  }

  const passwordHash = await hashPassword(env.SUPER_ADMIN_PASSWORD);

  await userRepository.createUser({
    roleId,
    email: env.SUPER_ADMIN_EMAIL,
    passwordHash,
    firstName: env.SUPER_ADMIN_FIRST_NAME,
    lastName: env.SUPER_ADMIN_LAST_NAME,
    isActive: true,
  });

  console.log('Super admin created successfully.');
}

main()
  .catch((error) => {
    console.error('Failed to create super admin:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });