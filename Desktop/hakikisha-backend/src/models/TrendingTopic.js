const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class TrendingTopic {
  static async create(topicData) {
    const {
      topic,
      category,
      claim_count = 0,
      engagement_score = 0,
      related_claims = [],
      ai_generated_blog_id = null,
      human_approved_blog_id = null,
      status = 'active'
    } = topicData;

    const id = uuidv4();
    const query = `
      INSERT INTO trending_topics (id, topic, category, claim_count, engagement_score, related_claims, ai_generated_blog_id, human_approved_blog_id, status, detected_at, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, topic, category, claim_count, engagement_score,
        JSON.stringify(related_claims), ai_generated_blog_id, human_approved_blog_id, status
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating trending topic:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT * FROM trending_topics 
      WHERE id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding trending topic by ID:', error);
      throw error;
    }
  }

  static async getCurrentTrending(options = {}) {
    const { category, limit = 10, timeframe = '24 hours', min_engagement = 30 } = options;

    let query = `
      SELECT * FROM trending_topics 
      WHERE status = 'active' 
        AND engagement_score >= $1
        AND last_updated >= NOW() - INTERVAL '${timeframe}'
    `;

    const params = [min_engagement];
    let paramCount = 2;

    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    query += ` ORDER BY engagement_score DESC, claim_count DESC LIMIT $${paramCount}`;
    params.push(limit);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting current trending topics:', error);
      throw error;
    }
  }

  static async updateEngagementScore(id, engagementScore) {
    const query = `
      UPDATE trending_topics 
      SET engagement_score = $1, last_updated = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [engagementScore, id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating engagement score:', error);
      throw error;
    }
  }

  static async addRelatedClaim(topicId, claimId) {
    const query = `
      UPDATE trending_topics 
      SET 
        related_claims = array_append(related_claims, $1),
        claim_count = claim_count + 1,
        last_updated = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [claimId, topicId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error adding related claim:', error);
      throw error;
    }
  }

  static async getTopicHistory(topicName, days = 7) {
    const query = `
      SELECT 
        DATE(detected_at) as date,
        AVG(engagement_score) as avg_engagement,
        MAX(engagement_score) as peak_engagement,
        COUNT(*) as appearances
      FROM trending_topics 
      WHERE topic = $1 AND detected_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(detected_at)
      ORDER BY date DESC
    `;

    try {
      const result = await db.query(query, [topicName]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting topic history:', error);
      throw error;
    }
  }

  static async getCategoryTrends(category = null, days = 7) {
    let query = `
      SELECT 
        category,
        COUNT(*) as topic_count,
        AVG(engagement_score) as avg_engagement,
        MAX(engagement_score) as max_engagement
      FROM trending_topics 
      WHERE detected_at >= NOW() - INTERVAL '${days} days'
    `;

    const params = [];
    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }

    query += ` GROUP BY category ORDER BY topic_count DESC`;

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting category trends:', error);
      throw error;
    }
  }

  static async markAsResolved(topicId) {
    const query = `
      UPDATE trending_topics 
      SET status = 'resolved', last_updated = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [topicId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error marking topic as resolved:', error);
      throw error;
    }
  }

  static async cleanupOldTopics(retentionDays = 30) {
    const query = `
      DELETE FROM trending_topics 
      WHERE detected_at < NOW() - INTERVAL '${retentionDays} days'
        AND status = 'resolved'
    `;

    try {
      const result = await db.query(query);
      logger.info(`Cleaned up ${result.rowCount} old trending topics`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up old topics:', error);
      throw error;
    }
  }
}

module.exports = TrendingTopic;