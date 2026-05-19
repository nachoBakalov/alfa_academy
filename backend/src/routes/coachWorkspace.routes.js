const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');
const coachWorkspaceController = require('../controllers/coachWorkspace.controller');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/my-groups', asyncHandler(coachWorkspaceController.getMyGroups));
router.get('/academy-children', asyncHandler(coachWorkspaceController.getAcademyChildren));

module.exports = router;
