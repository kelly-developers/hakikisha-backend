const FactChecker = require('../models/FactChecker');
const User = require('../models/User');
const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const FactCheckerActivity = require('../models/FactCheckerActivity');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class FactCheckerController {
  async applyToBecomeFactChecker(req, res, next) {
    try {
      const { expertise_areas, additional_info } = req.body;
      const userId = req.user.userId;

      // Check if user is already a fact checker
      const existingFactChecker = await FactChecker.findByUserId(userId);
      if (existingFactChecker) {
        return res.status(409).json({ 
          error: 'You have already applied or are already a fact checker' 
        });
      }

      // Create fact checker application
      const factCheckerData = {
        user_id: userId,
        expertise_areas: expertise_areas || [],
        verification_status: 'pending',
        additional_info: additional_info || ''
      };

      const factChecker = await FactChecker.create(factCheckerData);

      // Update user role to fact_checker (pending approval)
      await User.update(userId, { role: Constants.ROLES.FACT_CHECKER });

      logger.info(`Fact checker application submitted: ${userId}`);

      res.status(201).json({
        message: 'Application submitted successfully. Waiting for admin approval.',
        application: {
          id: factChecker.id,
          status: factChecker.verification_status,
          submitted_at: factChecker.joined_at
        }
      });

    } catch (error) {
      logger.error('Fact checker application error:', error);
      next(error);
    }
  }

  async getFactCheckerProfile(req, res, next) {
    try {
      const factChecker = await FactChecker.findByUserId(req.user.userId);
      
      if (!factChecker) {
        return res.status(404).json({ error: 'Fact checker profile not found' });
      }

      // Get user details
      const user = await User.findById(req.user.userId);
      const { password_hash, verification_token, ...userProfile } = user;

      res.json({
        fact_checker: factChecker,
        user: userProfile
      });

    } catch (error) {
      logger.error('Get fact checker profile error:', error);
      next(error);
    }
  }

  async updateFactCheckerProfile(req, res, next) {
    try {
      const { expertise_areas, additional_info } = req.body;
      const updates = {};

      if (expertise_areas !== undefined) updates.expertise_areas = expertise_areas;
      if (additional_info !== undefined) updates.additional_info = additional_info;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const factChecker = await FactChecker.findByUserId(req.user.userId);
      if (!factChecker) {
        return res.status(404).json({ error: 'Fact checker profile not found' });
      }

      const updatedProfile = await FactChecker.update(factChecker.id, updates);

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile
      });

    } catch (error) {
      logger.error('Update fact checker profile error:', error);
      next(error);
    }
  }

  async getPerformanceStats(req, res, next) {
    try {
      const { timeframe = '30 days' } = req.query;

      const factChecker = await FactChecker.findByUserId(req.user.userId);
      if (!factChecker) {
        return res.status(404).json({ error: 'Fact checker profile not found' });
      }

      const performanceStats = await FactChecker.getPerformanceStats(factChecker.id, timeframe);
      const verdictStats = await Verdict.getStats(factChecker.id, timeframe);
      const activityStats = await FactCheckerActivity.getStats(factChecker.id, timeframe);

      res.json({
        performance: performanceStats,
        verdicts: verdictStats,
        activity: activityStats,
        timeframe
      });

    } catch (error) {
      logger.error('Get performance stats error:', error);
      next(error);
    }
  }

  async getAssignedClaims(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const factChecker = await FactChecker.findByUserId(req.user.userId);
      if (!factChecker) {
        return res.status(404).json({ error: 'Fact checker profile not found' });
      }

      const claims = await Claim.findByFactChecker(factChecker.id, status, limit, offset);
      const total = await Claim.countByFactChecker(factChecker.id, status);

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
      logger.error('Get assigned claims error:', error);
      next(error);
    }
  }

  async getFactCheckerLeaderboard(req, res, next) {
    try {
      const { timeframe = '30 days', limit = 10 } = req.query;

      const leaderboard = await FactChecker.getLeaderboard(timeframe, parseInt(limit));

      res.json({
        leaderboard,
        timeframe,
        updated_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Get fact checker leaderboard error:', error);
      next(error);
    }
  }

  async getWorkload(req, res, next) {
    try {
      const factChecker = await FactChecker.findByUserId(req.user.userId);
      if (!factChecker) {
        return res.status(404).json({ error: 'Fact checker profile not found' });
      }

      const pendingClaims = await Claim.countByFactChecker(factChecker.id, 'human_review');
      const completedThisWeek = await Verdict.countByFactChecker(factChecker.id, '7 days');
      const averageTime = await Verdict.getAverageTime(factChecker.id);

      res.json({
        workload: {
          pending_claims: pendingClaims,
          completed_this_week: completedThisWeek,
          average_time_per_claim: averageTime
        }
      });

    } catch (error) {
      logger.error('Get workload error:', error);
      next(error);
    }
  }

  async updateAvailability(req, res, next) {
    try {
      const { is_available } = req.body;

      const factChecker = await FactChecker.findByUserId(req.user.userId);
      if (!factChecker) {
        return res.status(404).json({ error: 'Fact checker profile not found' });
      }

      const updatedProfile = await FactChecker.update(factChecker.id, { 
        is_active: is_available 
      });

      res.json({
        message: `Availability updated to ${is_available ? 'available' : 'unavailable'}`,
        is_available: updatedProfile.is_active
      });

    } catch (error) {
      logger.error('Update availability error:', error);
      next(error);
    }
  }
}

module.exports = new FactCheckerController();