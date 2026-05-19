const { Router } = require('express');
const sportsChallengeController = require('../controllers/sportsChallenge.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/definitions', asyncHandler(sportsChallengeController.listDefinitions));
router.post('/definitions', asyncHandler(sportsChallengeController.createDefinition));
router.patch(
  '/definitions/:definitionId',
  asyncHandler(sportsChallengeController.updateDefinition)
);
router.patch(
  '/definitions/:definitionId/status',
  asyncHandler(sportsChallengeController.updateDefinitionStatus)
);
router.get(
  '/groups/:groupId/challenges',
  asyncHandler(sportsChallengeController.listGroupChallenges)
);
router.post(
  '/groups/:groupId/challenges',
  asyncHandler(sportsChallengeController.createGroupChallenge)
);
router.get('/challenges/:challengeId', asyncHandler(sportsChallengeController.getChallengeById));
router.patch('/challenges/:challengeId', asyncHandler(sportsChallengeController.updateChallenge));
router.patch(
  '/challenges/:challengeId/status',
  asyncHandler(sportsChallengeController.updateChallengeStatus)
);
router.put(
  '/challenges/:challengeId/results',
  asyncHandler(sportsChallengeController.saveChallengeResults)
);
router.post(
  '/challenges/:challengeId/recalculate',
  asyncHandler(sportsChallengeController.recalculateChallengeSummary)
);

module.exports = router;
