const { Router } = require('express');
const publicQuestionnaireController = require('../controllers/publicQuestionnaire.controller');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.get('/:token', asyncHandler(publicQuestionnaireController.getByToken));
router.post('/:token/submit', asyncHandler(publicQuestionnaireController.submit));

module.exports = router;
