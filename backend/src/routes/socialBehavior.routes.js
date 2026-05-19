const { Router } = require('express');
const socialBehaviorController = require('../controllers/socialBehavior.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get(
  '/groups/:groupId/active-days',
  asyncHandler(socialBehaviorController.getGroupActiveDays)
);
router.put(
  '/groups/:groupId/active-days',
  asyncHandler(socialBehaviorController.updateGroupActiveDays)
);
router.get('/groups/:groupId/weekly', asyncHandler(socialBehaviorController.getWeeklySummary));
router.post(
  '/groups/:groupId/weekly/recalculate',
  asyncHandler(socialBehaviorController.recalculateWeeklySummary)
);
router.get(
  '/groups/:groupId/daily/summary',
  asyncHandler(socialBehaviorController.getDailySummary)
);
router.get('/groups/:groupId/daily', asyncHandler(socialBehaviorController.getDailyEvaluationScreen));
router.put('/groups/:groupId/daily', asyncHandler(socialBehaviorController.saveDailyEvaluations));

module.exports = router;
