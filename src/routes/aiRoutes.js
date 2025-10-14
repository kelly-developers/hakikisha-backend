const express = require('express');
const aiController = require('../controllers/aiController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, requireRole(['admin']));

router.post('/verify-claim', aiController.processClaimWithAI);
router.get('/verdicts/:claimId', aiController.getAIVerdict);

module.exports = router;
