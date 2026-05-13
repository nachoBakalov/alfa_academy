const { Router } = require('express');
const questionnaireController = require('../controllers/questionnaire.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get(
  '/children/:childId/comfort-zone',
  asyncHandler(questionnaireController.getChildComfortZoneProfile)
);

module.exports = router;
