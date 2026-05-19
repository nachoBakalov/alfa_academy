const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');
const coachSeasonController = require('../controllers/coachSeason.controller');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/seasons/:seasonId/coaches', asyncHandler(coachSeasonController.listSeasonCoaches));
router.get('/coaches/:coachId', asyncHandler(coachSeasonController.listCoachSeasons));
router.post('/', asyncHandler(coachSeasonController.assignCoachToSeason));
router.delete(
  '/:seasonId/coaches/:coachId',
  asyncHandler(coachSeasonController.unassignCoachFromSeason)
);

module.exports = router;
