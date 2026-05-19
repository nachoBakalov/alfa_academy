const { Router } = require('express');
const creativeChallengeController = require('../controllers/creativeChallenge.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/challenges', asyncHandler(creativeChallengeController.listChallenges));
router.post('/challenges', asyncHandler(creativeChallengeController.createChallenge));
router.get('/challenges/:challengeId', asyncHandler(creativeChallengeController.getChallengeById));
router.patch('/challenges/:challengeId', asyncHandler(creativeChallengeController.updateChallenge));
router.put(
  '/challenges/:challengeId/groups/:groupId/result',
  asyncHandler(creativeChallengeController.saveGroupResult)
);
router.patch(
  '/challenges/:challengeId/status',
  asyncHandler(creativeChallengeController.updateChallengeStatus)
);

module.exports = router;
