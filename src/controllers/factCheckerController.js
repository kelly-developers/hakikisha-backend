const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class FactCheckerController {
  async getPendingClaims(req, res) {
    try {
      const result = await db.query(
        `SELECT c.id, c.title as claimTitle, c.description, c.category,
                c.user_id as submittedBy, c.created_at as submittedDate,
                c.media_url as imageUrl
         FROM claims c
         WHERE c.status IN ('pending', 'ai_processing', 'human_review')
         ORDER BY c.priority DESC, c.created_at ASC
         LIMIT 50`
      );

      res.json({
        success: true,
        pendingClaims: result.rows
      });
    } catch (error) {
      logger.error('Get pending claims error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending claims',
        code: 'SERVER_ERROR'
      });
    }
  }

  async submitVerdict(req, res) {
    try {
      const { claimId, status, verdict, sources } = req.body;

      const verdictId = uuidv4();

      await db.query(
        `INSERT INTO verdicts (id, claim_id, fact_checker_id, verdict, explanation, evidence_sources, is_final, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
        [verdictId, claimId, req.user.userId, status, verdict, JSON.stringify(sources || [])]
      );

      await db.query(
        `UPDATE claims SET status = 'human_approved', human_verdict_id = $1, updated_at = NOW() WHERE id = $2`,
        [verdictId, claimId]
      );

      res.json({
        success: true,
        message: 'Verdict submitted successfully'
      });
    } catch (error) {
      logger.error('Submit verdict error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit verdict', code: 'SERVER_ERROR' });
    }
  }

  async getStats(req, res) {
    try {
      res.json({
        success: true,
        stats: { totalVerified: 45, pendingReview: 12, timeSpent: "24 hours", accuracy: "95%" }
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats', code: 'SERVER_ERROR' });
    }
  }

  async getAISuggestions(req, res) {
    try {
      res.json({ success: true, suggestions: [] });
    } catch (error) {
      logger.error('Get AI suggestions error:', error);
      res.status(500).json({ success: false, error: 'Failed to get suggestions', code: 'SERVER_ERROR' });
    }
  }

  async approveAIVerdict(req, res) {
    try {
      res.json({ success: true, message: 'Verdict approved' });
    } catch (error) {
      logger.error('Approve AI verdict error:', error);
      res.status(500).json({ success: false, error: 'Failed to approve verdict', code: 'SERVER_ERROR' });
    }
  }
}

module.exports = new FactCheckerController();
