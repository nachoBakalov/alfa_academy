const { Router } = require('express');
const userController = require('../controllers/user.controller');
const asyncHandler = require('../utils/asyncHandler');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.use(requireRoles('super_admin', 'admin'));

router.get('/', asyncHandler(userController.listUsers));
router.get('/:id', asyncHandler(userController.getUserById));
router.post('/', asyncHandler(userController.createUser));
router.patch('/:id', asyncHandler(userController.updateUser));
router.patch('/:id/password', asyncHandler(userController.resetUserPassword));
router.patch('/:id/status', asyncHandler(userController.updateUserStatus));

module.exports = router;
