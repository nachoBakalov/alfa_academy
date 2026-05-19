const { Router } = require('express');
const reportController = require('../controllers/report.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/dashboard', asyncHandler(reportController.getDashboard));
router.get('/groups/:groupId/dashboard', asyncHandler(reportController.getGroupDashboard));
router.get(
  '/groups/:groupId/children-overview',
  asyncHandler(reportController.getGroupChildrenOverview)
);

module.exports = router;
