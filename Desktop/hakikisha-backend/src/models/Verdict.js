const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class Verdict {
  static async create(verdictData) {
    const {
      claim_id,
      fact_checker_id,
      verdict,
      explanation,
      evidence_sources,
      ai_verdict_id = null,
      approval_status = 'approved',
      review_notes = '',
      time_spent = 0
    } = verdictData;

    const id = uuidv4();
    const query = `
      INSERT INTO verdicts (id, claim_id, fact_checker_id, verdict, explanation, evidence_sources, ai_verdict_id, approval_status, review_notes, time_spent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, claim_id, fact_checker_id, verdict, explanation, 
        JSON.stringify(evidence_sources), ai_verdict_id, approval_status, 
        review_notes, time_spent
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating verdict:', error);
      throw error;
    }
  }

  static async findByClaimId(claimId) {
    const query = `
      SELECT v.*, u.email as fact_checker_email, u.profile_picture as fact_checker_avatar
      FROM verdicts v
      LEFT JOIN users u ON v.fact_checker_id = u.id
      WHERE v.claim_id = $1
    `;
    try {
      const result = await db.query(query, [claimId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding verdict by claim ID:', error);
      throw error;
    }
  }

  static async findByFactChecker(factCheckerId, limit = 20, offset = 0) {
    const query = `
      SELECT v.*, c.title as claim_title, c.category as claim_category
      FROM verdicts v
      LEFT JOIN claims c ON v.claim_id = c.id
      WHERE v.fact_checker_id = $1
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [factCheckerId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding verdicts by fact checker:', error);
      throw error;
    }
  }

  static async getStats(factCheckerId = null, timeframe = '30 days') {
    let query = `
      SELECT 
        verdict,
        COUNT(*) as total,
        AVG(time_spent) as avg_time_spent
      FROM verdicts 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
    `;

    const params = [];
    if (factCheckerId) {
      query += ' AND fact_checker_id = $1';
      params.push(factCheckerId);
    }

    query += ' GROUP BY verdict ORDER BY total DESC';

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting verdict stats:', error);
      throw error;
    }
  }

  static async update(id, updates) {
    const allowedFields = ['verdict', 'explanation', 'evidence_sources', 'approval_status', 'review_notes', 'time_spent'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        setClause.push(`${field} = $${paramCount}`);
        values.push(field === 'evidence_sources' ? JSON.stringify(updates[field]) : updates[field]);
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    const query = `
      UPDATE verdicts 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating verdict:', error);
      throw error;
    }
  }
}

module.exports = Verdict;