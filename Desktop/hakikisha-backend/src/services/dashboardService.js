const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const FactChecker = require('../models/FactChecker');
const FactCheckerActivity = require('../models/FactCheckerActivity');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class DashboardService {
  async getFactCheckerDashboard(factCheckerId, timeframe = '7 days') {
    try {
      const [
        assignedClaims,
        recentVerdicts,
        activityStats,
        performanceMetrics,
        notifications
      ] = await Promise.all([
        this.getAssignedClaims(factCheckerId),
        this.getRecentVerdicts(factCheckerId, 5),
        this.getActivityStats(factCheckerId, timeframe),
        this.getPerformanceMetrics(factCheckerId, timeframe),
        this.getRecentNotifications(factCheckerId, 10)
      ]);

      return {
        assigned_claims: assignedClaims,
        recent_verdicts: recentVerdicts,
        activity_stats: activityStats,
        performance_metrics: performanceMetrics,
        notifications: notifications,
        quick_actions: this.getQuickActions(factCheckerId),
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Fact-checker dashboard data retrieval failed:', error);
      throw error;
    }
  }

  async getAssignedClaims(factCheckerId) {
    try {
      const claims = await Claim.findByFactChecker(factCheckerId, 'human_review', 10, 0);

      return {
        total: claims.length,
        claims: claims.map(claim => ({
          id: claim.id,
          title: claim.title,
          category: claim.category,
          priority: claim.priority,
          created_at: claim.created_at,
          days_since_assigned: this.calculateDaysSince(claim.updated_at)
        })),
        by_priority: this.groupByPriority(claims),
        by_category: this.groupByCategory(claims)
      };

    } catch (error) {
      logger.error('Assigned claims retrieval failed:', error);
      throw error;
    }
  }

  async getRecentVerdicts(factCheckerId, limit = 5) {
    try {
      const verdicts = await Verdict.findByFactChecker(factCheckerId, limit, 0);

      return verdicts.map(verdict => ({
        id: verdict.id,
        claim_title: verdict.claim_title,
        verdict: verdict.verdict,
        submitted_at: verdict.created_at,
        time_spent: verdict.time_spent
      }));

    } catch (error) {
      logger.error('Recent verdicts retrieval failed:', error);
      throw error;
    }
  }

  async getActivityStats(factCheckerId, timeframe) {
    try {
      const stats = await FactCheckerActivity.getFactCheckerStats(factCheckerId, timeframe);

      const totalActivities = stats.reduce((sum, item) => sum + item.total_activities, 0);
      const totalTime = stats.reduce((sum, item) => sum + item.total_duration, 0);

      return {
        total_activities: totalActivities,
        total_time_spent: totalTime,
        average_session_duration: totalActivities > 0 ? totalTime / totalActivities : 0,
        by_activity_type: stats
      };

    } catch (error) {
      logger.error('Activity stats retrieval failed:', error);
      throw error;
    }
  }

  async getPerformanceMetrics(factCheckerId, timeframe) {
    try {
      const verdictStats = await Verdict.getStats(factCheckerId, timeframe);

      const totalVerdicts = verdictStats.reduce((sum, item) => sum + item.total, 0);
      const accuracyRate = await this.calculateAccuracyRate(factCheckerId, timeframe);

      return {
        total_verdicts: totalVerdicts,
        accuracy_rate: accuracyRate,
        average_review_time: verdictStats.reduce((sum, item) => sum + (item.avg_time_spent * item.total), 0) / totalVerdicts || 0,
        by_verdict_type: verdictStats,
        performance_trend: await this.getPerformanceTrend(factCheckerId, timeframe)
      };

    } catch (error) {
      logger.error('Performance metrics retrieval failed:', error);
      throw error;
    }
  }

  async getRecentNotifications(factCheckerId, limit = 10) {
    try {
      const notifications = await Notification.findByUserId(factCheckerId, limit, 0);

      return notifications.map(notification => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        is_read: notification.is_read,
        created_at: notification.created_at
      }));

    } catch (error) {
      logger.error('Recent notifications retrieval failed:', error);
      throw error;
    }
  }

  async getClaimQueue(filters = {}) {
    try {
      const {
        status = 'human_review',
        priority,
        category,
        page = 1,
        limit = 20
      } = filters;

      const offset = (page - 1) * limit;

      const claims = await Claim.findByStatus(status, limit, offset, { priority, category });
      const total = await Claim.countByStatus(status, { priority, category });

      return {
        claims: claims.map(claim => ({
          id: claim.id,
          title: claim.title,
          category: claim.category,
          priority: claim.priority,
          status: claim.status,
          submission_count: claim.submission_count,
          created_at: claim.created_at,
          estimated_review_time: this.estimateReviewTime(claim)
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        filters: {
          status,
          priority,
          category
        }
      };

    } catch (error) {
      logger.error('Claim queue retrieval failed:', error);
      throw error;
    }
  }

  async startReviewSession(factCheckerId, claimId) {
    try {
      const session = await FactCheckerActivity.create({
        fact_checker_id: factCheckerId,
        activity_type: 'claim_review',
        claim_id: claimId,
        start_time: new Date()
      });

      // Update claim status to indicate it's being reviewed
      await Claim.updateStatus(claimId, 'under_review');

      logger.info('Review session started', {
        sessionId: session.id,
        factCheckerId,
        claimId
      });

      return {
        session_id: session.id,
        started_at: session.start_time,
        claim_id: claimId
      };

    } catch (error) {
      logger.error('Review session start failed:', error);
      throw error;
    }
  }

  async endReviewSession(sessionId) {
    try {
      const endedSession = await FactCheckerActivity.endSession(sessionId);

      logger.info('Review session ended', {
        sessionId,
        duration: endedSession.duration
      });

      return {
        session_id: sessionId,
        duration: endedSession.duration,
        ended_at: endedSession.end_time
      };

    } catch (error) {
      logger.error('Review session end failed:', error);
      throw error;
    }
  }

  async getWorkloadSummary(factCheckerId) {
    try {
      const [
        currentWorkload,
        weeklyProductivity,
        performanceComparison
      ] = await Promise.all([
        this.getCurrentWorkload(factCheckerId),
        this.getWeeklyProductivity(factCheckerId),
        this.getPerformanceComparison(factCheckerId)
      ]);

      return {
        current_workload: currentWorkload,
        weekly_productivity: weeklyProductivity,
        performance_comparison: performanceComparison,
        recommendations: await this.generateWorkloadRecommendations(factCheckerId)
      };

    } catch (error) {
      logger.error('Workload summary retrieval failed:', error);
      throw error;
    }
  }

  async getCurrentWorkload(factCheckerId) {
    const assignedClaims = await Claim.findByFactChecker(factCheckerId, 'human_review', 50, 0);

    return {
      total_assigned: assignedClaims.length,
      by_priority: this.groupByPriority(assignedClaims),
      by_category: this.groupByCategory(assignedClaims),
      estimated_completion_time: this.estimateCompletionTime(assignedClaims)
    };
  }

  async getWeeklyProductivity(factCheckerId) {
    const productivity = await FactCheckerActivity.getProductivityReport(factCheckerId, '7 days');

    return {
      days: productivity,
      totals: {
        claims_reviewed: productivity.reduce((sum, day) => sum + day.claims_reviewed, 0),
        time_spent: productivity.reduce((sum, day) => sum + day.total_seconds, 0),
        verdicts_submitted: productivity.reduce((sum, day) => sum + day.verdicts_submitted, 0)
      },
      averages: {
        daily_claims: productivity.reduce((sum, day) => sum + day.claims_reviewed, 0) / productivity.length || 0,
        daily_time: productivity.reduce((sum, day) => sum + day.total_seconds, 0) / productivity.length || 0
      }
    };
  }

  async getPerformanceComparison(factCheckerId) {
    const leaderboard = await FactCheckerActivity.getLeaderboard('30 days', 10);
    const currentChecker = leaderboard.find(item => item.fact_checker_id === factCheckerId);

    if (!currentChecker) {
      return { rank: 'Not in top 10', comparison: 'N/A' };
    }

    const rank = leaderboard.findIndex(item => item.fact_checker_id === factCheckerId) + 1;
    const averageVerdicts = leaderboard.reduce((sum, item) => sum + item.verdicts_count, 0) / leaderboard.length;

    return {
      rank: rank,
      total_verdicts: currentChecker.verdicts_count,
      platform_average: Math.round(averageVerdicts),
      performance: ((currentChecker.verdicts_count - averageVerdicts) / averageVerdicts * 100).toFixed(1) + '%',
      top_performer: leaderboard[0]?.verdicts_count || 0
    };
  }

  groupByPriority(claims) {
    const groups = {};
    claims.forEach(claim => {
      if (!groups[claim.priority]) groups[claim.priority] = 0;
      groups[claim.priority]++;
    });
    return groups;
  }

  groupByCategory(claims) {
    const groups = {};
    claims.forEach(claim => {
      if (!groups[claim.category]) groups[claim.category] = 0;
      groups[claim.category]++;
    });
    return groups;
  }

  calculateDaysSince(date) {
    if (!date) return 0;
    const diffTime = Math.abs(new Date() - new Date(date));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  estimateReviewTime(claim) {
    // Simple estimation based on claim characteristics
    let baseTime = 30; // minutes

    if (claim.priority === 'high') baseTime += 15;
    if (claim.priority === 'critical') baseTime += 30;

    if (claim.submission_count > 5) baseTime += 10;

    return baseTime;
  }

  estimateCompletionTime(claims) {
    const totalTime = claims.reduce((sum, claim) => sum + this.estimateReviewTime(claim), 0);
    return {
      total_minutes: totalTime,
      formatted: this.formatDuration(totalTime * 60) // Convert to seconds
    };
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  async calculateAccuracyRate(factCheckerId, timeframe) {
    // Placeholder implementation
    // This would compare fact-checker verdicts with consensus
    return 0.85 + Math.random() * 0.1; // 85-95%
  }

  async getPerformanceTrend(factCheckerId, timeframe) {
    // Placeholder implementation
    // This would show performance over time
    return {
      trend: 'improving',
      data: [
        { date: '2024-01-01', accuracy: 0.82, verdicts: 12 },
        { date: '2024-01-08', accuracy: 0.85, verdicts: 15 },
        { date: '2024-01-15', accuracy: 0.88, verdicts: 18 }
      ]
    };
  }

  getQuickActions(factCheckerId) {
    return [
      {
        id: 'review_claims',
        title: 'Review Assigned Claims',
        description: 'Continue reviewing your assigned claims',
        icon: '📋',
        route: '/claims/assigned',
        priority: 'high'
      },
      {
        id: 'submit_verdict',
        title: 'Submit Pending Verdicts',
        description: 'Complete verdicts for reviewed claims',
        icon: '✅',
        route: '/verdicts/pending',
        priority: 'medium'
      },
      {
        id: 'view_analytics',
        title: 'View Performance Analytics',
        description: 'Check your performance metrics',
        icon: '📊',
        route: '/analytics',
        priority: 'low'
      },
      {
        id: 'update_profile',
        title: 'Update Your Profile',
        description: 'Keep your expertise areas current',
        icon: '👤',
        route: '/profile',
        priority: 'low'
      }
    ];
  }

  async generateWorkloadRecommendations(factCheckerId) {
    const workload = await this.getCurrentWorkload(factCheckerId);
    const productivity = await this.getWeeklyProductivity(factCheckerId);

    const recommendations = [];

    // Check if workload is too high
    if (workload.total_assigned > 15) {
      recommendations.push({
        type: 'workload',
        priority: 'high',
        message: 'High workload detected',
        suggestion: 'Consider requesting assistance or prioritizing critical claims'
      });
    }

    // Check productivity trends
    const avgDailyTime = productivity.averages.daily_time;
    if (avgDailyTime > 28800) { // More than 8 hours/day
      recommendations.push({
        type: 'work_life_balance',
        priority: 'medium',
        message: 'High daily time commitment',
        suggestion: 'Ensure you take regular breaks and maintain work-life balance'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'maintenance',
        priority: 'low',
        message: 'Workload is well-managed',
        suggestion: 'Continue with current pace and focus on quality'
      });
    }

    return recommendations;
  }

  async getDashboardStats(factCheckerId) {
    try {
      const [
        totalVerdicts,
        accuracyRate,
        averageTime,
        rank
      ] = await Promise.all([
        Verdict.countByFactChecker(factCheckerId),
        this.calculateAccuracyRate(factCheckerId, '30 days'),
        this.getAverageReviewTime(factCheckerId),
        this.getRank(factCheckerId)
      ]);

      return {
        total_verdicts: totalVerdicts,
        accuracy_rate: accuracyRate,
        average_review_time: averageTime,
        rank: rank,
        efficiency_score: this.calculateEfficiencyScore(averageTime, accuracyRate)
      };

    } catch (error) {
      logger.error('Dashboard stats retrieval failed:', error);
      throw error;
    }
  }

  async getAverageReviewTime(factCheckerId) {
    const stats = await Verdict.getStats(factCheckerId, '30 days');
    const totalVerdicts = stats.reduce((sum, item) => sum + item.total, 0);
    const totalTime = stats.reduce((sum, item) => sum + (item.avg_time_spent * item.total), 0);
    
    return totalVerdicts > 0 ? totalTime / totalVerdicts : 0;
  }

  async getRank(factCheckerId) {
    const leaderboard = await FactCheckerActivity.getLeaderboard('30 days', 100);
    const rank = leaderboard.findIndex(item => item.fact_checker_id === factCheckerId);
    
    return rank >= 0 ? rank + 1 : 'Not ranked';
  }

  calculateEfficiencyScore(averageTime, accuracyRate) {
    // Combine time efficiency and accuracy into a single score
    const timeScore = Math.max(0, 1 - (averageTime / 3600)); // 1 hour = perfect score
    const accuracyScore = accuracyRate;
    
    return (timeScore * 0.4 + accuracyScore * 0.6) * 100; // 40% time, 60% accuracy
  }
}

module.exports = new DashboardService();