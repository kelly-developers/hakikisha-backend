const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const { PointsService, POINTS } = require('../services/pointsService');

class ClaimController {
  async submitClaim(req, res) {
    try {
      console.log('Submit Claim Request Received');
      console.log('User making request:', req.user);
      console.log('Request body:', req.body);

      const { category, claimText, videoLink, sourceLink, imageUrl } = req.body;

      if (!category || !claimText) {
        console.log('Validation failed: Category or claim text missing');
        return res.status(400).json({
          success: false,
          error: 'Category and claim text are required',
          code: 'VALIDATION_ERROR'
        });
      }

      if (!req.user || !req.user.userId) {
        console.log('No user found in request');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_ERROR'
        });
      }

      const claimId = uuidv4();
      console.log('Generated claim ID:', claimId);

      const mediaType = imageUrl || videoLink ? 'media' : 'text';
      const mediaUrl = imageUrl || videoLink || null;

      console.log('Inserting claim into database...');
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

      console.log('Claim inserted successfully:', result.rows[0]);

      try {
        const claimCount = await db.query(
          'SELECT COUNT(*) FROM hakikisha.claims WHERE user_id = $1',
          [req.user.userId]
        );

        const isFirstClaim = parseInt(claimCount.rows[0].count) === 1;
        console.log('Is first claim:', isFirstClaim);

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
          pointsAwarded: pointsAwarded?.pointsAwarded
        });
      } catch (pointsError) {
        console.log('Points service error, continuing without points:', pointsError.message);
        res.status(201).json({
          success: true,
          message: 'Claim submitted successfully',
          claim: result.rows[0]
        });
      }

    } catch (error) {
      console.error('Submit claim error:', error);
      logger.error('Submit claim error:', error);
      
      if (error.code === '23503') {
        return res.status(400).json({
          success: false,
          error: 'Invalid user account',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (error.code === '23505') {
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
      console.log('Get My Claims - User:', req.user.userId);
      const { status } = req.query;

      let query = `
        SELECT 
          c.id, 
          c.title, 
          c.category, 
          c.status,
          c.created_at as "submittedDate",
          v.created_at as "verdictDate",
          v.verdict, 
          v.explanation as "verdictText",
          v.evidence_sources as sources,
          u.email as "factCheckerName"
        FROM hakikisha.claims c
        LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
        LEFT JOIN hakikisha.users u ON v.fact_checker_id = u.id
        WHERE c.user_id = $1
      `;

      const params = [req.user.userId];

      if (status && status !== 'all') {
        query += ` AND c.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY c.created_at DESC`;

      console.log('Executing query for user claims');
      const result = await db.query(query, params);

      console.log(`Found ${result.rows.length} claims for user`);
      
      const claims = result.rows.map(claim => ({
        id: claim.id,
        title: claim.title,
        category: claim.category,
        status: claim.status,
        submittedDate: claim.submittedDate,
        verdictDate: claim.verdictDate,
        verdict: claim.verdict,
        verdictText: claim.verdictText,
        sources: claim.sources || [],
        factCheckerName: claim.factCheckerName
      }));

      res.json({
        success: true,
        claims: claims
      });
    } catch (error) {
      console.error('Get my claims error:', error);
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
      console.log('Get Claim Details:', claimId);

      if (!claimId || !claimId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        console.log('Invalid claim ID format:', claimId);
        return res.status(400).json({
          success: false,
          error: 'Invalid claim ID format',
          code: 'VALIDATION_ERROR'
        });
      }

      const result = await db.query(
        `SELECT 
          c.*, 
          u.email as "submittedBy",
          v.verdict, 
          v.explanation as "verdictText", 
          v.evidence_sources as sources,
          v.created_at as "verdictDate",
          fc.email as "factCheckerName"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
         LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
         WHERE c.id = $1`,
        [claimId]
      );

      if (result.rows.length === 0) {
        console.log('Claim not found:', claimId);
        return res.status(404).json({
          success: false,
          error: 'Claim not found',
          code: 'NOT_FOUND'
        });
      }

      const claim = result.rows[0];
      console.log('Claim found:', claim.id);
      
      res.json({
        success: true,
        claim: {
          id: claim.id,
          title: claim.title,
          description: claim.description,
          category: claim.category,
          status: claim.status,
          submittedBy: claim.submittedBy,
          submittedDate: claim.created_at,
          verdictDate: claim.verdictDate,
          verdict: claim.verdict,
          verdictText: claim.verdictText,
          sources: claim.sources || [],
          factCheckerName: claim.factCheckerName,
          imageUrl: claim.media_url,
          videoLink: claim.media_type === 'video' ? claim.media_url : null
        }
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

      console.log('Search claims:', q);
      const result = await db.query(
        `SELECT c.id, c.title, c.description, c.category, c.status
         FROM hakikisha.claims c
         WHERE c.title ILIKE $1 OR c.description ILIKE $1
         ORDER BY c.created_at DESC
         LIMIT 50`,
        [`%${q}%`]
      );

      console.log(`Search found ${result.rows.length} results`);
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

      const query = `
        SELECT 
          c.id, 
          c.title, 
          c.description,
          c.category, 
          c.status,
          COALESCE(v.verdict, av.verdict) as verdict,
          v.explanation as "verdictText",
          c.created_at as "submittedDate",
          v.created_at as "verdictDate",
          c.submission_count,
          c.is_trending,
          c.trending_score as "trendingScore",
          v.evidence_sources as sources,
          fc.email as "factCheckerName"
        FROM hakikisha.claims c
        LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
        LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
        LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
        WHERE c.status IN ('human_approved', 'published')
        ORDER BY 
          c.is_trending DESC,
          c.submission_count DESC,
          c.created_at DESC
        LIMIT $1
      `;

      console.log('Executing query');
      const result = await db.query(query, [parseInt(limit)]);

      console.log('Found', result.rows.length, 'trending claims');

      if (result.rows.length === 0) {
        console.log('No trending claims found, fetching recent claims...');
        const fallbackResult = await db.query(`
          SELECT 
            c.id, 
            c.title, 
            c.description,
            c.category, 
            c.status,
            COALESCE(v.verdict, av.verdict) as verdict,
            v.explanation as "verdictText",
            c.created_at as "submittedDate",
            v.created_at as "verdictDate",
            c.submission_count,
            c.is_trending,
            v.evidence_sources as sources,
            fc.email as "factCheckerName"
          FROM hakikisha.claims c
          LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
          LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
          ORDER BY c.created_at DESC
          LIMIT $1
        `, [parseInt(limit)]);

        console.log('Fallback found', fallbackResult.rows.length, 'recent claims');
        
        res.json({
          success: true,
          trendingClaims: fallbackResult.rows.map(claim => ({
            ...claim,
            sources: claim.sources || []
          })),
          count: fallbackResult.rows.length
        });
      } else {
        res.json({
          success: true,
          trendingClaims: result.rows.map(claim => ({
            ...claim,
            sources: claim.sources || []
          })),
          count: result.rows.length
        });
      }

    } catch (error) {
      console.error('Get trending claims error:', error);
      logger.error('Get trending claims error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get trending claims: ' + error.message,
        code: 'SERVER_ERROR'
      });
    }
  }
}

const claimController = new ClaimController();
module.exports = claimController;
