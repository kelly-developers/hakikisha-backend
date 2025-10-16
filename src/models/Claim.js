const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class Claim {
  static async create(claimData) {
    const {
      user_id,
      title,
      description,
      category,
      media_type = 'text',
      media_url = null
    } = claimData;

    const id = uuidv4();
    const query = `
      INSERT INTO claims (
        id, user_id, title, description, category, media_type, media_url, 
        status, priority, submission_count, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'medium', 1, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, user_id, title, description, category, media_type, media_url
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating claim:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT c.*, u.email as user_email, u.phone as user_phone,
             av.verdict as ai_verdict, av.confidence_score as ai_confidence,
             v.verdict as human_verdict, v.explanation as human_explanation,
             fc.user_id as fact_checker_id
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
      LEFT JOIN verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN fact_checkers fc ON c.assigned_fact_checker_id = fc.id
      WHERE c.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding claim by id:', error);
      throw error;
    }
  }

  static async findByStatus(status, limit = 20, offset = 0) {
    const query = `
      SELECT c.*, u.email as user_email
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.status = $1
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [status, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding claims by status:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, factCheckerId = null) {
    const query = `
      UPDATE claims 
      SET status = $1, 
          assigned_fact_checker_id = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    try {
      const result = await db.query(query, [status, factCheckerId, id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating claim status:', error);
      throw error;
    }
  }

  static async assignToFactChecker(claimId, factCheckerId) {
    const query = `
      UPDATE claims 
      SET assigned_fact_checker_id = $1, status = 'human_review', updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    try {
      const result = await db.query(query, [factCheckerId, claimId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error assigning claim to fact checker:', error);
      throw error;
    }
  }

  static async getTrendingClaims(limit = 10) {
    const query = `
      SELECT c.id, c.title, c.category, c.status,
             COALESCE(v.verdict, av.verdict) as verdict,
             c.trending_score as trendingScore,
             c.created_at as submittedDate,
             v.created_at as verdictDate
      FROM claims c
      LEFT JOIN verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
      WHERE c.is_trending = true
      ORDER BY c.trending_score DESC, c.submission_count DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting trending claims:', error);
      throw error;
    }
  }

  static async searchClaims(queryText, category = null, limit = 20, offset = 0) {
    let query = `
      SELECT c.*, u.email as user_email,
             COALESCE(v.verdict, av.verdict) as final_verdict
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
      WHERE (c.title ILIKE $1 OR c.description ILIKE $1)
    `;

    const params = [`%${queryText}%`];
    let paramCount = 2;

    if (category) {
      query += ` AND c.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error searching claims:', error);
      throw error;
    }
  }

  static async getUserClaims(userId, status = null) {
    let query = `
      SELECT c.id, c.title, c.category, c.status,
             c.created_at as submittedDate,
             v.created_at as verdictDate,
             v.verdict, v.evidence_sources as sources
      FROM claims c
      LEFT JOIN verdicts v ON c.human_verdict_id = v.id
      WHERE c.user_id = $1
    `;

    const params = [userId];

    if (status && status !== 'all') {
      query += ` AND c.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY c.created_at DESC`;

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting user claims:', error);
      throw error;
    }
  }
}

module.exports = Claim;