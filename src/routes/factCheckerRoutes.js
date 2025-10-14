const express = require('express');
const factCheckerController = require('../controllers/factCheckerController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require fact-checker or admin authentication
router.use(authMiddleware, requireRole(['fact_checker', 'admin']));

router.get('/pending-claims', factCheckerController.getPendingClaims);
router.post('/submit-verdict', factCheckerController.submitVerdict);
router.get('/stats', factCheckerController.getStats);
router.get('/ai-suggestions', factCheckerController.getAISuggestions);
router.post('/approve-ai-verdict', factCheckerController.approveAIVerdict);

module.exports = router;
