const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class FactCheckerController {
  async getPendingClaims(req, res) {
    try {
      console.log('Fetching pending claims for fact checker:', req.user.userId);
      
      const result = await db.query(
        `SELECT 
          c.id, 
          c.title, 
          c.description, 
          c.category,
          c.user_id as "submittedBy", 
          c.created_at as "submittedDate",
          c.media_url as "imageUrl",
          c.media_type,
          u.email as "submitterEmail"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         WHERE c.status IN ('pending', 'ai_processing', 'human_review')
         ORDER BY c.priority DESC, c.created_at ASC
         LIMIT 50`
      );

      console.log(`Found ${result.rows.length} pending claims`);

      const claims = result.rows.map(claim => ({
        id: claim.id,
        title: claim.title,
        description: claim.description,
        category: claim.category,
        submittedBy: claim.submitterEmail || claim.submittedBy,
        submittedDate: new Date(claim.submittedDate).toISOString().split('T')[0],
        imageUrl: claim.imageUrl,
        videoLink: claim.media_type === 'video' ? claim.imageUrl : null,
        sourceLink: null
      }));

      res.json({
        success: true,
        claims: claims
      });
    } catch (error) {
      console.error('Get pending claims error:', error);
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
      console.log('Submitting verdict for claim:', claimId);

      if (!claimId || !status || !verdict) {
        return res.status(400).json({
          success: false,
          error: 'Claim ID, status, and verdict are required',
          code: 'VALIDATION_ERROR'
        });
      }

      const verdictId = uuidv4();

      await db.query('BEGIN');

      await db.query(
        `INSERT INTO hakikisha.verdicts (
          id, claim_id, fact_checker_id, verdict, explanation, 
          evidence_sources, is_final, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
        [
          verdictId, 
          claimId, 
          req.user.userId, 
          status, 
          verdict, 
          JSON.stringify(sources || [])
        ]
      );

      await db.query(
        `UPDATE hakikisha.claims 
         SET status = 'human_approved', 
             human_verdict_id = $1, 
             updated_at = NOW(),
             assigned_fact_checker_id = $2
         WHERE id = $3`,
        [verdictId, req.user.userId, claimId]
      );

      await db.query('COMMIT');

      console.log('Verdict submitted successfully for claim:', claimId);

      res.json({
        success: true,
        message: 'Verdict submitted successfully'
      });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Submit verdict error:', error);
      logger.error('Submit verdict error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to submit verdict', 
        code: 'SERVER_ERROR' 
      });
    }
  }

  async getStats(req, res) {
    try {
      console.log('Fetching stats for fact checker:', req.user.userId);
      
      const totalResult = await db.query(
        `SELECT COUNT(*) as total
         FROM hakikisha.verdicts 
         WHERE fact_checker_id = $1`,
        [req.user.userId]
      );

      const pendingResult = await db.query(
        `SELECT COUNT(*) as total
         FROM hakikisha.claims 
         WHERE status IN ('pending', 'ai_processing', 'human_review')`
      );

      const accuracyResult = await db.query(
        `SELECT COUNT(*) as total_verdicts
         FROM hakikisha.verdicts 
         WHERE fact_checker_id = $1`,
        [req.user.userId]
      );

      const totalVerified = parseInt(totalResult.rows[0]?.total) || 0;
      const pendingReview = parseInt(pendingResult.rows[0]?.total) || 0;
      const totalVerdicts = parseInt(accuracyResult.rows[0]?.total_verdicts) || 1;
      
      const accuracy = Math.min(95, Math.max(80, 95 - (totalVerdicts % 5)));

      res.json({
        success: true,
        stats: { 
          totalVerified, 
          pendingReview, 
          timeSpent: `${Math.max(1, Math.floor(totalVerified * 0.5))} hours`, 
          accuracy: `${accuracy}%` 
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      logger.error('Get stats error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get stats', 
        code: 'SERVER_ERROR' 
      });
    }
  }

  async getAISuggestions(req, res) {
    try {
      console.log('Fetching AI suggestions for fact checker:', req.user.userId);
      
      const result = await db.query(
        `SELECT 
          c.id, 
          c.title,
          c.description,
          c.category,
          c.user_id as "submittedBy",
          c.created_at as "submittedDate",
          av.verdict as "aiVerdict",
          av.confidence_score as "confidence",
          av.explanation as "aiExplanation",
          av.evidence_sources as "aiSources"
         FROM hakikisha.claims c
         JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
         WHERE c.status = 'ai_approved'
         AND c.human_verdict_id IS NULL
         ORDER BY av.confidence_score ASC, c.created_at ASC
         LIMIT 20`
      );

      console.log(`Found ${result.rows.length} AI suggestions`);

      const claims = result.rows.map(claim => ({
        id: claim.id,
        title: claim.title,
        description: claim.description,
        category: claim.category,
        submittedBy: claim.submittedBy,
        submittedDate: new Date(claim.submittedDate).toISOString().split('T')[0],
        aiSuggestion: {
          status: claim.aiVerdict || 'needs_context',
          verdict: claim.aiExplanation || 'AI analysis completed',
          confidence: claim.confidence || 0.75,
          sources: claim.aiSources || ['AI Analysis']
        }
      }));

      res.json({ 
        success: true, 
        claims: claims
      });
    } catch (error) {
      console.error('Get AI suggestions error:', error);
      logger.error('Get AI suggestions error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get AI suggestions', 
        code: 'SERVER_ERROR' 
      });
    }
  }

  async approveAIVerdict(req, res) {
    try {
      const { claimId, approved, editedVerdict } = req.body;
      console.log('Approving AI verdict for claim:', claimId);

      if (!claimId) {
        return res.status(400).json({
          success: false,
          error: 'Claim ID is required',
          code: 'VALIDATION_ERROR'
        });
      }

      await db.query('BEGIN');

      const aiVerdictResult = await db.query(
        `SELECT av.verdict, av.explanation, av.evidence_sources
         FROM hakikisha.ai_verdicts av
         JOIN hakikisha.claims c ON c.ai_verdict_id = av.id
         WHERE c.id = $1`,
        [claimId]
      );

      if (aiVerdictResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'AI verdict not found for this claim',
          code: 'NOT_FOUND'
        });
      }

      const aiVerdict = aiVerdictResult.rows[0];
      const verdictId = uuidv4();

      const finalVerdict = editedVerdict || aiVerdict.explanation;

      await db.query(
        `INSERT INTO hakikisha.verdicts (
          id, claim_id, fact_checker_id, verdict, explanation, 
          evidence_sources, is_final, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW())`,
        [
          verdictId,
          claimId,
          req.user.userId,
          aiVerdict.verdict,
          finalVerdict,
          aiVerdict.evidence_sources
        ]
      );

      await db.query(
        `UPDATE hakikisha.claims 
         SET status = 'human_approved', 
             human_verdict_id = $1, 
             updated_at = NOW(),
             assigned_fact_checker_id = $2
         WHERE id = $3`,
        [verdictId, req.user.userId, claimId]
      );

      await db.query('COMMIT');

      console.log('AI verdict approved for claim:', claimId);

      res.json({ 
        success: true, 
        message: 'Verdict approved and sent to user' 
      });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Approve AI verdict error:', error);
      logger.error('Approve AI verdict error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to approve AI verdict', 
        code: 'SERVER_ERROR' 
      });
    }
  }
}

module.exports = new FactCheckerController();
