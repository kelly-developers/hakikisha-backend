const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class Analytics {
  static async trackUserAction(userId, action, metadata = {}) {
    const id = uuidv4();
    const query = `
      INSERT INTO user_analytics (id, user_id, action, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, userId, action, JSON.stringify(metadata)
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error tracking user action:', error);
      throw error;
    }
  }

  static async getPlatformStats(timeframe = '30 days') {
    const query = `
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_actions,
        COUNT(DISTINCT CASE WHEN action = 'claim_submission' THEN user_id END) as claim_submitters,
        COUNT(DISTINCT CASE WHEN action = 'verdict_submission' THEN user_id END) as fact_checkers_active,
        AVG(CASE WHEN action = 'session_duration' THEN (metadata->>'duration')::numeric END) as avg_session_duration
      FROM user_analytics 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
    `;

    try {
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting platform stats:', error);
      throw error;
    }
  }

  static async getUserEngagement(userId, timeframe = '30 days') {
    const query = `
      SELECT 
        action,
        COUNT(*) as count,
        MAX(created_at) as last_performed
      FROM user_analytics 
      WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY action
      ORDER BY count DESC
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting user engagement:', error);
      throw error;
    }
  }

  static async getFeatureUsage(timeframe = '30 days') {
    const query = `
      SELECT 
        action as feature,
        COUNT(*) as usage_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM user_analytics 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
        AND action IN ('claim_submission', 'search_performed', 'blog_view', 'verdict_submission')
      GROUP BY action
      ORDER BY usage_count DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting feature usage:', error);
      throw error;
    }
  }

  static async getRetentionRate(timeframe = '30 days') {
    const query = `
      WITH user_first_actions AS (
        SELECT 
          user_id,
          MIN(created_at) as first_action_date
        FROM user_analytics 
        GROUP BY user_id
      ),
      active_users AS (
        SELECT 
          ufa.user_id,
          CASE 
            WHEN MAX(ua.created_at) >= NOW() - INTERVAL '7 days' THEN 1
            ELSE 0
          END as is_active
        FROM user_first_actions ufa
        LEFT JOIN user_analytics ua ON ufa.user_id = ua.user_id
        WHERE ufa.first_action_date >= NOW() - INTERVAL '${timeframe}'
        GROUP BY ufa.user_id
      )
      SELECT 
        ROUND(AVG(is_active) * 100, 2) as retention_rate
      FROM active_users
    `;

    try {
      const result = await db.query(query);
      return result.rows[0].retention_rate;
    } catch (error) {
      logger.error('Error getting retention rate:', error);
      throw error;
    }
  }

  static async getActivityHeatmap(timeframe = '7 days') {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        EXTRACT(DOW FROM created_at) as day_of_week,
        COUNT(*) as activity_count
      FROM user_analytics 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY hour, day_of_week
      ORDER BY day_of_week, hour
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting activity heatmap:', error);
      throw error;
    }
  }

  static async getGrowthMetrics(timeframe = '30 days') {
    const query = `
      WITH daily_metrics AS (
        SELECT 
          DATE(created_at) as date,
          COUNT(DISTINCT user_id) as daily_active_users,
          COUNT(CASE WHEN action = 'claim_submission' THEN 1 END) as daily_claims,
          COUNT(CASE WHEN action = 'verdict_submission' THEN 1 END) as daily_verdicts
        FROM user_analytics 
        WHERE created_at >= NOW() - INTERVAL '${timeframe}'
        GROUP BY DATE(created_at)
      )
      SELECT 
        date,
        daily_active_users,
        daily_claims,
        daily_verdicts,
        LAG(daily_active_users) OVER (ORDER BY date) as prev_day_users,
        LAG(daily_claims) OVER (ORDER BY date) as prev_day_claims
      FROM daily_metrics
      ORDER BY date DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting growth metrics:', error);
      throw error;
    }
  }

  static async cleanupOldData(retentionDays = 365) {
    const query = `
      DELETE FROM user_analytics 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    try {
      const result = await db.query(query);
      logger.info(`Cleaned up ${result.rowCount} old analytics records`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up analytics data:', error);
      throw error;
    }
  }
}

module.exports = Analytics;