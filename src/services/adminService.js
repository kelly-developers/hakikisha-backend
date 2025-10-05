const User = require('../models/User');
const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const Blog = require('../models/Blog');
const FactChecker = require('../models/FactChecker');
const AdminActivity = require('../models/AdminActivity');
const RegistrationRequest = require('../models/RegistrationRequest');
const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class AdminService {
  async getPlatformOverview(timeframe = '30 days') {
    try {
      const [
        userStats,
        claimStats,
        verdictStats,
        systemStats
      ] = await Promise.all([
        this.getUserStatistics(timeframe),
        this.getClaimStatistics(timeframe),
        this.getVerdictStatistics(timeframe),
        this.getSystemStatistics(timeframe)
      ]);

      return {
        timeframe,
        overview: {
          users: userStats,
          claims: claimStats,
          verdicts: verdictStats,
          system: systemStats
        },
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Platform overview retrieval failed:', error);
      throw error;
    }
  }

  async getUserStatistics(timeframe) {
    const [
      totalUsers,
      newUsers,
      activeUsers,
      userGrowth
    ] = await Promise.all([
      User.countAll(),
      User.countNew(timeframe),
      User.countActive(timeframe),
      this.calculateGrowthRate('users', timeframe)
    ]);

    return {
      total: totalUsers,
      new: newUsers,
      active: activeUsers,
      growth_rate: userGrowth,
      retention_rate: await Analytics.getRetentionRate(timeframe)
    };
  }

  async getClaimStatistics(timeframe) {
    const [
      totalClaims,
      newClaims,
      byStatus,
      byCategory
    ] = await Promise.all([
      Claim.countAll(),
      Claim.countNew(timeframe),
      Claim.countByStatusBreakdown(timeframe),
      Claim.countByCategory(timeframe)
    ]);

    return {
      total: totalClaims,
      new: newClaims,
      by_status: byStatus,
      by_category: byCategory,
      avg_processing_time: await Claim.getAverageProcessingTime(timeframe)
    };
  }

  async getVerdictStatistics(timeframe) {
    const [
      totalVerdicts,
      byType,
      accuracy
    ] = await Promise.all([
      Verdict.countAll(timeframe),
      Verdict.countByType(timeframe),
      this.calculateAccuracyRate(timeframe)
    ]);

    return {
      total: totalVerdicts,
      by_type: byType,
      accuracy_rate: accuracy,
      avg_review_time: await Verdict.getAverageReviewTime(timeframe)
    };
  }

  async getSystemStatistics(timeframe) {
    const [
      performance,
      storage,
      uptime
    ] = await Promise.all([
      this.getPerformanceMetrics(timeframe),
      this.getStorageUsage(),
      this.getUptimeStats()
    ]);

    return {
      performance,
      storage,
      uptime
    };
  }

  async manageUserRegistration(requestId, action, adminId, notes = '') {
    try {
      const request = await RegistrationRequest.findById(requestId);
      if (!request) {
        throw new Error('Registration request not found');
      }

      let result;
      if (action === 'approve') {
        result = await this.approveRegistration(request, adminId, notes);
      } else if (action === 'reject') {
        result = await this.rejectRegistration(request, adminId, notes);
      } else {
        throw new Error('Invalid action. Use "approve" or "reject"');
      }

      // Log admin activity
      await AdminActivity.create({
        admin_id: adminId,
        activity_type: 'registration_management',
        description: `${action} registration for user ${request.user_id}`,
        target_user_id: request.user_id,
        changes_made: { action, notes }
      });

      logger.info('Registration request processed', {
        requestId,
        action,
        adminId,
        userId: request.user_id
      });

      return result;

    } catch (error) {
      logger.error('Registration management failed:', error);
      throw error;
    }
  }

  async approveRegistration(request, adminId, notes) {
    // Update user verification status
    await User.update(request.user_id, { is_verified: true });

    // If it's a fact-checker registration, create fact-checker profile
    if (request.request_type === 'fact_checker') {
      await FactChecker.create({
        user_id: request.user_id,
        verification_status: 'approved',
        expertise_areas: [] // Would come from application data
      });
    }

    // Update request status
    await RegistrationRequest.updateStatus(request.id, 'approved', adminId, notes);

    return {
      success: true,
      message: 'Registration approved successfully',
      user_id: request.user_id
    };
  }

  async rejectRegistration(request, adminId, notes) {
    // Update request status
    await RegistrationRequest.updateStatus(request.id, 'rejected', adminId, notes);

    return {
      success: true,
      message: 'Registration rejected',
      user_id: request.user_id,
      notes: notes
    };
  }

  async manageFactChecker(userId, action, adminId, reason = '') {
    try {
      const factChecker = await FactChecker.findByUserId(userId);
      if (!factChecker) {
        throw new Error('Fact-checker not found');
      }

      let result;
      if (action === 'suspend') {
        result = await this.suspendFactChecker(factChecker, adminId, reason);
      } else if (action === 'activate') {
        result = await this.activateFactChecker(factChecker, adminId);
      } else if (action === 'promote') {
        result = await this.promoteFactChecker(factChecker, adminId);
      } else {
        throw new Error('Invalid action');
      }

      // Log admin activity
      await AdminActivity.create({
        admin_id: adminId,
        activity_type: 'fact_checker_management',
        description: `${action} fact-checker ${userId}`,
        target_user_id: userId,
        changes_made: { action, reason }
      });

      logger.info('Fact-checker management action completed', {
        userId,
        action,
        adminId
      });

      return result;

    } catch (error) {
      logger.error('Fact-checker management failed:', error);
      throw error;
    }
  }

  async suspendFactChecker(factChecker, adminId, reason) {
    await FactChecker.update(factChecker.id, {
      is_active: false,
      suspension_reason: reason,
      suspended_at: new Date()
    });

    return {
      success: true,
      message: 'Fact-checker suspended successfully',
      fact_checker_id: factChecker.id,
      reason: reason
    };
  }

  async activateFactChecker(factChecker, adminId) {
    await FactChecker.update(factChecker.id, {
      is_active: true,
      suspension_reason: null,
      suspended_at: null
    });

    return {
      success: true,
      message: 'Fact-checker activated successfully',
      fact_checker_id: factChecker.id
    };
  }

  async promoteFactChecker(factChecker, adminId) {
    // This could involve giving special privileges or roles
    await FactChecker.update(factChecker.id, {
      is_featured: true,
      promoted_at: new Date()
    });

    return {
      success: true,
      message: 'Fact-checker promoted successfully',
      fact_checker_id: factChecker.id
    };
  }

  async getModerationQueue(filters = {}) {
    try {
      const {
        type = 'claims',
        status = 'pending',
        priority,
        page = 1,
        limit = 20
      } = filters;

      let queue;
      let total;

      if (type === 'claims') {
        queue = await Claim.findByStatus(status, limit, (page - 1) * limit, { priority });
        total = await Claim.countByStatus(status, { priority });
      } else if (type === 'registrations') {
        queue = await RegistrationRequest.findByStatus(status, limit, (page - 1) * limit);
        total = await RegistrationRequest.countByStatus(status);
      } else if (type === 'content') {
        // This would handle blog/content moderation
        queue = await Blog.findByStatus(status, limit, (page - 1) * limit);
        total = await Blog.countByStatus(status);
      }

      return {
        type,
        queue,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Moderation queue retrieval failed:', error);
      throw error;
    }
  }

  async generateReports(reportType, timeframe = '30 days', format = 'json') {
    try {
      let reportData;

      switch (reportType) {
        case 'user_activity':
          reportData = await this.generateUserActivityReport(timeframe);
          break;
        case 'system_performance':
          reportData = await this.generateSystemPerformanceReport(timeframe);
          break;
        case 'content_moderation':
          reportData = await this.generateContentModerationReport(timeframe);
          break;
        case 'financial':
          reportData = await this.generateFinancialReport(timeframe);
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (format === 'csv') {
        return this.convertReportToCSV(reportData, reportType);
      }

      return reportData;

    } catch (error) {
      logger.error('Report generation failed:', error);
      throw error;
    }
  }

  async generateUserActivityReport(timeframe) {
    const [
      userStats,
      engagement,
      retention
    ] = await Promise.all([
      this.getUserStatistics(timeframe),
      Analytics.getFeatureUsage(timeframe),
      Analytics.getRetentionRate(timeframe)
    ]);

    return {
      report_type: 'user_activity',
      timeframe,
      user_statistics: userStats,
      engagement_metrics: engagement,
      retention_analysis: { retention_rate: retention },
      generated_at: new Date().toISOString()
    };
  }

  async generateSystemPerformanceReport(timeframe) {
    const [
      performance,
      errors,
      uptime
    ] = await Promise.all([
      this.getPerformanceMetrics(timeframe),
      this.getErrorStatistics(timeframe),
      this.getUptimeStats()
    ]);

    return {
      report_type: 'system_performance',
      timeframe,
      performance_metrics: performance,
      error_statistics: errors,
      uptime_stats: uptime,
      recommendations: this.generatePerformanceRecommendations(performance)
    };
  }

  async getPerformanceMetrics(timeframe) {
    // This would collect various performance metrics
    return {
      average_response_time: 125, // ms
      p95_response_time: 250, // ms
      throughput: 1000, // requests per minute
      error_rate: 0.5, // percentage
      database_connections: 45,
      cache_hit_rate: 0.85
    };
  }

  async getErrorStatistics(timeframe) {
    // This would collect error statistics
    return {
      total_errors: 150,
      by_type: {
        '4xx': 100,
        '5xx': 50
      },
      most_common_errors: [
        { error: 'Validation Error', count: 45 },
        { error: 'Database Error', count: 30 },
        { error: 'Authentication Error', count: 25 }
      ]
    };
  }

  async getUptimeStats() {
    // This would come from monitoring system
    return {
      uptime_percentage: 99.95,
      last_downtime: '2024-01-15T03:00:00Z',
      average_downtime: '5 minutes per month'
    };
  }

  async getStorageUsage() {
    // This would calculate storage usage from cloud provider
    return {
      total_used: '15.2 GB',
      database: '8.7 GB',
      file_storage: '6.5 GB',
      backup_storage: '12.1 GB'
    };
  }

  async calculateGrowthRate(metric, timeframe) {
    // Simplified growth rate calculation
    const current = await this.getMetricCount(metric, timeframe);
    const previous = await this.getMetricCount(metric, this.getPreviousTimeframe(timeframe));

    if (previous === 0) return current > 0 ? 100 : 0;

    return ((current - previous) / previous) * 100;
  }

  async calculateAccuracyRate(timeframe) {
    // Placeholder accuracy calculation
    return 0.88; // 88% accuracy
  }

  async getMetricCount(metric, timeframe) {
    // Placeholder implementation
    const baseCounts = {
      'users': 1000,
      'claims': 500,
      'verdicts': 300
    };

    return baseCounts[metric] || 0;
  }

  getPreviousTimeframe(timeframe) {
    const match = timeframe.match(/(\d+)\s*(\w+)/);
    if (!match) return timeframe;

    const amount = parseInt(match[1]);
    const unit = match[2];

    return `${amount * 2} ${unit}`;
  }

  generatePerformanceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.average_response_time > 200) {
      recommendations.push('Consider optimizing database queries and adding caching');
    }

    if (metrics.error_rate > 1) {
      recommendations.push('Investigate and fix recurring errors');
    }

    if (metrics.cache_hit_rate < 0.8) {
      recommendations.push('Improve cache strategy and increase cache TTL');
    }

    return recommendations.length > 0 ? recommendations : ['System performance is optimal'];
  }

  convertReportToCSV(reportData, reportType) {
    const headers = ['Metric', 'Value', 'Timeframe'];
    const rows = [];

    // Flatten the report data for CSV
    const flattenObject = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          flattenObject(value, prefix + key + '.');
        } else {
          rows.push([prefix + key, value, reportData.timeframe]);
        }
      }
    };

    flattenObject(reportData);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async cleanupSystemData(retentionDays = 90) {
    try {
      const cleanupTasks = await Promise.allSettled([
        AdminActivity.cleanupOldActivities(retentionDays),
        RegistrationRequest.cleanupOldRequests(retentionDays),
        this.cleanupOldLogs(retentionDays)
      ]);

      const results = cleanupTasks.map((task, index) => ({
        task: ['admin_activities', 'registration_requests', 'logs'][index],
        status: task.status,
        result: task.status === 'fulfilled' ? task.value : task.reason
      }));

      logger.info('System data cleanup completed', { results });

      return results;

    } catch (error) {
      logger.error('System data cleanup failed:', error);
      throw error;
    }
  }

  async cleanupOldLogs(retentionDays) {
    // This would clean up old log files
    // Placeholder implementation
    return { deleted_count: 0, message: 'Log cleanup not implemented' };
  }

  async getAdminActivities(filters = {}) {
    try {
      const {
        admin_id,
        activity_type,
        date_from,
        date_to,
        page = 1,
        limit = 20
      } = filters;

      const activities = await AdminActivity.searchActivities({
        admin_id,
        activity_type,
        date_from,
        date_to
      }, limit, (page - 1) * limit);

      const total = await AdminActivity.countActivities({
        admin_id,
        activity_type,
        date_from,
        date_to
      });

      return {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Admin activities retrieval failed:', error);
      throw error;
    }
  }
}

module.exports = new AdminService();