const User = require('../models/User');
const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const FactChecker = require('../models/FactChecker');
const RegistrationRequest = require('../models/RegistrationRequest');
const AdminActivity = require('../models/AdminActivity');
const logger = require('../utils/logger');

class AdminController {
  async getDashboardStats(req, res, next) {
    try {
      const { timeframe = '7 days' } = req.query;

      // Get various statistics
      const [
        totalUsers,
        totalClaims,
        pendingClaims,
        approvedClaims,
        activeFactCheckers
      ] = await Promise.all([
        User.countAll(),
        Claim.countAll(timeframe),
        Claim.countByStatus('pending'),
        Claim.countByStatus('human_approved'),
        FactChecker.countActive()
      ]);

      // Get recent activities
      const recentActivities = await AdminActivity.getRecent(10);

      res.json({
        stats: {
          total_users: totalUsers,
          total_claims: totalClaims,
          pending_claims: pendingClaims,
          approved_claims: approvedClaims,
          active_fact_checkers: activeFactCheckers
        },
        recent_activities: recentActivities,
        timeframe
      });

    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      next(error);
    }
  }

  async getRegistrationRequests(req, res, next) {
    try {
      const { status = 'pending', page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const requests = await RegistrationRequest.findByStatus(status, limit, offset);
      const total = await RegistrationRequest.countByStatus(status);

      res.json({
        requests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get registration requests error:', error);
      next(error);
    }
  }

  async approveRegistration(req, res, next) {
    try {
      const { requestId } = req.params;
      const { notes = '' } = req.body;

      const request = await RegistrationRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ error: 'Registration request not found' });
      }

      // Approve the request
      await RegistrationRequest.approve(requestId, req.user.userId, notes);

      // Update user verification status
      await User.update(request.user_id, { is_verified: true });

      // If it's a fact-checker registration, create fact-checker profile
      if (request.request_type === 'fact_checker') {
        await FactChecker.create({
          user_id: request.user_id,
          verification_status: 'approved'
        });
      }

      // Log admin activity
      await AdminActivity.create({
        admin_id: req.user.userId,
        activity_type: 'registration_approval',
        description: `Approved ${request.request_type} registration for user ${request.user_id}`,
        target_user_id: request.user_id,
        changes_made: { status: 'approved', notes }
      });

      logger.info(`Registration approved: ${requestId} by admin ${req.user.userId}`);

      res.json({
        message: 'Registration approved successfully',
        request_id: requestId
      });

    } catch (error) {
      logger.error('Approve registration error:', error);
      next(error);
    }
  }

  async rejectRegistration(req, res, next) {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const request = await RegistrationRequest.findById(requestId);
      if (!request) {
        return res.status(404).json({ error: 'Registration request not found' });
      }

      await RegistrationRequest.reject(requestId, req.user.userId, reason);

      // Log admin activity
      await AdminActivity.create({
        admin_id: req.user.userId,
        activity_type: 'registration_rejection',
        description: `Rejected ${request.request_type} registration for user ${request.user_id}`,
        target_user_id: request.user_id,
        changes_made: { status: 'rejected', reason }
      });

      logger.info(`Registration rejected: ${requestId} by admin ${req.user.userId}`);

      res.json({
        message: 'Registration rejected successfully',
        request_id: requestId
      });

    } catch (error) {
      logger.error('Reject registration error:', error);
      next(error);
    }
  }

  async getFactCheckerPerformance(req, res, next) {
    try {
      const { timeframe = '30 days' } = req.query;

      const factCheckers = await FactChecker.findAllActive();
      const performanceData = [];

      for (const fc of factCheckers) {
        const stats = await FactChecker.getPerformanceStats(fc.id, timeframe);
        performanceData.push({
          fact_checker: fc,
          performance: stats
        });
      }

      res.json({
        performance_data: performanceData,
        timeframe
      });

    } catch (error) {
      logger.error('Get fact checker performance error:', error);
      next(error);
    }
  }

  async manageFactCheckerStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, reason } = req.body;

      const factChecker = await FactChecker.findByUserId(userId);
      if (!factChecker) {
        return res.status(404).json({ error: 'Fact checker not found' });
      }

      await FactChecker.updateStatus(userId, status);

      // Log admin activity
      await AdminActivity.create({
        admin_id: req.user.userId,
        activity_type: 'fact_checker_management',
        description: `Updated fact checker status to ${status} for user ${userId}`,
        target_user_id: userId,
        changes_made: { previous_status: factChecker.verification_status, new_status: status, reason }
      });

      logger.info(`Fact checker status updated: ${userId} to ${status} by admin ${req.user.userId}`);

      res.json({
        message: 'Fact checker status updated successfully',
        user_id: userId,
        new_status: status
      });

    } catch (error) {
      logger.error('Manage fact checker status error:', error);
      next(error);
    }
  }
}

module.exports = new AdminController();