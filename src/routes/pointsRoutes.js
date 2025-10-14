const express = require('express');
const { PointsService } = require('../services/pointsService');
const { authMiddleware } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get user's current points
router.get('/my-points', async (req, res) => {
  try {
    const points = await PointsService.getUserPoints(req.user.userId);
    res.json({
      success: true,
      points
    });
  } catch (error) {
    logger.error('Get points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get points',
      code: 'SERVER_ERROR'
    });
  }
});

// Get points history
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const history = await PointsService.getPointsHistory(req.user.userId, parseInt(limit));
    res.json({
      success: true,
      history
    });
  } catch (error) {
    logger.error('Get points history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get points history',
      code: 'SERVER_ERROR'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const leaderboard = await PointsService.getLeaderboard(parseInt(limit));
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      code: 'SERVER_ERROR'
    });
  }
});

module.exports = router;
