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
          av.evidence_sources as "ai_sources",
          av.disclaimer as "ai_disclaimer",
          av.is_edited_by_human as "ai_edited"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
         WHERE c.status IN ('pending', 'ai_processing', 'human_review', 'completed')
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
            sources: aiSources,
            disclaimer: claim.ai_disclaimer,
            isEdited: claim.ai_edited
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

  // NEW: Get claim details with AI verdict for fact checkers
  async getClaimDetails(req, res) {
    try {
      const { claimId } = req.params;
      console.log('Fetching claim details for fact checker:', req.user.userId, 'Claim ID:', claimId);

      const result = await db.query(
        `SELECT 
          c.id, 
          c.title, 
          c.description, 
          c.category,
          c.status,
          c.media_url as "imageUrl",
          c.media_type,
          c.created_at as "submittedDate",
          u.email as "submitterEmail",
          av.id as "ai_verdict_id",
          av.verdict as "ai_verdict",
          av.explanation as "ai_explanation",
          av.confidence_score as "ai_confidence",
          av.evidence_sources as "ai_sources",
          av.disclaimer as "ai_disclaimer",
          av.is_edited_by_human as "ai_edited",
          av.edited_by_fact_checker_id as "ai_edited_by",
          av.edited_at as "ai_edited_at",
          fc.username as "ai_editor_name",
          v.verdict as "human_verdict",
          v.explanation as "human_explanation",
          v.evidence_sources as "human_sources",
          v.created_at as "human_verdict_date"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
         LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
         LEFT JOIN hakikisha.users fc ON av.edited_by_fact_checker_id = fc.id
         WHERE c.id = $1`,
        [claimId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Claim not found',
          code: 'NOT_FOUND'
        });
      }

      const claim = result.rows[0];
      
      // Process AI sources
      let aiSources = [];
      try {
        aiSources = claim.ai_sources ? 
          (typeof claim.ai_sources === 'string' ? 
            JSON.parse(claim.ai_sources) : claim.ai_sources) : [];
      } catch (e) {
        console.log('Error parsing AI sources:', e);
        aiSources = [];
      }

      // Process human sources
      let humanSources = [];
      try {
        humanSources = claim.human_sources ? 
          (typeof claim.human_sources === 'string' ? 
            JSON.parse(claim.human_sources) : claim.human_sources) : [];
      } catch (e) {
        console.log('Error parsing human sources:', e);
        humanSources = [];
      }

      const claimDetails = {
        id: claim.id,
        title: claim.title,
        description: claim.description,
        category: claim.category,
        status: claim.status,
        submittedBy: claim.submitterEmail,
        submittedDate: claim.submittedDate,
        imageUrl: claim.imageUrl,
        videoLink: claim.media_type === 'video' ? claim.imageUrl : null,
        
        // AI Verdict information
        ai_verdict: {
          id: claim.ai_verdict_id,
          verdict: claim.ai_verdict,
          explanation: claim.ai_explanation,
          confidence: claim.ai_confidence,
          sources: aiSources,
          disclaimer: claim.ai_disclaimer,
          is_edited: claim.ai_edited,
          edited_by: claim.ai_edited_by,
          edited_by_name: claim.ai_editor_name,
          edited_at: claim.ai_edited_at
        },
        
        // Human Verdict information (if exists)
        human_verdict: claim.human_verdict ? {
          verdict: claim.human_verdict,
          explanation: claim.human_explanation,
          sources: humanSources,
          verdict_date: claim.human_verdict_date
        } : null
      };

      console.log('Claim details fetched successfully for fact checker');

      res.json({
        success: true,
        claim: claimDetails
      });
    } catch (error) {
      console.error('Get claim details error:', error);
      logger.error('Get claim details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get claim details',
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

      // Validate verdict value - support both 'true' and 'verified'
      const validVerdicts = ['true', 'verified', 'false', 'misleading', 'needs_context', 'unverifiable'];
      if (!validVerdicts.includes(verdict)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verdict value. Must be one of: true, false, misleading, needs_context, unverifiable',
          code: 'VALIDATION_ERROR'
        });
      }

      // Normalize 'verified' to 'true' for consistency
      const normalizedVerdict = verdict === 'verified' ? 'true' : verdict;

      const verdictId = uuidv4();

      await db.query('BEGIN');

      // FIXED: Remove the based_on_ai_verdict column from the insert
      await db.query(
        `INSERT INTO hakikisha.verdicts (
          id, claim_id, fact_checker_id, verdict, explanation, 
          evidence_sources, time_spent, is_final, approval_status, 
          responsibility, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved', 'creco', NOW())`,
        [
          verdictId, 
          claimId, 
          req.user.userId, 
          normalizedVerdict, 
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

  // NEW: Edit AI verdict directly
  async editAIVerdict(req, res) {
    try {
      const { claimId } = req.params;
      const { verdict, explanation, confidence_score, evidence_sources } = req.body;
      
      console.log('Editing AI verdict for claim:', claimId, 'by fact checker:', req.user.userId);

      if (!claimId || !verdict || !explanation) {
        return res.status(400).json({
          success: false,
          error: 'Claim ID, verdict, and explanation are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate verdict value
      const validVerdicts = ['true', 'false', 'misleading', 'needs_context', 'unverifiable'];
      if (!validVerdicts.includes(verdict)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verdict value. Must be one of: true, false, misleading, needs_context, unverifiable',
          code: 'VALIDATION_ERROR'
        });
      }

      await db.query('BEGIN');

      // Update AI verdict with edited information
      const updateResult = await db.query(
        `UPDATE hakikisha.ai_verdicts 
         SET verdict = $1,
             explanation = $2,
             confidence_score = $3,
             evidence_sources = $4,
             is_edited_by_human = true,
             edited_by_fact_checker_id = $5,
             edited_at = NOW(),
             updated_at = NOW()
         WHERE claim_id = $6
         RETURNING *`,
        [
          verdict,
          explanation,
          confidence_score || 0.8, // Default confidence if not provided
          JSON.stringify(evidence_sources || []),
          req.user.userId,
          claimId
        ]
      );

      if (updateResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'AI verdict not found for this claim',
          code: 'NOT_FOUND'
        });
      }

      // Update claim status to indicate human review
      await db.query(
        `UPDATE hakikisha.claims 
         SET status = 'human_approved',
             updated_at = NOW()
         WHERE id = $1`,
        [claimId]
      );

      await db.query('COMMIT');

      console.log('AI verdict edited successfully for claim:', claimId);

      // Log editing activity
      try {
        await db.query(
          `INSERT INTO hakikisha.fact_checker_activities (
            id, fact_checker_id, activity_type, claim_id, 
            start_time, end_time, duration, created_at
          ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '5 minutes', NOW(), 300, NOW())`,
          [uuidv4(), req.user.userId, 'ai_verdict_edit', claimId]
        );
      } catch (activityError) {
        console.log('Failed to log activity:', activityError.message);
      }

      res.json({
        success: true,
        message: 'AI verdict edited successfully',
        ai_verdict: updateResult.rows[0]
      });
    } catch (error) {
      await db.query('ROLLBACK');
      console.error('Edit AI verdict error:', error);
      logger.error('Edit AI verdict error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to edit AI verdict', 
        code: 'SERVER_ERROR' 
      });
    }
  }

  // ... rest of your existing methods (getStats, getAIVerdicts, getAIVerdictDetails, etc.)
}

module.exports = new FactCheckerController();