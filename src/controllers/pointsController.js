const { PointsService } = require('../services/pointsService');
const logger = require('../utils/logger');

const getUserPoints = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const points = await PointsService.getUserPoints(userId);
    const history = await PointsService.getPointsHistory(userId, 20);
    const rank = await PointsService.getUserRank(userId);

    res.json({
      success: true,
      data: {
        points,
        recentHistory: history,
        rank
      }
    });
  } catch (error) {
    logger.error('Get user points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user points'
    });
  }
};

const getPointsHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50 } = req.query;

    const history = await PointsService.getPointsHistory(userId, parseInt(limit));

    res.json({
      success: false,
      error: 'Failed to get points history'
    });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const leaderboard = await PointsService.getLeaderboard(parseInt(limit));

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
};

const getPointsStatistics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const statistics = await PointsService.getPointsStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Get points statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get points statistics'
    });
  }
};

const resetUserPoints = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const result = await PointsService.resetUserPoints(userId, reason || 'Admin reset');

    res.json({
      success: true,
      message: 'User points reset successfully',
      data: result
    });
  } catch (error) {
    logger.error('Reset user points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset user points'
    });
  }
};

module.exports = {
  getUserPoints,
  getPointsHistory,
  getLeaderboard,
  getPointsStatistics,
  resetUserPoints
};