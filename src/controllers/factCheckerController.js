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
          u.email as "submitterEmail",
          av.verdict as "ai_verdict",
          av.explanation as "ai_explanation",
          av.confidence_score as "ai_confidence",
          av.evidence_sources as "ai_sources"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
         WHERE c.status IN ('pending', 'ai_processing', 'human_review')
         ORDER BY c.priority DESC, c.created_at ASC
         LIMIT 50`
      );

      console.log(`Found ${result.rows.length} pending claims`);

      const claims = result.rows.map(claim => {
        let aiSources = [];
        try {
          aiSources = claim.ai_sources ? 
            (typeof claim.ai_sources === 'string' ? 
              JSON.parse(claim.ai_sources) : claim.ai_sources) : [];
        } catch (e) {
          console.log('Error parsing AI sources:', e);
          aiSources = [];
        }

        return {
          id: claim.id,
          title: claim.title,
          description: claim.description,
          category: claim.category,
          submittedBy: claim.submitterEmail || claim.submittedBy,
          submittedDate: new Date(claim.submittedDate).toISOString().split('T')[0],
          imageUrl: claim.imageUrl,
          videoLink: claim.media_type === 'video' ? claim.imageUrl : null,
          sourceLink: null,
          ai_suggestion: {
            verdict: claim.ai_verdict,
            explanation: claim.ai_explanation,
            confidence: claim.ai_confidence,
            sources: aiSources
          }
        };
      });

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
      const { claimId, verdict, explanation, sources, time_spent = 0 } = req.body;
      console.log('Submitting verdict for claim:', claimId, 'by fact checker:', req.user.userId);

      if (!claimId || !verdict || !explanation) {
        return res.status(400).json({
          success: false,
          error: 'Claim ID, verdict, and explanation are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate verdict value
      const validVerdicts = ['verified', 'false', 'misleading', 'needs_context', 'unverifiable'];
      if (!validVerdicts.includes(verdict)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verdict value',
          code: 'VALIDATION_ERROR'
        });
      }

      const verdictId = uuidv4();

      await db.query('BEGIN');

      // Insert verdict
      await db.query(
        `INSERT INTO hakikisha.verdicts (
          id, claim_id, fact_checker_id, verdict, explanation, 
          evidence_sources, time_spent, is_final, approval_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved', NOW())`,
        [
          verdictId, 
          claimId, 
          req.user.userId, 
          verdict, 
          explanation, 
          JSON.stringify(sources || []),
          time_spent
        ]
      );

      // Update claim status and link verdict
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

      // Log activity
      try {
        await db.query(
          `INSERT INTO hakikisha.fact_checker_activities (
            id, fact_checker_id, activity_type, claim_id, verdict_id, 
            start_time, end_time, duration, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${time_spent} seconds', NOW(), $6, NOW())`,
          [uuidv4(), req.user.userId, 'verdict_submission', claimId, verdictId, time_spent]
        );
      } catch (activityError) {
        console.log('Failed to log activity:', activityError.message);
      }

      res.json({
        success: true,
        message: 'Verdict submitted successfully',
        verdictId: verdictId
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
      
      const [totalResult, pendingResult, accuracyResult, timeResult] = await Promise.all([
        db.query(
          `SELECT COUNT(*) as total
           FROM hakikisha.verdicts 
           WHERE fact_checker_id = $1`,
          [req.user.userId]
        ),
        db.query(
          `SELECT COUNT(*) as total
           FROM hakikisha.claims 
           WHERE status IN ('pending', 'ai_processing', 'human_review')`
        ),
        db.query(
          `SELECT 
            COUNT(*) as total_verdicts,
            COUNT(CASE WHEN verdict = 'verified' THEN 1 END) as verified_count
           FROM hakikisha.verdicts 
           WHERE fact_checker_id = $1`,
          [req.user.userId]
        ),
        db.query(
          `SELECT COALESCE(AVG(time_spent), 0) as avg_time_spent
           FROM hakikisha.verdicts 
           WHERE fact_checker_id = $1`,
          [req.user.userId]
        )
      ]);

      const totalVerified = parseInt(totalResult.rows[0]?.total) || 0;
      const pendingReview = parseInt(pendingResult.rows[0]?.total) || 0;
      const totalVerdicts = parseInt(accuracyResult.rows[0]?.total_verdicts) || 1;
      const verifiedCount = parseInt(accuracyResult.rows[0]?.verified_count) || 0;
      const avgTimeSpent = parseInt(timeResult.rows[0]?.avg_time_spent) || 0;
      
      const accuracy = totalVerdicts > 0 ? Math.round((verifiedCount / totalVerdicts) * 100) : 0;

      res.json({
        success: true,
        stats: { 
          totalVerified, 
          pendingReview, 
          timeSpent: `${Math.round(avgTimeSpent / 60)} minutes avg`, 
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

      const claims = result.rows.map(claim => {
        let aiSources = [];
        try {
          aiSources = claim.aiSources ? 
            (typeof claim.aiSources === 'string' ? 
              JSON.parse(claim.aiSources) : claim.aiSources) : [];
        } catch (e) {
          console.log('Error parsing AI sources:', e);
          aiSources = [];
        }

        return {
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
            sources: aiSources
          }
        };
      });

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
      const { claimId, approved, editedVerdict, editedExplanation, additionalSources } = req.body;
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

      const aiVerdict = aiVictResult.rows[0];
      const verdictId = uuidv4();

      // Use edited content or AI content
      const finalVerdict = approved ? aiVerdict.verdict : (editedVerdict || aiVerdict.verdict);
      const finalExplanation = editedExplanation || aiVerdict.explanation;
      
      let finalSources = [];
      try {
        finalSources = aiVerdict.evidence_sources ? 
          (typeof aiVerdict.evidence_sources === 'string' ? 
            JSON.parse(aiVerdict.evidence_sources) : aiVerdict.evidence_sources) : [];
      } catch (e) {
        console.log('Error parsing AI sources:', e);
        finalSources = [];
      }

      // Add additional sources if provided
      if (additionalSources && Array.isArray(additionalSources)) {
        finalSources = [...finalSources, ...additionalSources];
      }

      await db.query(
        `INSERT INTO hakikisha.verdicts (
          id, claim_id, fact_checker_id, verdict, explanation, 
          evidence_sources, ai_verdict_id, is_final, approval_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved', NOW())`,
        [
          verdictId,
          claimId,
          req.user.userId,
          finalVerdict,
          finalExplanation,
          JSON.stringify(finalSources),
          aiVerdict.id
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