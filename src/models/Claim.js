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
      media_url = null,
      video_url = null,
      source_url = null
    } = claimData;

    const id = uuidv4();
    const query = `
      INSERT INTO hakikisha.claims (
        id, user_id, title, description, category, media_type, media_url, 
        video_url, source_url, status, priority, submission_count, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'medium', 1, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, user_id, title, description, category, media_type, media_url, video_url, source_url
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
             av.id as ai_verdict_id,
             av.verdict as ai_verdict_value, 
             av.confidence_score as ai_confidence,
             av.explanation as ai_explanation,
             av.evidence_sources as ai_sources,
             av.is_edited_by_human,
             av.edited_by_fact_checker_id,
             av.edited_at,
             av.disclaimer as ai_disclaimer,
             v.verdict as human_verdict, 
             v.explanation as human_explanation,
             v.evidence_sources as human_sources,
             fc.id as fact_checker_id,
             u2.email as fact_checker_email
      FROM hakikisha.claims c
      LEFT JOIN hakikisha.users u ON c.user_id = u.id
      LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
      LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN hakikisha.users fc ON c.assigned_fact_checker_id = fc.id
      LEFT JOIN hakikisha.users u2 ON av.edited_by_fact_checker_id = u2.id
      WHERE c.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      const claim = result.rows[0];
      
      if (claim) {
        // Determine the actual verdict (human takes precedence, then AI)
        claim.verdict = claim.human_verdict || claim.ai_verdict_value || null;
        claim.verdictText = claim.human_explanation || claim.ai_explanation || null;
        claim.verified_by_ai = !!claim.ai_verdict_id && !claim.human_verdict;
        
        // Structure AI verdict object if exists
        if (claim.ai_verdict_id) {
          claim.ai_verdict = {
            id: claim.ai_verdict_id,
            verdict: claim.ai_verdict_value,
            explanation: claim.ai_explanation,
            confidence_score: claim.ai_confidence,
            sources: claim.ai_sources,
            disclaimer: claim.ai_disclaimer,
            is_edited_by_human: claim.is_edited_by_human || false,
            edited_at: claim.edited_at,
            edited_by: claim.fact_checker_email
          };
        }
        
        // Structure fact checker info if exists
        if (claim.is_edited_by_human && claim.fact_checker_email) {
          claim.fact_checker = {
            id: claim.edited_by_fact_checker_id,
            email: claim.fact_checker_email
          };
        }
      }
      
      return claim;
    } catch (error) {
      logger.error('Error finding claim by id:', error);
      throw error;
    }
  }

  static async findByStatus(status, limit = 20, offset = 0) {
    const query = `
      SELECT c.*, u.email as user_email
      FROM hakikisha.claims c
      LEFT JOIN hakikisha.users u ON c.user_id = u.id
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
      UPDATE hakikisha.claims 
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
      UPDATE hakikisha.claims 
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
             c.video_url, c.source_url,
             COALESCE(v.verdict, av.verdict) as verdict,
             c.trending_score as trendingScore,
             c.created_at as submittedDate,
             COALESCE(v.created_at, av.created_at) as verdictDate,
             CASE WHEN v.id IS NOT NULL THEN false ELSE true END as verified_by_ai,
             av.confidence_score as ai_confidence,
             av.is_edited_by_human
      FROM hakikisha.claims c
      LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
      WHERE c.is_trending = true 
        AND (v.verdict IS NOT NULL OR av.verdict IS NOT NULL)
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
      FROM hakikisha.claims c
      LEFT JOIN hakikisha.users u ON c.user_id = u.id
      LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
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
             c.video_url, c.source_url,
             c.created_at as submittedDate,
             COALESCE(v.created_at, av.created_at) as verdictDate,
             COALESCE(v.verdict, av.verdict) as verdict,
             COALESCE(v.evidence_sources, av.evidence_sources) as sources,
             CASE WHEN v.id IS NOT NULL THEN false ELSE true END as verified_by_ai
      FROM hakikisha.claims c
      LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
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

  static async countAll() {
    try {
      const result = await db.query('SELECT COUNT(*) FROM hakikisha.claims');
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting all claims:', error);
      return 0;
    }
  }

  static async countByStatus(status) {
    try {
      const result = await db.query('SELECT COUNT(*) FROM hakikisha.claims WHERE status = $1', [status]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting claims by status:', error);
      return 0;
    }
  }

  static async countVerifiedFalse() {
    try {
      const result = await db.query(`
        SELECT COUNT(*) 
        FROM hakikisha.claims c
        JOIN hakikisha.verdicts v ON c.id = v.claim_id
        WHERE v.verdict = 'false' AND v.is_final = true
      `);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting verified false claims:', error);
      return 0;
    }
  }

  static async countByUserId(userId) {
    try {
      const result = await db.query('SELECT COUNT(*) FROM hakikisha.claims WHERE user_id = $1', [userId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting claims by user:', error);
      return 0;
    }
  }

  static async getRecentClaims(timeframe = '7 days') {
    try {
      const result = await db.query(`
        SELECT COUNT(*) 
        FROM hakikisha.claims 
        WHERE created_at >= NOW() - INTERVAL '${timeframe}'
      `);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting recent claims:', error);
      return 0;
    }
  }

  static async getOverviewStats(timeframe = '30 days') {
    try {
      const [
        totalClaims,
        newClaims,
        claimsByStatus,
        claimsByCategory
      ] = await Promise.all([
        this.countAll(),
        this.getRecentClaims(timeframe),
        this.getClaimsByStatus(),
        this.getClaimsByCategory(timeframe)
      ]);

      return {
        total: totalClaims,
        new: newClaims,
        by_status: claimsByStatus,
        by_category: claimsByCategory
      };
    } catch (error) {
      logger.error('Error getting claim overview stats:', error);
      throw error;
    }
  }

  static async getClaimsByStatus() {
    try {
      const result = await db.query(`
        SELECT status, COUNT(*) as count 
        FROM hakikisha.claims 
        GROUP BY status
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting claims by status:', error);
      return [];
    }
  }

  static async getClaimsByCategory(timeframe = '30 days') {
    try {
      const result = await db.query(`
        SELECT category, COUNT(*) as count 
        FROM hakikisha.claims 
        WHERE created_at >= NOW() - INTERVAL '${timeframe}'
        AND category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error getting claims by category:', error);
      return [];
    }
  }
}

module.exports = Claim;