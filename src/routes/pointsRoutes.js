const express = require('express');
const router = express.Router();
const pointsController = require('../controllers/pointsController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Get current user's points and streaks
router.get('/my-points', authMiddleware, pointsController.getUserPoints);

// Get current user's points history
router.get('/my-points/history', authMiddleware, pointsController.getPointsHistory);

// Get leaderboard
router.get('/leaderboard', pointsController.getLeaderboard);

// Admin: Get points statistics
router.get('/admin/statistics', authMiddleware, requireRole(['admin']), pointsController.getPointsStatistics);

// Admin: Reset user points
router.post('/admin/reset', authMiddleware, requireRole(['admin']), pointsController.resetUserPoints);

module.exports = router;