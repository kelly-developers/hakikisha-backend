const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Fact-checker dashboard
router.get('/fact-checker', requireRole(['fact_checker']), dashboardController.getFactCheckerDashboard);

// Claim assignment and management
router.post('/claims/:claimId/assign', requireRole(['fact_checker']), dashboardController.assignClaim);
router.get('/claims/queue', requireRole(['fact_checker']), dashboardController.getClaimQueue);

// Review sessions
router.post('/sessions/start', requireRole(['fact_checker']), dashboardController.startReviewSession);
router.put('/sessions/:sessionId/end', requireRole(['fact_checker']), dashboardController.endReviewSession);

module.exports = router;