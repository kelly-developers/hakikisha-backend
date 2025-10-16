const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class ClaimController {
  async submitClaim(req, res) {
    try {
      console.log('📝 Submit Claim Request Received');
      console.log('👤 User making request:', req.user);
      console.log('📦 Request body:', req.body);

      const { category, claimText, videoLink, sourceLink, imageUrl } = req.body;

      // Validate input
      if (!category || !claimText) {
        console.log('❌ Validation failed: Category or claim text missing');
        return res.status(400).json({
          success: false,
          error: 'Category and claim text are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate user exists in request
      if (!req.user || !req.user.userId) {
        console.log('❌ No user found in request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_ERROR'
        });
      }

      const claimId = uuidv4();
      console.log('🆔 Generated claim ID:', claimId);

      // Prepare media data
      const mediaType = imageUrl || videoLink ? 'media' : 'text';
      const mediaUrl = imageUrl || videoLink || null;

      console.log('💾 Inserting claim into database...');
      const result = await db.query(
        `INSERT INTO hakikisha.claims (
          id, user_id, title, description, category, media_type, media_url,
          status, priority, submission_count, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'medium', 1, NOW())
        RETURNING id, category, status, created_at as submittedDate`,
        [
          claimId, 
          req.user.userId, 
          claimText.substring(0, 100), 
          claimText, 
          category, 
          mediaType, 
          mediaUrl
        ]
      );

      console.log('✅ Claim inserted successfully:', result.rows[0]);

      // Check if this is user's first claim (optional - for points system)
      try {
        const claimCount = await db.query(
          'SELECT COUNT(*) FROM hakikisha.claims WHERE user_id = $1',
          [req.user.userId]
        );

        const isFirstClaim = parseInt(claimCount.rows[0].count) === 1;
        console.log('🎯 Is first claim:', isFirstClaim);

        // If you have PointsService, uncomment this section
        /*
        const pointsAwarded = await PointsService.awardPoints(
          req.user.userId,
          isFirstClaim ? POINTS.FIRST_CLAIM : POINTS.CLAIM_SUBMISSION,
          'CLAIM_SUBMISSION',
          isFirstClaim ? 'First claim submitted' : 'Claim submitted'
        );
        */

      } catch (pointsError) {
        console.log('⚠️ Points service not available, continuing without points');
      }

      res.status(201).json({
        success: true,
        message: 'Claim submitted successfully',
        claim: result.rows[0]
        // pointsAwarded: pointsAwarded?.pointsAwarded // Uncomment if using points
      });

    } catch (error) {
      console.error('❌ Submit claim error:', error);
      logger.error('Submit claim error:', error);
      
      // Handle specific database errors
      if (error.code === '23503') { // Foreign key violation
        return res.status(400).json({
          success: false,
          error: 'Invalid user account',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({
          success: false,
          error: 'Claim already exists',
          code: 'DUPLICATE_CLAIM'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Claim submission failed',
        code: 'SERVER_ERROR'
      });
    }
  }

  async uploadEvidence(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
          code: 'VALIDATION_ERROR'
        });
      }

      // TODO: Upload to S3 or cloud storage
      const fileUrl = `/uploads/evidence/${uuidv4()}-${req.file.originalname}`;

      res.json({
        success: true,
        fileUrl
      });
    } catch (error) {
      logger.error('Upload evidence error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload evidence',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getMyClaims(req, res) {
    try {
      console.log('📋 Get My Claims - User:', req.user.userId);
      const { status } = req.query;

      let query = `
        SELECT c.id, c.title, c.category, c.status,
               c.created_at as submittedDate,
               v.created_at as verdictDate,
               v.verdict, v.evidence_sources as sources
        FROM hakikisha.claims c
        LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
        WHERE c.user_id = $1
      `;

      const params = [req.user.userId];

      if (status && status !== 'all') {
        query += ` AND c.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY c.created_at DESC`;

      console.log('🔍 Executing query for user claims');
      const result = await db.query(query, params);

      console.log(`✅ Found ${result.rows.length} claims for user`);
      res.json({
        success: true,
        claims: result.rows
      });
    } catch (error) {
      logger.error('Get my claims error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get claims',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getClaimDetails(req, res) {
    try {
      const { claimId } = req.params;
      console.log('🔍 Get Claim Details:', claimId);

      const result = await db.query(
        `SELECT c.*, 
                u.email as submittedBy,
                v.verdict, v.explanation as verdictExplanation, v.evidence_sources as sources,
                v.created_at as verdictDate
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
         WHERE c.id = $1`,
        [claimId]
      );

      if (result.rows.length === 0) {
        console.log('❌ Claim not found:', claimId);
        return res.status(404).json({
          success: false,
          error: 'Claim not found',
          code: 'NOT_FOUND'
        });
      }

      const claim = result.rows[0];
      console.log('✅ Claim found:', claim.id);
      
      res.json({
        success: true,
        claim: {
          id: claim.id,
          title: claim.title,
          description: claim.description,
          category: claim.category,
          status: claim.status,
          submittedBy: claim.submittedby,
          submittedDate: claim.created_at,
          verdictDate: claim.verdictdate,
          verdict: claim.verdict,
          sources: claim.sources,
          imageUrl: claim.media_url,
          videoLink: claim.media_type === 'video' ? claim.media_url : null
        }
      });
    } catch (error) {
      logger.error('Get claim details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get claim details',
        code: 'SERVER_ERROR'
      });
    }
  }

  async searchClaims(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
          code: 'VALIDATION_ERROR'
        });
      }

      console.log('🔍 Search claims:', q);
      const result = await db.query(
        `SELECT c.id, c.title, c.description, c.category, c.status
         FROM hakikisha.claims c
         WHERE c.title ILIKE $1 OR c.description ILIKE $1
         ORDER BY c.created_at DESC
         LIMIT 50`,
        [`%${q}%`]
      );

      console.log(`✅ Search found ${result.rows.length} results`);
      res.json({
        success: true,
        results: result.rows
      });
    } catch (error) {
      logger.error('Search claims error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getTrendingClaims(req, res) {
    try {
      const { limit = 10 } = req.query;
      
      console.log('🔥 Getting trending claims with limit:', limit);

      // First, let's check if the trending_score column exists
      let columnCheck;
      try {
        columnCheck = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'hakikisha' 
          AND table_name = 'claims' 
          AND column_name = 'trending_score'
        `);
      } catch (columnError) {
        console.log('Column check failed, assuming no trending_score column');
      }

      const hasTrendingScore = columnCheck && columnCheck.rows.length > 0;

      // Build query based on available columns
      let query;
      let params = [parseInt(limit)];

      if (hasTrendingScore) {
        // Use trending_score if available
        query = `
          SELECT 
            c.id, 
            c.title, 
            c.description,
            c.category, 
            c.status,
            COALESCE(v.verdict, av.verdict) as verdict,
            c.trending_score as trendingScore,
            c.created_at as submittedDate,
            v.created_at as verdictDate,
            c.submission_count,
            c.is_trending
          FROM hakikisha.claims c
          LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
          WHERE c.is_trending = true OR c.submission_count > 1
          ORDER BY 
            c.is_trending DESC,
            c.trending_score DESC NULLS LAST, 
            c.submission_count DESC,
            c.created_at DESC
          LIMIT $1
        `;
      } else {
        // Fallback query without trending_score
        query = `
          SELECT 
            c.id, 
            c.title, 
            c.description,
            c.category, 
            c.status,
            COALESCE(v.verdict, av.verdict) as verdict,
            c.created_at as submittedDate,
            v.created_at as verdictDate,
            c.submission_count,
            c.is_trending
          FROM hakikisha.claims c
          LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
          WHERE c.is_trending = true OR c.submission_count > 1
          ORDER BY 
            c.is_trending DESC,
            c.submission_count DESC,
            c.created_at DESC
          LIMIT $1
        `;
      }

      console.log('Executing query:', query.substring(0, 100) + '...');
      const result = await db.query(query, params);

      console.log('Found', result.rows.length, 'trending/popular claims');

      // If no trending claims found, get recent popular claims as fallback
      if (result.rows.length === 0) {
        console.log('No trending claims found, fetching recent popular claims...');
        const fallbackResult = await db.query(`
          SELECT 
            c.id, 
            c.title, 
            c.description,
            c.category, 
            c.status,
            COALESCE(v.verdict, av.verdict) as verdict,
            c.created_at as submittedDate,
            v.created_at as verdictDate,
            c.submission_count,
            c.is_trending
          FROM hakikisha.claims c
          LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
          ORDER BY c.created_at DESC
          LIMIT $1
        `, [parseInt(limit)]);

        console.log('Fallback found', fallbackResult.rows.length, 'recent claims');
        
        res.json({
          success: true,
          trendingClaims: fallbackResult.rows,
          count: fallbackResult.rows.length,
          message: 'Recent claims (no trending claims available)'
        });
      } else {
        res.json({
          success: true,
          trendingClaims: result.rows,
          count: result.rows.length,
          message: 'Trending claims fetched successfully'
        });
      }

    } catch (error) {
      console.error('Get trending claims error details:', error);
      logger.error('Get trending claims error:', error);
      
      // Try a simple fallback query with public schema
      try {
        console.log('Trying simple fallback query with public schema...');
        const fallbackResult = await db.query(`
          SELECT id, title, category, status, created_at as submittedDate
          FROM public.claims 
          ORDER BY created_at DESC 
          LIMIT $1
        `, [parseInt(req.query.limit) || 10]);

        res.json({
          success: true,
          trendingClaims: fallbackResult.rows,
          count: fallbackResult.rows.length,
          message: 'Recent claims (fallback due to error)'
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        
        // Final fallback - try hakikisha schema directly
        try {
          console.log('Trying final fallback with hakikisha schema...');
          const finalFallback = await db.query(`
            SELECT id, title, category, status, created_at as submittedDate
            FROM hakikisha.claims 
            ORDER BY created_at DESC 
            LIMIT $1
          `, [parseInt(req.query.limit) || 10]);

          res.json({
            success: true,
            trendingClaims: finalFallback.rows,
            count: finalFallback.rows.length,
            message: 'Recent claims (final fallback)'
          });
        } catch (finalError) {
          console.error('All fallbacks failed:', finalError);
          res.status(500).json({
            success: false,
            error: 'Failed to get trending claims: ' + error.message,
            code: 'SERVER_ERROR'
          });
        }
      }
    }
  }
}

const claimController = new ClaimController();
module.exports = claimController;