const Analytics = require('../models/Analytics');
const Claim = require('../models/Claim');
const User = require('../models/User');
const Verdict = require('../models/Verdict');
const Blog = require('../models/Blog');
const SearchLog = require('../models/SearchLog');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class AnalyticsService {
  async trackUserAction(userId, action, metadata = {}) {
    try {
      await Analytics.trackUserAction(userId, action, metadata);
      return true;
    } catch (error) {
      logger.error('User action tracking failed:', error);
      return false;
    }
  }

  async getPlatformOverview(timeframe = '30 days') {
    try {
      const [
        userStats,
        claimStats,
        verdictStats,
        engagementStats
      ] = await Promise.all([
        this.getUserStatistics(timeframe),
        this.getClaimStatistics(timeframe),
        this.getVerdictStatistics(timeframe),
        this.getEngagementMetrics(timeframe)
      ]);

      return {
        timeframe,
        overview: {
          users: userStats,
          claims: claimStats,
          verdicts: verdictStats,
          engagement: engagementStats
        },
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Platform overview retrieval failed:', error);
      throw error;
    }
  }

  async getUserStatistics(timeframe) {
    try {
      const [
        totalUsers,
        newUsers,
        activeUsers,
        retentionRate
      ] = await Promise.all([
        User.countAll(),
        User.countNew(timeframe),
        User.countActive(timeframe),
        Analytics.getRetentionRate(timeframe)
      ]);

      return {
        total_users: totalUsers,
        new_users: newUsers,
        active_users: activeUsers,
        retention_rate: retentionRate,
        growth_rate: await this.calculateGrowthRate('users', timeframe)
      };

    } catch (error) {
      logger.error('User statistics retrieval failed:', error);
      throw error;
    }
  }

  async getClaimStatistics(timeframe) {
    try {
      const [
        totalClaims,
        newClaims,
        claimsByStatus,
        claimsByCategory
      ] = await Promise.all([
        Claim.countAll(),
        Claim.countNew(timeframe),
        Claim.countByStatusBreakdown(timeframe),
        Claim.countByCategory(timeframe)
      ]);

      return {
        total_claims: totalClaims,
        new_claims: newClaims,
        by_status: claimsByStatus,
        by_category: claimsByCategory,
        average_processing_time: await Claim.getAverageProcessingTime(timeframe)
      };

    } catch (error) {
      logger.error('Claim statistics retrieval failed:', error);
      throw error;
    }
  }

  async getVerdictStatistics(timeframe) {
    try {
      const [
        totalVerdicts,
        verdictsByType,
        accuracyRate
      ] = await Promise.all([
        Verdict.countAll(timeframe),
        Verdict.countByType(timeframe),
        this.calculateAccuracyRate(timeframe)
      ]);

      return {
        total_verdicts: totalVerdicts,
        by_type: verdictsByType,
        accuracy_rate: accuracyRate,
        average_review_time: await Verdict.getAverageReviewTime(timeframe)
      };

    } catch (error) {
      logger.error('Verdict statistics retrieval failed:', error);
      throw error;
    }
  }

  async getEngagementMetrics(timeframe) {
    try {
      const [
        featureUsage,
        sessionMetrics,
        satisfactionScore
      ] = await Promise.all([
        Analytics.getFeatureUsage(timeframe),
        this.getSessionMetrics(timeframe),
        this.calculateSatisfactionScore(timeframe)
      ]);

      return {
        feature_usage: featureUsage,
        session_metrics: sessionMetrics,
        satisfaction_score: satisfactionScore,
        activity_heatmap: await Analytics.getActivityHeatmap(timeframe)
      };

    } catch (error) {
      logger.error('Engagement metrics retrieval failed:', error);
      throw error;
    }
  }

  async getSessionMetrics(timeframe) {
    try {
      const stats = await Analytics.getPlatformStats(timeframe);

      return {
        average_session_duration: stats.avg_session_duration,
        total_sessions: stats.total_actions,
        unique_sessions: stats.active_users
      };

    } catch (error) {
      logger.error('Session metrics retrieval failed:', error);
      throw error;
    }
  }

  async calculateAccuracyRate(timeframe) {
    try {
      // Compare human verdicts with AI verdicts when available
      const query = `
        SELECT 
          COUNT(*) as total_comparisons,
          COUNT(CASE WHEN v.verdict = av.verdict THEN 1 END) as matching_verdicts
        FROM verdicts v
        JOIN ai_verdicts av ON v.ai_verdict_id = av.id
        WHERE v.created_at >= NOW() - INTERVAL '${timeframe}'
          AND v.approve_ai_verdict = false
      `;

      // Placeholder implementation
      return 0.88; // 88% accuracy rate

    } catch (error) {
      logger.error('Accuracy rate calculation failed:', error);
      return 0;
    }
  }

  async calculateSatisfactionScore(timeframe) {
    try {
      // This would typically come from user feedback or ratings
      // For now, calculate based on engagement metrics
      const stats = await Analytics.getPlatformStats(timeframe);

      let score = 0;

      // Factor in retention rate
      const retentionRate = await Analytics.getRetentionRate(timeframe);
      score += retentionRate / 100 * 40; // 40% weight

      // Factor in feature usage
      const featureUsage = await Analytics.getFeatureUsage(timeframe);
      const usageScore = featureUsage.reduce((sum, feature) => sum + feature.usage_count, 0) / 1000;
      score += Math.min(usageScore, 40); // 40% weight, capped

      // Factor in session duration (20% weight)
      const sessionDuration = stats.avg_session_duration || 0;
      score += Math.min(sessionDuration / 300, 20); // Normalize to 5 minutes

      return Math.min(score, 5); // Scale to 5-point system

    } catch (error) {
      logger.error('Satisfaction score calculation failed:', error);
      return 0;
    }
  }

  async calculateGrowthRate(metric, timeframe) {
    try {
      const currentPeriod = await this.getMetricCount(metric, timeframe);
      const previousPeriod = await this.getMetricCount(metric, this.getPreviousTimeframe(timeframe));

      if (previousPeriod === 0) {
        return currentPeriod > 0 ? 100 : 0; // Handle division by zero
      }

      return ((currentPeriod - previousPeriod) / previousPeriod) * 100;

    } catch (error) {
      logger.error('Growth rate calculation failed:', error);
      return 0;
    }
  }

  async getMetricCount(metric, timeframe) {
    switch (metric) {
      case 'users':
        return User.countNew(timeframe);
      case 'claims':
        return Claim.countNew(timeframe);
      case 'verdicts':
        return Verdict.countAll(timeframe);
      default:
        return 0;
    }
  }

  getPreviousTimeframe(timeframe) {
    const match = timeframe.match(/(\d+)\s*(\w+)/);
    if (!match) return timeframe;

    const amount = parseInt(match[1]);
    const unit = match[2];

    return `${amount * 2} ${unit}`; // Double the timeframe for comparison
  }

  async getRealTimeMetrics() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const [
        activeUsers,
        claimsSubmitted,
        verdictsPublished,
        searchesPerformed
      ] = await Promise.all([
        this.getActiveUsersCount(oneHourAgo),
        Claim.countNew('1 hour'),
        Verdict.countAll('1 hour'),
        SearchLog.countSearches('1 hour')
      ]);

      return {
        timestamp: new Date().toISOString(),
        metrics: {
          active_users_last_hour: activeUsers,
          claims_submitted_last_hour: claimsSubmitted,
          verdicts_published_last_hour: verdictsPublished,
          searches_performed_last_hour: searchesPerformed
        }
      };

    } catch (error) {
      logger.error('Real-time metrics retrieval failed:', error);
      throw error;
    }
  }

  async getActiveUsersCount(since) {
    try {
      const query = `
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM user_analytics 
        WHERE created_at >= $1
      `;

      // Placeholder implementation
      return 150;

    } catch (error) {
      logger.error('Active users count retrieval failed:', error);
      return 0;
    }
  }

  async getTrendAnalysis(metric, days = 30) {
    try {
      const trendData = await this.getTrendData(metric, days);
      const analysis = this.analyzeTrend(trendData);

      return {
        metric,
        timeframe: `${days} days`,
        trend_data: trendData,
        analysis
      };

    } catch (error) {
      logger.error('Trend analysis failed:', error);
      throw error;
    }
  }

  async getTrendData(metric, days) {
    try {
      // This would generate daily data points for the metric
      const data = [];
      const today = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        const count = await this.getDailyMetricCount(metric, date);
        data.push({
          date: date.toISOString().split('T')[0],
          value: count
        });
      }

      return data;

    } catch (error) {
      logger.error('Trend data retrieval failed:', error);
      return [];
    }
  }

  async getDailyMetricCount(metric, date) {
    // Placeholder implementation
    // This would query the database for specific date
    const baseCount = {
      'users': 50,
      'claims': 25,
      'verdicts': 15,
      'searches': 100
    };

    // Add some randomness for simulation
    const randomFactor = 0.8 + Math.random() * 0.4;
    return Math.floor(baseCount[metric] * randomFactor);
  }

  analyzeTrend(data) {
    if (data.length < 2) {
      return { trend: 'insufficient_data', confidence: 0 };
    }

    const values = data.map(d => d.value);
    const firstValue = values[0];
    const lastValue = values[values.length - 1];

    const growth = ((lastValue - firstValue) / firstValue) * 100;
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const volatility = this.calculateVolatility(values);

    let trend = 'stable';
    if (growth > 10) trend = 'growing';
    if (growth < -10) trend = 'declining';

    return {
      trend,
      growth_rate: growth,
      average_value: average,
      volatility: volatility,
      confidence: Math.min(Math.abs(growth) / 100, 1)
    };
  }

  calculateVolatility(values) {
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
    return Math.sqrt(variance) / average; // Coefficient of variation
  }

  async exportAnalyticsData(format = 'json', timeframe = '30 days') {
    try {
      const data = await this.getPlatformOverview(timeframe);

      if (format === 'csv') {
        return this.convertToCSV(data);
      }

      return data;

    } catch (error) {
      logger.error('Analytics data export failed:', error);
      throw error;
    }
  }

  convertToCSV(data) {
    const rows = [];

    // Flatten the data structure for CSV
    for (const [category, metrics] of Object.entries(data.overview)) {
      for (const [metric, value] of Object.entries(metrics)) {
        if (typeof value === 'object') {
          // Handle nested objects
          for (const [subMetric, subValue] of Object.entries(value)) {
            rows.push([category, `${metric}.${subMetric}`, subValue, data.timeframe]);
          }
        } else {
          rows.push([category, metric, value, data.timeframe]);
        }
      }
    }

    const headers = ['Category', 'Metric', 'Value', 'Timeframe'];
    const csvContent = [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    return csvContent;
  }

  async getPredictiveMetrics(horizonDays = 7) {
    try {
      // Simple linear regression based on recent trends
      const recentTrends = await this.getTrendData('users', 30);
      const prediction = this.predictFutureValues(recentTrends, horizonDays);

      return {
        prediction_horizon: `${horizonDays} days`,
        predictions: prediction,
        confidence_level: 0.75,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Predictive metrics calculation failed:', error);
      throw error;
    }
  }

  predictFutureValues(historicalData, days) {
    // Simple linear regression for prediction
    const n = historicalData.length;
    const x = historicalData.map((_, i) => i);
    const y = historicalData.map(d => d.value);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
    const sumXX = x.reduce((a, b) => a + b * b, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictions = [];
    for (let i = 0; i < days; i++) {
      predictions.push({
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        predicted_value: Math.max(0, intercept + slope * (n + i))
      });
    }

    return predictions;
  }

  async cleanupOldAnalyticsData(retentionDays = 365) {
    try {
      const deletedCount = await Analytics.cleanupOldData(retentionDays);
      
      logger.info('Old analytics data cleaned up', {
        retentionDays,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Analytics data cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();