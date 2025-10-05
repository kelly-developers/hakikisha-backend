const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const FactCheckerActivity = require('../models/FactCheckerActivity');
const logger = require('../utils/logger');

class DashboardController {
  async getFactCheckerDashboard(req, res, next) {
    try {
      const factCheckerId = req.user.userId;
      
      // Get assigned claims
      const assignedClaims = await Claim.findByFactChecker(factCheckerId, 'human_review', 10, 0);
      
      // Get recent verdicts
      const recentVerdicts = await Verdict.findByFactChecker(factCheckerId, 5, 0);
      
      // Get activity stats
      const activityStats = await FactCheckerActivity.getStats(factCheckerId, '7 days');
      
      // Get performance metrics
      const performance = await Verdict.getStats(factCheckerId, '30 days');

      res.json({
        assigned_claims: assignedClaims,
        recent_verdicts: recentVerdicts,
        activity_stats: activityStats,
        performance_metrics: performance,
        message: 'Dashboard data retrieved successfully'
      });

    } catch (error) {
      logger.error('Get fact checker dashboard error:', error);
      next(error);
    }
  }

  async assignClaim(req, res, next) {
    try {
      const { claimId } = req.params;
      const factCheckerId = req.user.userId;

      const claim = await Claim.findById(claimId);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      if (claim.status !== 'pending' && claim.status !== 'ai_approved') {
        return res.status(400).json({ error: 'Claim cannot be assigned in its current status' });
      }

      // Assign claim to fact-checker
      const updatedClaim = await Claim.assignToFactChecker(claimId, factCheckerId);

      // Log activity
      await FactCheckerActivity.create({
        fact_checker_id: factCheckerId,
        activity_type: 'claim_assignment',
        claim_id: claimId,
        start_time: new Date()
      });

      logger.info(`Claim ${claimId} assigned to fact-checker ${factCheckerId}`);

      res.json({
        message: 'Claim assigned successfully',
        claim: updatedClaim
      });

    } catch (error) {
      logger.error('Assign claim error:', error);
      next(error);
    }
  }

  async startReviewSession(req, res, next) {
    try {
      const { claimId } = req.body;

      const activity = await FactCheckerActivity.create({
        fact_checker_id: req.user.userId,
        activity_type: 'claim_review',
        claim_id: claimId,
        start_time: new Date()
      });

      res.json({
        message: 'Review session started',
        session_id: activity.id
      });

    } catch (error) {
      logger.error('Start review session error:', error);
      next(error);
    }
  }

  async endReviewSession(req, res, next) {
    try {
      const { sessionId } = req.params;

      const activity = await FactCheckerActivity.endSession(sessionId);

      res.json({
        message: 'Review session ended',
        session_duration: activity.duration
      });

    } catch (error) {
      logger.error('End review session error:', error);
      next(error);
    }
  }

  async getClaimQueue(req, res, next) {
    try {
      const { status = 'human_review', priority, category, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const claims = await Claim.findByStatus(status, limit, offset, { priority, category });
      const total = await Claim.countByStatus(status, { priority, category });

      res.json({
        claims,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get claim queue error:', error);
      next(error);
    }
  }
}

module.exports = new DashboardController();