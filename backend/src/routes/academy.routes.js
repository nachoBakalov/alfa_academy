const { Router } = require('express');
const academyController = require('../controllers/academy.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin', 'manager', 'coach'));

router.get('/', asyncHandler(academyController.listAcademies));
router.get('/:id/children', asyncHandler(academyController.listAcademyChildren));
router.get('/:id', asyncHandler(academyController.getAcademyById));
router.post('/', asyncHandler(academyController.createAcademy));
router.patch('/:id', asyncHandler(academyController.updateAcademy));
router.patch('/:id/status', asyncHandler(academyController.updateAcademyStatus));

module.exports = router;
