const { Router } = require('express');
const { env } = require('../config/env');

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: env.NODE_ENV,
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
