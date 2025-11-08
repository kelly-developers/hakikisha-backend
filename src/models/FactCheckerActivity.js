const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class FactCheckerActivity {
  static async create(activityData) {
    const {
      fact_checker_id,
      activity_type,
      claim_id = null,
      verdict_id = null,
      blog_id = null,
      start_time,
      end_time = null,
      duration = null,
      ip_address,
      device_info = {}
    } = activityData;

    const id = uuidv4();
    const query = `
      INSERT INTO fact_checker_activities (id, fact_checker_id, activity_type, claim_id, verdict_id, blog_id, start_time, end_time, duration, ip_address, device_info, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, fact_checker_id, activity_type, claim_id, verdict_id, blog_id,
        start_time, end_time, duration, ip_address, JSON.stringify(device_info)
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating fact checker activity:', error);
      throw error;
    }
  }

  static async endSession(activityId, endTime = new Date()) {
    const query = `
      UPDATE fact_checker_activities 
      SET end_time = $1, duration = EXTRACT(EPOCH FROM ($1 - start_time))
      WHERE id = $2 AND end_time IS NULL
      RETURNING *
    `;

    try {
      const result = await db.query(query, [endTime, activityId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error ending fact checker session:', error);
      throw error;
    }
  }

  static async getFactCheckerStats(factCheckerId, timeframe = '30 days') {
    const query = `
      SELECT 
        activity_type,
        COUNT(*) as total_activities,
        AVG(duration) as avg_duration,
        SUM(duration) as total_duration
      FROM fact_checker_activities 
      WHERE fact_checker_id = $1 
        AND created_at >= NOW() - INTERVAL '${timeframe}'
        AND duration IS NOT NULL
      GROUP BY activity_type
      ORDER BY total_activities DESC
    `;

    try {
      const result = await db.query(query, [factCheckerId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting fact checker stats:', error);
      throw error;
    }
  }

  static async getProductivityReport(factCheckerId, timeframe = '7 days') {
    const query = `
      SELECT 
        DATE(start_time) as date,
        COUNT(*) as total_sessions,
        SUM(duration) as total_seconds,
        COUNT(DISTINCT claim_id) as claims_reviewed,
        COUNT(DISTINCT verdict_id) as verdicts_submitted
      FROM fact_checker_activities 
      WHERE fact_checker_id = $1 
        AND start_time >= NOW() - INTERVAL '${timeframe}'
      GROUP BY DATE(start_time)
      ORDER BY date DESC
    `;

    try {
      const result = await db.query(query, [factCheckerId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting productivity report:', error);
      throw error;
    }
  }

  static async getActiveSessions() {
    const query = `
      SELECT 
        fca.*,
        u.email as fact_checker_email,
        c.title as claim_title
      FROM fact_checker_activities fca
      LEFT JOIN users u ON fca.fact_checker_id = u.id
      LEFT JOIN claims c ON fca.claim_id = c.id
      WHERE fca.end_time IS NULL
      ORDER BY fca.start_time DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  static async getTimeSpentOnClaim(claimId) {
    const query = `
      SELECT 
        fca.fact_checker_id,
        u.email as fact_checker_email,
        SUM(fca.duration) as total_seconds,
        COUNT(*) as session_count
      FROM fact_checker_activities fca
      LEFT JOIN users u ON fca.fact_checker_id = u.id
      WHERE fca.claim_id = $1 AND fca.duration IS NOT NULL
      GROUP BY fca.fact_checker_id, u.email
      ORDER BY total_seconds DESC
    `;

    try {
      const result = await db.query(query, [claimId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting time spent on claim:', error);
      throw error;
    }
  }

  static async getLeaderboard(timeframe = '30 days', limit = 10) {
    const query = `
      SELECT 
        fca.fact_checker_id,
        u.email as fact_checker_email,
        COUNT(DISTINCT fca.verdict_id) as verdicts_count,
        SUM(fca.duration) as total_seconds,
        AVG(fca.duration) as avg_time_per_verdict
      FROM fact_checker_activities fca
      LEFT JOIN users u ON fca.fact_checker_id = u.id
      WHERE fca.created_at >= NOW() - INTERVAL '${timeframe}'
        AND fca.activity_type = 'verdict_submission'
      GROUP BY fca.fact_checker_id, u.email
      ORDER BY verdicts_count DESC, total_seconds DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting fact checker leaderboard:', error);
      throw error;
    }
  }

  static async cleanupIncompleteSessions() {
    const query = `
      UPDATE fact_checker_activities 
      SET end_time = NOW(), duration = EXTRACT(EPOCH FROM (NOW() - start_time))
      WHERE end_time IS NULL AND start_time < NOW() - INTERVAL '24 hours'
      RETURNING *
    `;

    try {
      const result = await db.query(query);
      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} incomplete fact checker sessions`);
      }
      return result.rows;
    } catch (error) {
      logger.error('Error cleaning up incomplete sessions:', error);
      throw error;
    }
  }
}

module.exports = FactCheckerActivity;