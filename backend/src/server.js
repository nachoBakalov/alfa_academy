const app = require('./app');
const { env } = require('./config/env');
const { pool } = require('./db/postgres');

async function startServer() {
  try {
    // Placeholder check: pool is initialized from env config only.
    if (!pool) {
      throw new Error('Database pool is not initialized');
    }

    app.listen(env.PORT, () => {
      console.log(`Backend server listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
