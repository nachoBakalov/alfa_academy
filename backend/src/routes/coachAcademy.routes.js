const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');
const coachAcademyController = require('../controllers/coachAcademy.controller');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get(
  '/academies/:academyId/coaches',
  asyncHandler(coachAcademyController.listAcademyCoaches)
);
router.get('/coaches/:coachId', asyncHandler(coachAcademyController.listCoachAcademies));
router.post('/', asyncHandler(coachAcademyController.assignCoachToAcademy));
router.delete(
  '/:academyId/coaches/:coachId',
  asyncHandler(coachAcademyController.unassignCoachFromAcademy)
);

module.exports = router;
