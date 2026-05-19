const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');
const statisticsController = require('../controllers/statistics.controller');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/group-overview', asyncHandler(statisticsController.getGroupOverview));
router.get('/group-leaderboard', asyncHandler(statisticsController.getGroupLeaderboard));

module.exports = router;
