const { Router } = require('express');
const childController = require('../controllers/child.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/', asyncHandler(childController.listChildren));
router.get('/:id/profile', asyncHandler(childController.getChildProfile));
router.get('/:id', asyncHandler(childController.getChildById));
router.post('/', asyncHandler(childController.createChild));
router.patch('/:id', asyncHandler(childController.updateChild));
router.patch('/:id/status', asyncHandler(childController.updateChildStatus));
router.post(
  '/:id/questionnaire-token',
  asyncHandler(childController.generateQuestionnaireToken)
);
router.post(
  '/:id/questionnaire-token/send-email',
  asyncHandler(childController.sendQuestionnaireEmail)
);
router.post('/:id/group-assignment', asyncHandler(childController.assignChildToGroup));

module.exports = router;
