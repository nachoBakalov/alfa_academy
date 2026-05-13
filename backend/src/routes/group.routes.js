const { Router } = require('express');
const groupController = require('../controllers/group.controller');
const coachGroupController = require('../controllers/coachGroup.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/', asyncHandler(groupController.listGroups));
router.get('/:id', asyncHandler(groupController.getGroupById));
router.post('/', asyncHandler(groupController.createGroup));
router.patch('/:id', asyncHandler(groupController.updateGroup));
router.patch('/:id/status', asyncHandler(groupController.updateGroupStatus));

router.get('/:id/coaches', asyncHandler(coachGroupController.listCoachesForGroup));
router.post('/:id/coaches', asyncHandler(coachGroupController.assignCoachToGroup));
router.patch('/:id/coaches/:coachId', asyncHandler(coachGroupController.updateCoachAssignment));
router.delete('/:id/coaches/:coachId', asyncHandler(coachGroupController.unassignCoachFromGroup));

module.exports = router;
