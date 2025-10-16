const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { PointsService, POINTS } = require('../services/pointsService');

class ClaimController {
  async submitClaim(req, res) {
    try {
      const { category, claimText, videoLink, sourceLink, imageUrl } = req.body;

      if (!category || !claimText) {
        return res.status(400).json({
          success: false,
          error: 'Category and claim text are required',
          code: 'VALIDATION_ERROR'
        });
      }

      const claimId = uuidv4();

      const result = await db.query(
        `INSERT INTO claims (
          id, user_id, title, description, category, media_type, media_url,
          status, priority, submission_count, is_trending, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'medium', 1, false, NOW())
        RETURNING id, category, status, created_at as submittedDate`,
        [claimId, req.user.userId, claimText.substring(0, 100), claimText, category, 
         imageUrl || videoLink ? 'media' : 'text', imageUrl || videoLink || null]
      );

      // Check if this is user's first claim
      const claimCount = await db.query(
        'SELECT COUNT(*) FROM claims WHERE user_id = $1',
        [req.user.userId]
      );

      const isFirstClaim = parseInt(claimCount.rows[0].count) === 1;

      // Award points
      const pointsAwarded = await PointsService.awardPoints(
        req.user.userId,
        isFirstClaim ? POINTS.FIRST_CLAIM : POINTS.CLAIM_SUBMISSION,
        'CLAIM_SUBMISSION',
        isFirstClaim ? 'First claim submitted' : 'Claim submitted'
      );

      res.status(201).json({
        success: true,
        message: 'Claim submitted successfully',
        claim: result.rows[0],
        pointsAwarded: pointsAwarded.pointsAwarded
      });
    } catch (error) {
      logger.error('Submit claim error:', error);
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
      const { status } = req.query;

      let query = `
        SELECT c.id, c.title, c.category, c.status,
               c.created_at as submittedDate,
               v.created_at as verdictDate,
               v.verdict, v.evidence_sources as sources
        FROM claims c
        LEFT JOIN verdicts v ON c.human_verdict_id = v.id
        WHERE c.user_id = $1
      `;

      const params = [req.user.userId];

      if (status && status !== 'all') {
        query += ` AND c.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY c.created_at DESC`;

      const result = await db.query(query, params);

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

      const result = await db.query(
        `SELECT c.*, 
                u.email as submittedBy,
                v.verdict, v.explanation as verdictExplanation, v.evidence_sources as sources,
                v.created_at as verdictDate
         FROM claims c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN verdicts v ON c.human_verdict_id = v.id
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

      const result = await db.query(
        `SELECT c.id, c.title, c.description, c.category, c.status
         FROM claims c
         WHERE c.title ILIKE $1 OR c.description ILIKE $1
         ORDER BY c.created_at DESC
         LIMIT 50`,
        [`%${q}%`]
      );

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
      
      console.log('Getting trending claims with limit:', limit);

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
          FROM claims c
          LEFT JOIN verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
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
          FROM claims c
          LEFT JOIN verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
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
          FROM claims c
          LEFT JOIN verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
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
      
      // Try a simple fallback query
      try {
        console.log('Trying simple fallback query...');
        const fallbackResult = await db.query(`
          SELECT id, title, category, status, created_at as submittedDate
          FROM claims 
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
        res.status(500).json({
          success: false,
          error: 'Failed to get trending claims: ' + error.message,
          code: 'SERVER_ERROR'
        });
      }
    }
  }
}

const claimController = new ClaimController();
module.exports = claimController;