const FactCheckerActivity = require('../models/FactCheckerActivity');
const FactChecker = require('../models/FactChecker');
const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class FactCheckerActivityService {
  async startActivitySession(activityData) {
    try {
      const {
        fact_checker_id,
        activity_type,
        claim_id = null,
        start_time = new Date()
      } = activityData;

      const session = await FactCheckerActivity.create({
        fact_checker_id,
        activity_type,
        claim_id,
        start_time,
        ip_address: activityData.ip_address,
        device_info: activityData.device_info || {}
      });

      logger.info('Activity session started', {
        sessionId: session.id,
        factCheckerId: fact_checker_id,
        activityType: activity_type
      });

      return session;

    } catch (error) {
      logger.error('Activity session start failed:', error);
      throw error;
    }
  }

  async endActivitySession(sessionId, endTime = new Date()) {
    try {
      const endedSession = await FactCheckerActivity.endSession(sessionId, endTime);

      logger.info('Activity session ended', {
        sessionId,
        duration: endedSession.duration
      });

      return endedSession;

    } catch (error) {
      logger.error('Activity session end failed:', error);
      throw error;
    }
  }

  async getFactCheckerPerformance(factCheckerId, timeframe = '30 days') {
    try {
      const [
        activityStats,
        verdictStats,
        productivityReport,
        comparisonData
      ] = await Promise.all([
        this.getActivityStatistics(factCheckerId, timeframe),
        this.getVerdictStatistics(factCheckerId, timeframe),
        this.getProductivityReport(factCheckerId, timeframe),
        this.getComparisonData(factCheckerId, timeframe)
      ]);

      return {
        fact_checker_id: factCheckerId,
        timeframe,
        activity_stats: activityStats,
        verdict_stats: verdictStats,
        productivity: productivityReport,
        comparison: comparisonData,
        overall_rating: this.calculateOverallRating(activityStats, verdictStats)
      };

    } catch (error) {
      logger.error('Fact-checker performance retrieval failed:', error);
      throw error;
    }
  }

  async getActivityStatistics(factCheckerId, timeframe) {
    const stats = await FactCheckerActivity.getFactCheckerStats(factCheckerId, timeframe);

    const totalActivities = stats.reduce((sum, item) => sum + item.total_activities, 0);
    const totalTime = stats.reduce((sum, item) => sum + item.total_duration, 0);

    return {
      by_activity_type: stats,
      total_activities: totalActivities,
      total_time_spent: totalTime,
      average_session_duration: totalActivities > 0 ? totalTime / totalActivities : 0
    };
  }

  async getVerdictStatistics(factCheckerId, timeframe) {
    const verdicts = await Verdict.getStats(factCheckerId, timeframe);

    const totalVerdicts = verdicts.reduce((sum, item) => sum + item.total, 0);
    const accuracyRate = await this.calculateAccuracyRate(factCheckerId, timeframe);

    return {
      by_verdict_type: verdicts,
      total_verdicts: totalVerdicts,
      accuracy_rate: accuracyRate,
      average_review_time: verdicts.reduce((sum, item) => sum + (item.avg_time_spent * item.total), 0) / totalVerdicts || 0
    };
  }

  async getProductivityReport(factCheckerId, timeframe) {
    const report = await FactCheckerActivity.getProductivityReport(factCheckerId, timeframe);

    const totalSessions = report.reduce((sum, day) => sum + day.total_sessions, 0);
    const totalTime = report.reduce((sum, day) => sum + day.total_seconds, 0);
    const totalClaims = report.reduce((sum, day) => sum + day.claims_reviewed, 0);

    return {
      daily_breakdown: report,
      totals: {
        sessions: totalSessions,
        time_spent: totalTime,
        claims_reviewed: totalClaims
      },
      averages: {
        sessions_per_day: totalSessions / report.length || 0,
        time_per_day: totalTime / report.length || 0,
        claims_per_day: totalClaims / report.length || 0
      }
    };
  }

  async getComparisonData(factCheckerId, timeframe) {
    const leaderboard = await FactCheckerActivity.getLeaderboard(timeframe, 10);
    const currentChecker = leaderboard.find(item => item.fact_checker_id === factCheckerId);

    if (!currentChecker) {
      return {
        rank: 'Not in top 10',
        performance_vs_average: 'N/A'
      };
    }

    const rank = leaderboard.findIndex(item => item.fact_checker_id === factCheckerId) + 1;
    const averageVerdicts = leaderboard.reduce((sum, item) => sum + item.verdicts_count, 0) / leaderboard.length;

    return {
      rank: rank,
      total_verdicts: currentChecker.verdicts_count,
      average_verdicts: averageVerdicts,
      performance_vs_average: ((currentChecker.verdicts_count - averageVerdicts) / averageVerdicts * 100).toFixed(1) + '%',
      top_performers: leaderboard.slice(0, 3).map(p => ({
        fact_checker_id: p.fact_checker_id,
        verdicts_count: p.verdicts_count
      }))
    };
  }

  async calculateAccuracyRate(factCheckerId, timeframe) {
    // This would compare fact-checker verdicts with consensus or known truths
    // For now, use a placeholder calculation
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN v.verdict = av.verdict THEN 1 END) as matching_ai
        FROM verdicts v
        LEFT JOIN ai_verdicts av ON v.ai_verdict_id = av.id
        WHERE v.fact_checker_id = $1 
          AND v.created_at >= NOW() - INTERVAL '${timeframe}'
          AND av.verdict IS NOT NULL
      `;

      // Placeholder implementation
      return 0.85 + Math.random() * 0.1; // Random between 85-95%

    } catch (error) {
      logger.error('Accuracy rate calculation failed:', error);
      return 0;
    }
  }

  calculateOverallRating(activityStats, verdictStats) {
    // Calculate overall rating based on various factors
    let rating = 0;

    // Activity factor (30% weight)
    const activityScore = Math.min(activityStats.total_activities / 50, 1); // Normalize to 0-1
    rating += activityScore * 0.3;

    // Accuracy factor (40% weight)
    rating += verdictStats.accuracy_rate * 0.4;

    // Efficiency factor (30% weight)
    const efficiencyScore = verdictStats.average_review_time > 0 ? 
        Math.min(1800 / verdictStats.average_review_time, 1) : 0; // 30 minutes as ideal
    rating += efficiencyScore * 0.3;

    return Math.min(rating * 5, 5); // Convert to 5-star scale
  }

  async getActiveSessions() {
    try {
      const activeSessions = await FactCheckerActivity.getActiveSessions();

      return {
        active_sessions: activeSessions,
        total_active: activeSessions.length,
        by_activity_type: this.groupSessionsByType(activeSessions)
      };

    } catch (error) {
      logger.error('Active sessions retrieval failed:', error);
      throw error;
    }
  }

  groupSessionsByType(sessions) {
    const groups = {};
    
    sessions.forEach(session => {
      if (!groups[session.activity_type]) {
        groups[session.activity_type] = [];
      }
      groups[session.activity_type].push(session);
    });

    return groups;
  }

  async getTimeSpentAnalysis(factCheckerId, timeframe = '7 days') {
    try {
      const report = await FactCheckerActivity.getProductivityReport(factCheckerId, timeframe);

      const analysis = {
        total_time_spent: report.totals.time_spent,
        average_daily_time: report.averages.time_per_day,
        time_distribution: this.analyzeTimeDistribution(report.daily_breakdown),
        efficiency_metrics: this.calculateEfficiencyMetrics(report)
      };

      return analysis;

    } catch (error) {
      logger.error('Time spent analysis failed:', error);
      throw error;
    }
  }

  analyzeTimeDistribution(dailyBreakdown) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const distribution = {};

    dailyBreakdown.forEach(day => {
      const date = new Date(day.date);
      const weekday = weekdays[date.getDay()];
      
      if (!distribution[weekday]) {
        distribution[weekday] = {
          total_seconds: 0,
          days_count: 0
        };
      }

      distribution[weekday].total_seconds += day.total_seconds;
      distribution[weekday].days_count += 1;
    });

    // Calculate averages
    for (const weekday in distribution) {
      distribution[weekday].average_seconds = 
        distribution[weekday].total_seconds / distribution[weekday].days_count;
    }

    return distribution;
  }

  calculateEfficiencyMetrics(report) {
    const totalTime = report.totals.time_spent;
    const totalClaims = report.totals.claims_reviewed;

    return {
      claims_per_hour: totalTime > 0 ? (totalClaims / (totalTime / 3600)).toFixed(2) : 0,
      time_per_claim: totalClaims > 0 ? (totalTime / totalClaims).toFixed(0) : 0,
      efficiency_score: totalTime > 0 ? Math.min((totalClaims / (totalTime / 3600)) / 5, 1) : 0 // 5 claims/hour = perfect score
    };
  }

  async generatePerformanceReport(factCheckerId, timeframe = '30 days', format = 'json') {
    try {
      const performanceData = await this.getFactCheckerPerformance(factCheckerId, timeframe);

      if (format === 'csv') {
        return this.convertPerformanceToCSV(performanceData);
      }

      return performanceData;

    } catch (error) {
      logger.error('Performance report generation failed:', error);
      throw error;
    }
  }

  convertPerformanceToCSV(performanceData) {
    const headers = ['Metric', 'Value', 'Timeframe'];
    const rows = [];

    // Add activity stats
    rows.push(['Total Activities', performanceData.activity_stats.total_activities, performanceData.timeframe]);
    rows.push(['Total Time Spent', performanceData.activity_stats.total_time_spent, performanceData.timeframe]);
    
    // Add verdict stats
    rows.push(['Total Verdicts', performanceData.verdict_stats.total_verdicts, performanceData.timeframe]);
    rows.push(['Accuracy Rate', (performanceData.verdict_stats.accuracy_rate * 100).toFixed(1) + '%', performanceData.timeframe]);
    
    // Add productivity stats
    rows.push(['Claims Reviewed', performanceData.productivity.totals.claims_reviewed, performanceData.timeframe]);
    rows.push(['Average Time Per Claim', performanceData.verdict_stats.average_review_time, performanceData.timeframe]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async cleanupIncompleteSessions() {
    try {
      const cleanedSessions = await FactCheckerActivity.cleanupIncompleteSessions();

      if (cleanedSessions.length > 0) {
        logger.info('Incomplete sessions cleaned up', {
          count: cleanedSessions.length,
          session_ids: cleanedSessions.map(s => s.id)
        });
      }

      return {
        cleaned_count: cleanedSessions.length,
        sessions: cleanedSessions
      };

    } catch (error) {
      logger.error('Incomplete sessions cleanup failed:', error);
      throw error;
    }
  }

  async getWorkloadRecommendations(factCheckerId) {
    try {
      const performance = await this.getFactCheckerPerformance(factCheckerId, '7 days');
      
      const recommendations = [];

      // Check if fact-checker is overworked
      if (performance.activity_stats.total_time_spent > 28800) { // More than 8 hours/day average
        recommendations.push({
          type: 'workload',
          priority: 'high',
          message: 'Consider reducing workload to prevent burnout',
          suggestion: 'Delegate some claims to other fact-checkers'
        });
      }

      // Check accuracy trends
      if (performance.verdict_stats.accuracy_rate < 0.8) {
        recommendations.push({
          type: 'accuracy',
          priority: 'medium',
          message: 'Accuracy rate below optimal level',
          suggestion: 'Focus on thorough research and evidence collection'
        });
      }

      // Check efficiency
      const efficiency = performance.verdict_stats.average_review_time;
      if (efficiency > 3600) { // More than 1 hour per claim average
        recommendations.push({
          type: 'efficiency',
          priority: 'medium',
          message: 'Review time is higher than average',
          suggestion: 'Consider using research templates and tools'
        });
      }

      return {
        fact_checker_id: factCheckerId,
        recommendations: recommendations,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Workload recommendations generation failed:', error);
      throw error;
    }
  }
}

module.exports = new FactCheckerActivityService();