const express = require('express');
const verdictController = require('../controllers/verdictController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Submit verdict (fact-checkers only)
router.post('/', requireRole(['fact_checker']), verdictController.submitVerdict);

// Get verdict for a claim
router.get('/claim/:id', verdictController.getVerdict);

// Get my verdicts (fact-checkers only)
router.get('/my-verdicts', requireRole(['fact_checker']), verdictController.getMyVerdicts);

// Get verdict statistics
router.get('/stats', requireRole(['fact_checker']), verdictController.getVerdictStats);

// Update verdict (fact-checkers only)
router.put('/:id', requireRole(['fact_checker']), verdictController.updateVerdict);

// Fact-checker AI verdict review routes
router.get('/ai-pending', requireRole(['fact_checker', 'admin']), verdictController.getPendingAIVerdicts);
router.put('/ai/:claimId', requireRole(['fact_checker', 'admin']), verdictController.editAIVerdict);

module.exports = router;