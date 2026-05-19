const { Router } = require('express');
const seasonController = require('../controllers/season.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/', asyncHandler(seasonController.listSeasons));
router.get('/:id/children', asyncHandler(seasonController.listSeasonChildren));
router.get('/:id', asyncHandler(seasonController.getSeasonById));
router.post('/', asyncHandler(seasonController.createSeason));
router.patch('/:id', asyncHandler(seasonController.updateSeason));
router.patch('/:id/status', asyncHandler(seasonController.updateSeasonStatus));

module.exports = router;
