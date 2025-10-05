const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class AIVerdict {
  static async create(verdictData) {
    const {
      claim_id,
      verdict,
      confidence_score,
      explanation,
      evidence_sources,
      ai_model_version
    } = verdictData;

    const id = uuidv4();
    const query = `
      INSERT INTO ai_verdicts (id, claim_id, verdict, confidence_score, explanation, evidence_sources, ai_model_version, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, claim_id, verdict, confidence_score, explanation, 
        JSON.stringify(evidence_sources), ai_model_version
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating AI verdict:', error);
      throw error;
    }
  }

  static async findByClaimId(claimId) {
    const query = 'SELECT * FROM ai_verdicts WHERE claim_id = $1';
    try {
      const result = await db.query(query, [claimId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding AI verdict by claim ID:', error);
      throw error;
    }
  }

  static async update(id, updates) {
    const allowedFields = ['verdict', 'confidence_score', 'explanation', 'evidence_sources'];
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
      UPDATE ai_verdicts 
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating AI verdict:', error);
      throw error;
    }
  }

  static async getAccuracyStats(timeframe = '30 days') {
    const query = `
      SELECT 
        verdict,
        COUNT(*) as total,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN av.verdict = v.verdict THEN 1 END) as correct_matches
      FROM ai_verdicts av
      LEFT JOIN verdicts v ON av.claim_id = v.claim_id
      WHERE av.created_at >= NOW() - INTERVAL '${timeframe}'
        AND v.verdict IS NOT NULL
      GROUP BY av.verdict
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting AI accuracy stats:', error);
      throw error;
    }
  }
}

module.exports = AIVerdict;