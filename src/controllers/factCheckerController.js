const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const Constants = require('./constants');

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
          c.status,
          c.priority,
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
         WHERE c.status IN ('pending', 'ai_processing', 'human_review', 'ai_approved')
         ORDER BY 
           CASE c.priority 
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
             ELSE 5
           END,
           c.created_at ASC
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

        // Get AI verdict display info
        const aiVerdictDisplay = claim.ai_verdict ? 
          Constants.VERDICT_DISPLAY[claim.ai_verdict] || null : null;

        return {
          id: claim.id,
          title: claim.title,
          description: claim.description,
          category: claim.category,
          status: claim.status,
          priority: claim.priority,
          submittedBy: claim.submitterEmail || claim.submittedBy,
          submittedDate: new Date(claim.submittedDate).toISOString().split('T')[0],
          imageUrl: claim.imageUrl,
          videoLink: claim.media_type === 'video' ? claim.imageUrl : null,
          sourceLink: null,
          ai_suggestion: {
            verdict: claim.ai_verdict,
            verdict_display: aiVerdictDisplay,
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

      // Validate verdict value - UPDATED
      const validVerdicts = ['true', 'false', 'misleading', 'needs_context', 'unverifiable'];
      if (!validVerdicts.includes(verdict)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verdict value. Must be one of: true, false, misleading, needs_context, unverifiable',
          code: 'VALIDATION_ERROR'
        });
      }

      const verdictId = uuidv4();

      await db.query('BEGIN');

      // Check if AI verdict exists for this claim
      const aiVerdictResult = await db.query(
        `SELECT id FROM hakikisha.ai_verdicts WHERE claim_id = $1`,
        [claimId]
      );

      const aiVerdictId = aiVerdictResult.rows[0]?.id || null;
      const basedOnAIVerdict = !!aiVerdictId;

      // Insert verdict - UPDATED with new fields
      await db.query(
        `INSERT INTO hakikisha.verdicts (
          id, claim_id, fact_checker_id, verdict, explanation, 
          evidence_sources, time_spent, is_final, approval_status, 
          responsibility, ai_verdict_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved', 'creco', $8, NOW())`,
        [
          verdictId, 
          claimId, 
          req.user.userId, 
          verdict, 
          explanation, 
          JSON.stringify(sources || []),
          time_spent,
          aiVerdictId
        ]
      );

      // Update claim status and link verdict - UPDATED status
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
          `INSERT INTO hakikisha.admin_activities (
            id, admin_id, activity_type, description, target_user_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            uuidv4(), 
            req.user.userId, 
            'verdict_submitted', 
            `Submitted ${verdict} verdict for claim: ${claimId}`,
            req.user.userId
          ]
        );
      } catch (activityError) {
        console.log('Failed to log activity:', activityError.message);
      }

      // Get verdict display info for response
      const verdictDisplay = Constants.VERDICT_DISPLAY[verdict];

      res.json({
        success: true,
        message: 'Verdict submitted successfully',
        verdictId: verdictId,
        verdict: verdict,
        verdict_display: verdictDisplay,
        based_on_ai: basedOnAIVerdict
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
      
      const [totalResult, pendingResult, verdictStatsResult, timeResult] = await Promise.all([
        // Total verdicts submitted
        db.query(
          `SELECT COUNT(*) as total
           FROM hakikisha.verdicts 
           WHERE fact_checker_id = $1`,
          [req.user.userId]
        ),
        // Pending claims count
        db.query(
          `SELECT COUNT(*) as total
           FROM hakikisha.claims 
           WHERE status IN ('pending', 'ai_processing', 'human_review', 'ai_approved')`,
        ),
        // Verdict breakdown
        db.query(
          `SELECT 
            verdict,
            COUNT(*) as count
           FROM hakikisha.verdicts 
           WHERE fact_checker_id = $1
           GROUP BY verdict`,
          [req.user.userId]
        ),
        // Average time spent
        db.query(
          `SELECT COALESCE(AVG(time_spent), 0) as avg_time_spent
           FROM hakikisha.verdicts 
           WHERE fact_checker_id = $1`,
          [req.user.userId]
        )
      ]);

      const totalVerdicts = parseInt(totalResult.rows[0]?.total) || 0;
      const pendingReview = parseInt(pendingResult.rows[0]?.total) || 0;
      const avgTimeSpent = parseInt(timeResult.rows[0]?.avg_time_spent) || 0;
      
      // Calculate verdict distribution
      const verdictStats = {};
      let totalVerdictsForAccuracy = 0;
      
      verdictStatsResult.rows.forEach(row => {
        verdictStats[row.verdict] = parseInt(row.count);
        totalVerdictsForAccuracy += parseInt(row.count);
      });

      // Calculate accuracy (percentage of definitive verdicts)
      const definitiveVerdicts = (verdictStats['true'] || 0) + (verdictStats['false'] || 0);
      const accuracy = totalVerdictsForAccuracy > 0 ? 
        Math.round((definitiveVerdicts / totalVerdictsForAccuracy) * 100) : 0;

      // Format verdict stats with display info
      const formattedVerdictStats = {};
      Object.keys(verdictStats).forEach(verdict => {
        formattedVerdictStats[verdict] = {
          count: verdictStats[verdict],
          display: Constants.VERDICT_DISPLAY[verdict] || {
            label: verdict,
            color: 'gray',
            icon: '?'
          }
        };
      });

      res.json({
        success: true,
        stats: { 
          totalVerdicts, 
          pendingReview, 
          avgTimeSpent: `${Math.round(avgTimeSpent / 60)} minutes`, 
          accuracy: `${accuracy}%`,
          verdictDistribution: formattedVerdictStats
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
          c.status,
          c.user_id as "submittedBy",
          c.created_at as "submittedDate",
          c.priority,
          av.verdict as "aiVerdict",
          av.confidence_score as "confidence",
          av.explanation as "aiExplanation",
          av.evidence_sources as "aiSources",
          av.disclaimer as "aiDisclaimer"
         FROM hakikisha.claims c
         JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
         WHERE c.status IN ('ai_approved', 'completed')
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

        // Get verdict display info
        const verdictDisplay = Constants.VERDICT_DISPLAY[claim.aiVerdict] || null;

        return {
          id: claim.id,
          title: claim.title,
          description: claim.description,
          category: claim.category,
          status: claim.status,
          priority: claim.priority,
          submittedBy: claim.submittedBy,
          submittedDate: new Date(claim.submittedDate).toISOString().split('T')[0],
          aiSuggestion: {
            verdict: claim.aiVerdict,
            verdict_display: verdictDisplay,
            explanation: claim.aiExplanation,
            confidence: claim.confidence,
            sources: aiSources,
            disclaimer: claim.aiDisclaimer
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
      console.log('Approving AI verdict for claim:', claimId, 'Edited:', !approved);

      if (!claimId) {
        return res.status(400).json({
          success: false,
          error: 'Claim ID is required',
          code: 'VALIDATION_ERROR'
        });
      }

      await db.query('BEGIN');

      const aiVerdictResult = await db.query(
        `SELECT av.id, av.verdict, av.explanation, av.evidence_sources
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
      const wasEdited = !approved || editedVerdict || editedExplanation || additionalSources;

      // Use edited content or AI content
      const finalVerdict = editedVerdict || aiVerdict.verdict;
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

      // If edited, update the AI verdict to mark it as edited
      if (wasEdited) {
        await db.query(
          `UPDATE hakikisha.ai_verdicts 
           SET is_edited_by_human = true, 
               edited_by_fact_checker_id = $1, 
               edited_at = NOW(),
               verdict = $2,
               explanation = $3,
               evidence_sources = $4
           WHERE id = $5`,
          [req.user.userId, finalVerdict, finalExplanation, JSON.stringify(finalSources), aiVerdict.id]
        );
      }

      // Determine responsibility based on whether it was edited
      const responsibility = wasEdited ? 'creco' : 'ai';

      await db.query(
        `INSERT INTO hakikisha.verdicts (
          id, claim_id, fact_checker_id, verdict, explanation, 
          evidence_sources, ai_verdict_id, is_final, approval_status, 
          responsibility, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved', $8, NOW())`,
        [
          verdictId,
          claimId,
          req.user.userId,
          finalVerdict,
          finalExplanation,
          JSON.stringify(finalSources),
          aiVerdict.id,
          responsibility
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

      console.log(`AI verdict ${wasEdited ? 'edited and' : ''} approved for claim:`, claimId, 'Responsibility:', responsibility);

      // Get verdict display info for response
      const verdictDisplay = Constants.VERDICT_DISPLAY[finalVerdict];

      res.json({ 
        success: true, 
        message: wasEdited ? 'Verdict edited and approved. CRECO is now responsible.' : 'AI verdict approved without changes.',
        responsibility: responsibility,
        verdict: finalVerdict,
        verdict_display: verdictDisplay
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

  async getMyBlogs(req, res) {
    try {
      console.log('Fetching blogs for fact checker:', req.user.userId);
      
      const result = await db.query(
        `SELECT 
          ba.*, 
          u.email as author_email,
          u.username as author_name,
          u.profile_picture as author_avatar
         FROM hakikisha.blog_articles ba
         LEFT JOIN hakikisha.users u ON ba.author_id = u.id
         WHERE ba.author_id = $1
         ORDER BY ba.created_at DESC`,
        [req.user.userId]
      );

      console.log(`Found ${result.rows.length} blogs for fact checker: ${req.user.userId}`);

      // Format the blogs for response
      const blogs = result.rows.map(blog => ({
        id: blog.id,
        title: blog.title,
        content: blog.content,
        excerpt: blog.excerpt,
        author: {
          id: blog.author_id,
          email: blog.author_email,
          name: blog.author_name,
          avatar: blog.author_avatar
        },
        category: blog.category,
        featured_image: blog.featured_image,
        read_time: blog.read_time,
        view_count: blog.view_count,
        like_count: blog.like_count,
        share_count: blog.share_count,
        status: blog.status,
        slug: blog.slug,
        published_at: blog.published_at,
        created_at: blog.created_at,
        updated_at: blog.updated_at
      }));

      res.json({
        success: true,
        blogs: blogs
      });
    } catch (error) {
      console.error('Get my blogs error:', error);
      logger.error('Get my blogs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get blogs',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getFactCheckerDashboard(req, res) {
    try {
      console.log('Fetching dashboard data for fact checker:', req.user.userId);
      
      const [claimsResult, blogsResult, statsResult, recentVerdictsResult] = await Promise.all([
        // Get recent claims assigned to this fact checker
        db.query(
          `SELECT 
            c.id, 
            c.title, 
            c.status,
            c.created_at,
            c.priority,
            v.verdict
           FROM hakikisha.claims c
           LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
           WHERE c.assigned_fact_checker_id = $1
           ORDER BY c.created_at DESC
           LIMIT 10`,
          [req.user.userId]
        ),
        
        // Get recent blogs by this fact checker
        db.query(
          `SELECT 
            id, 
            title, 
            status,
            view_count,
            created_at
           FROM hakikisha.blog_articles 
           WHERE author_id = $1
           ORDER BY created_at DESC
           LIMIT 5`,
          [req.user.userId]
        ),
        
        // Get comprehensive stats
        db.query(
          `SELECT 
            (SELECT COUNT(*) FROM hakikisha.verdicts WHERE fact_checker_id = $1) as total_verdicts,
            (SELECT COUNT(*) FROM hakikisha.claims WHERE assigned_fact_checker_id = $1 AND status IN ('pending', 'human_review', 'ai_approved')) as pending_claims,
            (SELECT COUNT(*) FROM hakikisha.blog_articles WHERE author_id = $1 AND status = 'published') as published_blogs,
            (SELECT COALESCE(AVG(time_spent), 0) FROM hakikisha.verdicts WHERE fact_checker_id = $1) as avg_review_time`,
          [req.user.userId]
        ),

        // Get recent verdicts with display info
        db.query(
          `SELECT 
            v.verdict,
            v.explanation,
            v.created_at,
            c.title as claim_title
           FROM hakikisha.verdicts v
           JOIN hakikisha.claims c ON v.claim_id = c.id
           WHERE v.fact_checker_id = $1
           ORDER BY v.created_at DESC
           LIMIT 5`,
          [req.user.userId]
        )
      ]);

      // Format recent claims with verdict display info
      const recentClaims = claimsResult.rows.map(claim => ({
        ...claim,
        verdict_display: claim.verdict ? Constants.VERDICT_DISPLAY[claim.verdict] : null
      }));

      // Format recent verdicts with display info
      const recentVerdicts = recentVerdictsResult.rows.map(verdict => ({
        ...verdict,
        verdict_display: Constants.VERDICT_DISPLAY[verdict.verdict]
      }));

      const dashboardData = {
        recentClaims: recentClaims,
        recentBlogs: blogsResult.rows,
        recentVerdicts: recentVerdicts,
        stats: {
          totalVerdicts: parseInt(statsResult.rows[0]?.total_verdicts) || 0,
          pendingClaims: parseInt(statsResult.rows[0]?.pending_claims) || 0,
          publishedBlogs: parseInt(statsResult.rows[0]?.published_blogs) || 0,
          avgReviewTime: parseInt(statsResult.rows[0]?.avg_review_time) || 0
        }
      };

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Get fact checker dashboard error:', error);
      logger.error('Get fact checker dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getClaimDetails(req, res) {
    try {
      const { claimId } = req.params;
      console.log('Fetching claim details for fact checker:', claimId);

      const result = await db.query(
        `SELECT 
          c.*, 
          u.email as "submittedBy",
          u.username as "submitterName",
          av.verdict as "ai_verdict",
          av.explanation as "ai_explanation",
          av.confidence_score as "ai_confidence",
          av.evidence_sources as "ai_sources",
          av.disclaimer as "ai_disclaimer",
          av.is_edited_by_human as "ai_edited",
          v.verdict as "human_verdict",
          v.explanation as "human_explanation",
          v.evidence_sources as "human_sources",
          v.created_at as "verdict_date"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
         LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
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

      // Parse sources
      let aiSources = [];
      let humanSources = [];
      
      try {
        aiSources = claim.ai_sources ? 
          (typeof claim.ai_sources === 'string' ? JSON.parse(claim.ai_sources) : claim.ai_sources) : [];
      } catch (e) {
        console.log('Error parsing AI sources:', e);
      }
      
      try {
        humanSources = claim.human_sources ? 
          (typeof claim.human_sources === 'string' ? JSON.parse(claim.human_sources) : claim.human_sources) : [];
      } catch (e) {
        console.log('Error parsing human sources:', e);
      }

      // Get verdict display info
      const aiVerdictDisplay = claim.ai_verdict ? Constants.VERDICT_DISPLAY[claim.ai_verdict] : null;
      const humanVerdictDisplay = claim.human_verdict ? Constants.VERDICT_DISPLAY[claim.human_verdict] : null;

      const claimDetails = {
        id: claim.id,
        title: claim.title,
        description: claim.description,
        category: claim.category,
        status: claim.status,
        priority: claim.priority,
        submittedBy: claim.submittedBy,
        submitterName: claim.submitterName,
        submittedDate: claim.created_at,
        media_type: claim.media_type,
        media_url: claim.media_url,
        ai_verdict: {
          verdict: claim.ai_verdict,
          verdict_display: aiVerdictDisplay,
          explanation: claim.ai_explanation,
          confidence: claim.ai_confidence,
          sources: aiSources,
          disclaimer: claim.ai_disclaimer,
          is_edited: claim.ai_edited
        },
        human_verdict: claim.human_verdict ? {
          verdict: claim.human_verdict,
          verdict_display: humanVerdictDisplay,
          explanation: claim.human_explanation,
          sources: humanSources,
          verdict_date: claim.verdict_date
        } : null
      };

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
}

module.exports = new FactCheckerController();