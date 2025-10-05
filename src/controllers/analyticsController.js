const Analytics = require('../models/Analytics');
const Claim = require('../models/Claim');
const User = require('../models/User');
const Verdict = require('../models/Verdict');
const Blog = require('../models/Blog');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class AnalyticsController {
  async getPlatformAnalytics(req, res, next) {
    try {
      const { timeframe = '30 days' } = req.query;

      const [
        userStats,
        claimStats,
        verdictStats,
        blogStats,
        engagementStats
      ] = await Promise.all([
        this.getUserAnalytics(timeframe),
        this.getClaimAnalytics(timeframe),
        this.getVerdictAnalytics(timeframe),
        this.getBlogAnalytics(timeframe),
        this.getEngagementAnalytics(timeframe)
      ]);

      res.json({
        timeframe,
        analytics: {
          users: userStats,
          claims: claimStats,
          verdicts: verdictStats,
          blogs: blogStats,
          engagement: engagementStats
        },
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Get platform analytics error:', error);
      next(error);
    }
  }

  async getUserAnalytics(timeframe) {
    const totalUsers = await User.countAll();
    const newUsers = await User.countNew(timeframe);
    const activeUsers = await User.countActive(timeframe);
    const userGrowth = await User.getGrowthRate(timeframe);

    return {
      total_users: totalUsers,
      new_users: newUsers,
      active_users: activeUsers,
      growth_rate: userGrowth,
      retention_rate: await User.getRetentionRate(timeframe)
    };
  }

  async getClaimAnalytics(timeframe) {
    const totalClaims = await Claim.countAll();
    const newClaims = await Claim.countNew(timeframe);
    const claimsByStatus = await Claim.countByStatusBreakdown(timeframe);
    const claimsByCategory = await Claim.countByCategory(timeframe);
    const avgProcessingTime = await Claim.getAverageProcessingTime(timeframe);

    return {
      total_claims: totalClaims,
      new_claims: newClaims,
      by_status: claimsByStatus,
      by_category: claimsByCategory,
      average_processing_time: avgProcessingTime
    };
  }

  async getVerdictAnalytics(timeframe) {
    const totalVerdicts = await Verdict.countAll(timeframe);
    const verdictsByType = await Verdict.countByType(timeframe);
    const accuracyRate = await Verdict.getAccuracyRate(timeframe);
    const avgReviewTime = await Verdict.getAverageReviewTime(timeframe);

    return {
      total_verdicts: totalVerdicts,
      by_type: verdictsByType,
      accuracy_rate: accuracyRate,
      average_review_time: avgReviewTime
    };
  }

  async getBlogAnalytics(timeframe) {
    const totalBlogs = await Blog.countAll();
    const publishedBlogs = await Blog.countPublished(timeframe);
    const blogsByCategory = await Blog.countByCategory(timeframe);
    const topBlogs = await Blog.getTopPerforming(5, timeframe);

    return {
      total_blogs: totalBlogs,
      published_blogs: publishedBlogs,
      by_category: blogsByCategory,
      top_performing: topBlogs
    };
  }

  async getEngagementAnalytics(timeframe) {
    const avgSessionDuration = await Analytics.getAverageSessionDuration(timeframe);
    const userRetention = await Analytics.getUserRetention(timeframe);
    const featureUsage = await Analytics.getFeatureUsage(timeframe);
    const platformSatisfaction = await Analytics.getSatisfactionScore(timeframe);

    return {
      average_session_duration: avgSessionDuration,
      user_retention: userRetention,
      feature_usage: featureUsage,
      satisfaction_score: platformSatisfaction
    };
  }

  async getRealTimeMetrics(req, res, next) {
    try {
      const currentTime = new Date();
      const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

      const [
        activeUsersNow,
        claimsSubmitted,
        verdictsPublished,
        systemHealth
      ] = await Promise.all([
        Analytics.getActiveUsersCount(oneHourAgo, currentTime),
        Analytics.getClaimsSubmitted(oneHourAgo, currentTime),
        Analytics.getVerdictsPublished(oneHourAgo, currentTime),
        Analytics.getSystemHealth()
      ]);

      res.json({
        timestamp: currentTime.toISOString(),
        metrics: {
          active_users: activeUsersNow,
          claims_submitted: claimsSubmitted,
          verdicts_published: verdictsPublished,
          system_health: systemHealth
        }
      });

    } catch (error) {
      logger.error('Get real-time metrics error:', error);
      next(error);
    }
  }

  async getTrendAnalysis(req, res, next) {
    try {
      const { metric, days = 30 } = req.query;
      const allowedMetrics = ['users', 'claims', 'verdicts', 'engagement'];

      if (!allowedMetrics.includes(metric)) {
        return res.status(400).json({ 
          error: `Invalid metric. Allowed: ${allowedMetrics.join(', ')}` 
        });
      }

      const trendData = await Analytics.getTrendData(metric, parseInt(days));

      res.json({
        metric,
        timeframe: `${days} days`,
        trend_data: trendData,
        analysis: await Analytics.analyzeTrend(trendData)
      });

    } catch (error) {
      logger.error('Get trend analysis error:', error);
      next(error);
    }
  }

  async exportAnalyticsData(req, res, next) {
    try {
      const { format = 'json', timeframe = '30 days' } = req.query;
      const allowedFormats = ['json', 'csv'];

      if (!allowedFormats.includes(format)) {
        return res.status(400).json({ 
          error: `Invalid format. Allowed: ${allowedFormats.join(', ')}` 
        });
      }

      const analyticsData = await this.getPlatformAnalyticsData(timeframe);

      if (format === 'csv') {
        const csvData = this.convertToCSV(analyticsData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${timeframe}.csv`);
        return res.send(csvData);
      }

      res.json({
        format: 'json',
        timeframe,
        data: analyticsData
      });

    } catch (error) {
      logger.error('Export analytics data error:', error);
      next(error);
    }
  }

  async getPlatformAnalyticsData(timeframe) {
    const [userStats, claimStats, verdictStats] = await Promise.all([
      this.getUserAnalytics(timeframe),
      this.getClaimAnalytics(timeframe),
      this.getVerdictAnalytics(timeframe)
    ]);

    return {
      timeframe,
      generated_at: new Date().toISOString(),
      users: userStats,
      claims: claimStats,
      verdicts: verdictStats
    };
  }

  convertToCSV(data) {
    const headers = ['Metric', 'Value', 'Timeframe'];
    const rows = [];

    // Flatten the data structure for CSV
    for (const [category, metrics] of Object.entries(data)) {
      if (category !== 'timeframe' && category !== 'generated_at') {
        for (const [metric, value] of Object.entries(metrics)) {
          rows.push([`${category}.${metric}`, value, data.timeframe]);
        }
      }
    }

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async getPredictiveAnalytics(req, res, next) {
    try {
      const { horizon = 7 } = req.query; // days to predict

      const predictions = await Analytics.getPredictiveMetrics(parseInt(horizon));

      res.json({
        prediction_horizon: `${horizon} days`,
        predictions,
        confidence_level: 0.85, // Example confidence level
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Get predictive analytics error:', error);
      next(error);
    }
  }
}

module.exports = new AnalyticsController();