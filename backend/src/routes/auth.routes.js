const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middlewares/authenticate');
const requireRoles = require('../middlewares/requireRoles');

const router = Router();

router.post('/login', asyncHandler(authController.login));

router.get(
  '/me',
  authenticate,
  requireRoles('super_admin', 'admin', 'coach', 'manager'),
  asyncHandler(authController.me)
);

module.exports = router;