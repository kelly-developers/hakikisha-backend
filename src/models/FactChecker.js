const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class FactChecker {
  static async create(factCheckerData) {
    const {
      user_id,
      expertise_areas = [],
      verification_status = 'pending',
      rating = 0,
      total_reviews = 0,
      is_active = true
    } = factCheckerData;

    const id = uuidv4();
    const query = `
      INSERT INTO fact_checkers (id, user_id, expertise_areas, verification_status, rating, total_reviews, is_active, joined_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, user_id, JSON.stringify(expertise_areas), verification_status, 
        rating, total_reviews, is_active
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating fact checker:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT fc.*, u.email, u.phone, u.profile_picture
      FROM fact_checkers fc
      LEFT JOIN users u ON fc.user_id = u.id
      WHERE fc.user_id = $1
    `;
    try {
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding fact checker by user ID:', error);
      throw error;
    }
  }

  static async findAllActive() {
    const query = `
      SELECT fc.*, u.email, u.phone, u.profile_picture
      FROM fact_checkers fc
      LEFT JOIN users u ON fc.user_id = u.id
      WHERE fc.is_active = true AND fc.verification_status = 'approved'
      ORDER BY fc.rating DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error finding active fact checkers:', error);
      throw error;
    }
  }

  static async updateRating(factCheckerId, newRating) {
    const query = `
      UPDATE fact_checkers 
      SET rating = (rating * total_reviews + $1) / (total_reviews + 1),
          total_reviews = total_reviews + 1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [newRating, factCheckerId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating fact checker rating:', error);
      throw error;
    }
  }

  static async getPerformanceStats(factCheckerId, timeframe = '30 days') {
    const query = `
      SELECT 
        COUNT(*) as total_verdicts,
        AVG(time_spent) as avg_time_per_verdict,
        COUNT(CASE WHEN verdict = 'true' THEN 1 END) as true_count,
        COUNT(CASE WHEN verdict = 'false' THEN 1 END) as false_count,
        COUNT(CASE WHEN verdict = 'misleading' THEN 1 END) as misleading_count
      FROM verdicts 
      WHERE fact_checker_id = $1 
        AND created_at >= NOW() - INTERVAL '${timeframe}'
    `;

    try {
      const result = await db.query(query, [factCheckerId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting fact checker performance stats:', error);
      throw error;
    }
  }

  static async updateStatus(userId, status) {
    const query = `
      UPDATE fact_checkers 
      SET verification_status = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [status, userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating fact checker status:', error);
      throw error;
    }
  }
}

module.exports = FactChecker;