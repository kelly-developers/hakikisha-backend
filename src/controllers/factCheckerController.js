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
          evidence_sources, time_spent, is_final, approval_status, 
          responsibility, based_on_ai_verdict, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved', 'creco', false, NOW())`,
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
          responsibility, based_on_ai_verdict, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'approved', $8, true, NOW())`,
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

      res.json({ 
        success: true, 
        message: wasEdited ? 'Verdict edited and approved. CRECO is now responsible.' : 'AI verdict approved without changes.',
        responsibility: responsibility
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
      
      const [claimsResult, blogsResult, statsResult] = await Promise.all([
        // Get recent claims assigned to this fact checker
        db.query(
          `SELECT 
            c.id, 
            c.title, 
            c.status,
            c.created_at,
            c.priority
           FROM hakikisha.claims c
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
            (SELECT COUNT(*) FROM hakikisha.claims WHERE assigned_fact_checker_id = $1 AND status IN ('pending', 'human_review')) as pending_claims,
            (SELECT COUNT(*) FROM hakikisha.blog_articles WHERE author_id = $1 AND status = 'published') as published_blogs,
            (SELECT COALESCE(AVG(time_spent), 0) FROM hakikisha.verdicts WHERE fact_checker_id = $1) as avg_review_time`,
          [req.user.userId]
        )
      ]);

      const dashboardData = {
        recentClaims: claimsResult.rows,
        recentBlogs: blogsResult.rows,
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
}

module.exports = new FactCheckerController();