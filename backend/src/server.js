const app = require('./app');
const { env } = require('./config/env');
const { pool } = require('./db/postgres');

let server;
let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Graceful shutdown failed:', error.message);
    process.exit(1);
  }
}

async function startServer() {
  try {
    // Placeholder check: pool is initialized from env config only.
    if (!pool) {
      throw new Error('Database pool is not initialized');
    }

    server = app.listen(env.PORT, () => {
      console.log(`Backend server listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

startServer();
