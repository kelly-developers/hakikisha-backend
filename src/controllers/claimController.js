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

      // Automatically process claim with AI - FIXED VERSION
      const poeAIService = require('../services/poeAIService');
      
      try {
        console.log('Starting automatic AI processing for claim:', claimId);
        const aiFactCheckResult = await poeAIService.factCheck(claimText, category, sourceLink);
        
        console.log('AI Fact Check Result:', JSON.stringify(aiFactCheckResult, null, 2));
        
        if (aiFactCheckResult.success && aiFactCheckResult.aiVerdict) {
          const aiVerdictId = uuidv4();
          
          // ✅ FIXED: Use structured verdict detection instead of unreliable confidence mapping
          const { finalVerdict, confidenceScore } = this.determineAIVerdict(aiFactCheckResult.aiVerdict);
          
          await db.query(
            `INSERT INTO hakikisha.ai_verdicts (
              id, claim_id, verdict, confidence_score, explanation, 
              evidence_sources, ai_model_version, disclaimer, is_edited_by_human, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW())`,
            [
              aiVerdictId,
              claimId,
              finalVerdict, // Use the properly determined verdict
              confidenceScore,
              aiFactCheckResult.aiVerdict.explanation,
              JSON.stringify(aiFactCheckResult.aiVerdict.sources || []),
              'Web-Search-POE',
              'This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers.'
            ]
          );
          
          // ✅ FIXED: Update claim with AI verdict AND proper status
          const claimStatus = this.getClaimStatusFromAIVerdict(finalVerdict, confidenceScore);
          
          await db.query(
            `UPDATE hakikisha.claims 
             SET ai_verdict_id = $1, 
                 status = $2, 
                 updated_at = NOW()
             WHERE id = $3`,
            [aiVerdictId, claimStatus, claimId]
          );
          
          console.log('✅ AI verdict created and claim status updated:', {
            claimId,
            verdict: finalVerdict,
            confidence: confidenceScore,
            status: claimStatus
          });
        } else {
          // ✅ FIXED: If AI processing fails, still update status to indicate processing is done
          await db.query(
            `UPDATE hakikisha.claims 
             SET status = 'ai_processing_failed', 
                 updated_at = NOW()
             WHERE id = $1`,
            [claimId]
          );
          console.log('⚠️ AI processing failed, claim status updated:', claimId);
        }
      } catch (aiError) {
        console.log('AI processing failed, updating claim status:', aiError.message);
        // ✅ FIXED: Update status even if AI fails
        await db.query(
          `UPDATE hakikisha.claims 
           SET status = 'ai_processing_failed', 
               updated_at = NOW()
           WHERE id = $1`,
          [claimId]
        );
      }

      // Check if this is user's first claim
      const claimCountResult = await db.query(
        'SELECT COUNT(*) FROM hakikisha.claims WHERE user_id = $1',
        [req.user.userId]
      );
      
      const isFirstClaim = parseInt(claimCountResult.rows[0].count) === 1;
      console.log('Is first claim:', isFirstClaim);

      // Award points for claim submission
      try {
        let pointsResult;
        
        if (isFirstClaim) {
          // Award bonus points for first claim
          pointsResult = await PointsService.awardPoints(
            req.user.userId, 
            POINTS.FIRST_CLAIM + POINTS.CLAIM_SUBMISSION, 
            'FIRST_CLAIM_SUBMISSION', 
            `First claim submitted: ${claimId}`
          );
        } else {
          // Regular claim submission points
          pointsResult = await PointsService.awardPoints(
            req.user.userId, 
            POINTS.CLAIM_SUBMISSION, 
            'CLAIM_SUBMISSION', 
            `Claim submitted: ${claimId}`
          );
        }
        
        console.log('Points awarded:', pointsResult);

        res.status(201).json({
          success: true,
          message: 'Claim submitted successfully',
          claim: result.rows[0],
          pointsAwarded: pointsResult?.pointsAwarded,
          isFirstClaim: isFirstClaim
        });
      } catch (pointsError) {
        console.log('Points service error, continuing without points:', pointsError.message);
        res.status(201).json({
          success: true,
          message: 'Claim submitted successfully',
          claim: result.rows[0],
          isFirstClaim: isFirstClaim
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

  // ✅ NEW: Improved AI verdict determination logic
  determineAIVerdict(aiVerdict) {
    const verdictText = (aiVerdict.verdict || '').toLowerCase();
    const explanation = (aiVerdict.explanation || '').toLowerCase();
    
    console.log('Analyzing AI verdict:', { verdictText, explanation: explanation.substring(0, 200) + '...' });

    // Combine both verdict and explanation for analysis
    const combinedText = verdictText + ' ' + explanation;

    // STRONG FALSE INDICATORS - Check these first (HIGHEST PRIORITY)
    const strongFalseIndicators = [
      'false', 'incorrect', 'not true', 'inaccurate', 'untrue', 'wrong',
      'debunk', 'disproven', 'misinformation', 'no evidence', 'lack of evidence',
      'contradict', 'refut', 'fabricat', 'hoax', 'myth', 'baseless', 'no support',
      'false claim', 'is false', 'was false', 'are false', 'proven false'
    ];

    // STRONG TRUE INDICATORS
    const strongTrueIndicators = [
      'true', 'correct', 'accurate', 'verified', 'valid', 'supported by evidence',
      'evidence confirms', 'consistent with', 'accurate portrayal', 'factual',
      'is true', 'was true', 'are true', 'confirmed true'
    ];

    // MISLEADING INDICATORS
    const misleadingIndicators = [
      'misleading', 'exaggerat', 'distort', 'partial', 'out of context',
      'oversimplif', 'misrepresent', 'half-truth', 'cherry-pick', 'deceptive'
    ];

    // NEEDS CONTEXT INDICATORS
    const needsContextIndicators = [
      'needs context', 'needs_context', 'additional information', 'more information',
      'unverifiable', 'insufficient', 'uncertain', 'unclear', 'requires context',
      'context needed', 'more context'
    ];

    // Check for strong false indicators first (highest priority)
    for (const indicator of strongFalseIndicators) {
      if (combinedText.includes(indicator)) {
        console.log(`✅ Detected FALSE verdict with indicator: ${indicator}`);
        return { 
          finalVerdict: 'false', 
          confidenceScore: 0.9 
        };
      }
    }

    // Check for strong true indicators
    for (const indicator of strongTrueIndicators) {
      if (combinedText.includes(indicator)) {
        console.log(`✅ Detected TRUE verdict with indicator: ${indicator}`);
        return { 
          finalVerdict: 'true', 
          confidenceScore: 0.9 
        };
      }
    }

    // Check for misleading indicators
    for (const indicator of misleadingIndicators) {
      if (combinedText.includes(indicator)) {
        console.log(`✅ Detected MISLEADING verdict with indicator: ${indicator}`);
        return { 
          finalVerdict: 'misleading', 
          confidenceScore: 0.8 
        };
      }
    }

    // Check for needs context indicators
    for (const indicator of needsContextIndicators) {
      if (combinedText.includes(indicator)) {
        console.log(`✅ Detected NEEDS_CONTEXT verdict with indicator: ${indicator}`);
        return { 
          finalVerdict: 'needs_context', 
          confidenceScore: 0.6 
        };
      }
    }

    // FALLBACK: If no clear indicators found, analyze the overall sentiment
    const negativeWords = ['not', 'no', 'never', 'nothing', 'without', 'lack', 'false', 'incorrect'];
    const positiveWords = ['yes', 'confirm', 'support', 'valid', 'true', 'accurate', 'correct'];
    
    const negativeCount = negativeWords.filter(word => combinedText.includes(word)).length;
    const positiveCount = positiveWords.filter(word => combinedText.includes(word)).length;

    if (negativeCount > positiveCount + 1) {
      console.log('🔄 Fallback: Detected FALSE based on negative sentiment');
      return { finalVerdict: 'false', confidenceScore: 0.7 };
    } else if (positiveCount > negativeCount + 1) {
      console.log('🔄 Fallback: Detected TRUE based on positive sentiment');
      return { finalVerdict: 'true', confidenceScore: 0.7 };
    }

    // FINAL FALLBACK: Default to needs_context
    console.log('❓ No clear verdict detected, defaulting to NEEDS_CONTEXT');
    return { finalVerdict: 'needs_context', confidenceScore: 0.5 };
  }

  // ✅ NEW: Get proper claim status from AI verdict
  getClaimStatusFromAIVerdict(verdict, confidenceScore) {
    if (confidenceScore >= 0.7) {
      switch (verdict) {
        case 'true':
          return 'ai_verified';
        case 'false':
          return 'ai_false';
        case 'misleading':
          return 'ai_misleading';
        case 'needs_context':
          return 'needs_human_review';
        default:
          return 'needs_human_review';
      }
    } else {
      return 'needs_human_review';
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
          u.email as "factCheckerName",
          fc.username as "factCheckerUsername",
          av.verdict as "ai_verdict",
          av.explanation as "ai_explanation",
          av.confidence_score as "ai_confidence"
        FROM hakikisha.claims c
        LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
        LEFT JOIN hakikisha.users u ON v.fact_checker_id = u.id
        LEFT JOIN hakikisha.fact_checkers fc_profile ON u.id = fc_profile.user_id
        LEFT JOIN hakikisha.users fc ON fc_profile.user_id = fc.id
        LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
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
      
      const claims = result.rows.map(claim => this.normalizeClaimForList(claim));

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

  // ✅ NEW: Normalize claim for list view
  normalizeClaimForList(claim) {
    // Determine final verdict (human takes precedence over AI)
    let finalVerdict = claim.verdict;
    let finalVerdictText = claim.verdictText;
    let isAI = false;

    if (!finalVerdict && claim.ai_verdict) {
      finalVerdict = claim.ai_verdict;
      finalVerdictText = claim.ai_explanation;
      isAI = true;
    }

    return {
      id: claim.id,
      title: claim.title,
      category: claim.category,
      status: claim.status,
      submittedDate: claim.submittedDate,
      verdictDate: claim.verdictDate,
      verdict: finalVerdict,
      verdictText: finalVerdictText,
      sources: claim.sources || [],
      factCheckerName: claim.factCheckerUsername || claim.factCheckerName || 'Fact Checker',
      verified_by_ai: isAI,
      ai_confidence: claim.ai_confidence
    };
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
          v.verdict as "human_verdict", 
          v.explanation as "human_explanation", 
          v.evidence_sources as "evidence_sources",
          v.created_at as "verdictDate",
          v.time_spent as "review_time",
          COALESCE(v.responsibility, 'creco') as "verdict_responsibility",
          fc.email as "factCheckerEmail",
          fc.username as "factCheckerName",
          fc.profile_picture as "factCheckerAvatar",
          av.verdict as "ai_verdict",
          av.explanation as "ai_explanation",
          av.confidence_score as "ai_confidence",
          av.evidence_sources as "ai_sources",
          COALESCE(av.disclaimer, 'This is an AI-generated response. CRECO is not responsible for any implications.') as "ai_disclaimer",
          COALESCE(av.is_edited_by_human, false) as "ai_edited"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.users u ON c.user_id = u.id
         LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
         LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
         LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
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
      console.log('Claim found with status:', claim.status);
      
      // Process evidence sources to ensure consistent format
      let humanSources = [];
      let aiSources = [];
      
      try {
        // Handle evidence_sources - it might be a string, JSON string, or array
        if (claim.evidence_sources) {
          if (typeof claim.evidence_sources === 'string') {
            // Try to parse as JSON first
            try {
              const parsed = JSON.parse(claim.evidence_sources);
              if (Array.isArray(parsed)) {
                humanSources = parsed;
              } else if (typeof parsed === 'string') {
                // If it's a single string, wrap it in an array
                humanSources = [{ title: parsed, url: parsed }];
              } else if (parsed && typeof parsed === 'object') {
                // If it's a single object, wrap it in an array
                humanSources = [parsed];
              }
            } catch (parseError) {
              // If JSON parsing fails, treat it as a single source string
              console.log('Evidence sources is not valid JSON, treating as string:', claim.evidence_sources);
              humanSources = [{ title: claim.evidence_sources, url: claim.evidence_sources }];
            }
          } else if (Array.isArray(claim.evidence_sources)) {
            humanSources = claim.evidence_sources;
          } else if (typeof claim.evidence_sources === 'object') {
            humanSources = [claim.evidence_sources];
          }
        }
      } catch (e) {
        console.log('Error parsing human evidence sources:', e);
        humanSources = [];
      }
      
      try {
        // Handle AI sources
        if (claim.ai_sources) {
          if (typeof claim.ai_sources === 'string') {
            try {
              const parsed = JSON.parse(claim.ai_sources);
              if (Array.isArray(parsed)) {
                aiSources = parsed;
              } else if (typeof parsed === 'string') {
                aiSources = [{ title: parsed, url: parsed }];
              } else if (parsed && typeof parsed === 'object') {
                aiSources = [parsed];
              }
            } catch (parseError) {
              console.log('AI sources is not valid JSON, treating as string:', claim.ai_sources);
              aiSources = [{ title: claim.ai_sources, url: claim.ai_sources }];
            }
          } else if (Array.isArray(claim.ai_sources)) {
            aiSources = claim.ai_sources;
          } else if (typeof claim.ai_sources === 'object') {
            aiSources = [claim.ai_sources];
          }
        }
      } catch (e) {
        console.log('Error parsing AI evidence sources:', e);
        aiSources = [];
      }

      // Fix malformed source objects (where strings are split into character objects)
      humanSources = humanSources.map(source => {
        if (source && typeof source === 'object') {
          // Check if this is a malformed object with numbered keys (split string)
          const keys = Object.keys(source);
          const hasNumberedKeys = keys.some(key => !isNaN(parseInt(key)));
          
          if (hasNumberedKeys && !source.title && !source.url) {
            // Reconstruct the string from numbered keys
            const reconstructedString = keys
              .filter(key => !isNaN(parseInt(key)))
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => source[key])
              .join('');
            
            return { 
              title: reconstructedString, 
              url: reconstructedString,
              type: 'human'
            };
          }
          
          // Ensure the source has proper structure
          return {
            title: source.title || source.name || 'Source',
            url: source.url || source.link || '',
            type: source.type || 'human'
          };
        } else if (typeof source === 'string') {
          return { title: source, url: source, type: 'human' };
        }
        return source;
      });

      aiSources = aiSources.map(source => {
        if (source && typeof source === 'object') {
          const keys = Object.keys(source);
          const hasNumberedKeys = keys.some(key => !isNaN(parseInt(key)));
          
          if (hasNumberedKeys && !source.title && !source.url) {
            const reconstructedString = keys
              .filter(key => !isNaN(parseInt(key)))
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(key => source[key])
              .join('');
            
            return { 
              title: reconstructedString, 
              url: reconstructedString,
              type: 'ai'
            };
          }
          
          return {
            title: source.title || source.name || 'Source',
            url: source.url || source.link || '',
            type: source.type || 'ai'
          };
        } else if (typeof source === 'string') {
          return { title: source, url: source, type: 'ai' };
        }
        return source;
      });

      // Combine sources with type indicator
      const allSources = [
        ...humanSources.map(source => ({ ...source, type: 'human' })),
        ...aiSources.map(source => ({ ...source, type: 'ai' }))
      ];

      // ✅ FIXED: Determine final verdict properly
      let finalVerdict = claim.human_verdict || claim.ai_verdict;
      let finalVerdictText = claim.human_explanation || claim.ai_explanation;
      let verified_by_ai = !claim.human_verdict && !!claim.ai_verdict;

      const responseData = {
        id: claim.id,
        title: claim.title,
        description: claim.description,
        category: claim.category,
        status: claim.status,
        submittedBy: claim.submittedBy,
        submittedDate: claim.created_at,
        verdictDate: claim.verdictDate,
        verdict: finalVerdict,
        human_verdict: claim.human_verdict,
        ai_verdict: claim.ai_verdict,
        verdictText: finalVerdictText,
        human_explanation: claim.human_explanation,
        ai_explanation: claim.ai_explanation,
        sources: allSources,
        evidence_sources: humanSources,
        ai_sources: aiSources,
        factChecker: {
          name: claim.factCheckerName || 'Fact Checker',
          email: claim.factCheckerEmail,
          avatar: claim.factCheckerAvatar
        },
        ai_confidence: claim.ai_confidence,
        ai_disclaimer: claim.ai_disclaimer,
        ai_edited: claim.ai_edited,
        verdict_responsibility: claim.verdict_responsibility || 'ai',
        review_time: claim.review_time,
        imageUrl: claim.media_url,
        videoLink: claim.media_type === 'video' ? claim.media_url : null,
        verified_by_ai: verified_by_ai
      };

      console.log('Processed claim data for frontend:', {
        id: responseData.id,
        status: responseData.status,
        verdict: responseData.verdict,
        hasVerdict: !!responseData.verdict,
        verified_by_ai: responseData.verified_by_ai,
        sourcesCount: responseData.sources.length
      });

      res.json({
        success: true,
        claim: responseData
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
          COALESCE(v.explanation, av.explanation) as "verdictText",
          COALESCE(v.evidence_sources, av.evidence_sources) as sources,
          c.created_at as "submittedDate",
          v.created_at as "verdictDate",
          c.submission_count,
          c.is_trending,
          c.trending_score as "trendingScore",
          fc.username as "factCheckerName",
          av.confidence_score as "ai_confidence",
          CASE WHEN v.id IS NOT NULL THEN false ELSE true END as "verified_by_ai"
        FROM hakikisha.claims c
        LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
        LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
        LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
        WHERE c.status IN ('completed', 'human_approved', 'published', 'resolved', 'ai_verified', 'ai_false', 'ai_misleading')
        ORDER BY 
          c.is_trending DESC,
          c.trending_score DESC,
          c.submission_count DESC,
          c.created_at DESC
        LIMIT $1
      `;

      console.log('Executing query');
      const result = await db.query(query, [parseInt(limit)]);

      console.log('Found', result.rows.length, 'trending claims');

      const processedClaims = result.rows.map(claim => {
        let sources = [];
        try {
          sources = claim.sources ? 
            (typeof claim.sources === 'string' ? 
              JSON.parse(claim.sources) : claim.sources) : [];
        } catch (e) {
          console.log('Error parsing sources for claim:', claim.id, e);
          sources = [];
        }

        return {
          ...claim,
          sources: sources,
          ai_confidence: claim.ai_confidence,
          verified_by_ai: claim.verified_by_ai
        };
      });

      if (processedClaims.length === 0) {
        console.log('No trending claims found, fetching recent claims...');
        const fallbackResult = await db.query(`
          SELECT 
            c.id, 
            c.title, 
            c.description,
            c.category, 
            c.status,
            COALESCE(v.verdict, av.verdict) as verdict,
            COALESCE(v.explanation, av.explanation) as "verdictText",
            COALESCE(v.evidence_sources, av.evidence_sources) as sources,
            c.created_at as "submittedDate",
            v.created_at as "verdictDate",
            c.submission_count,
            c.is_trending,
            fc.username as "factCheckerName",
            av.confidence_score as "ai_confidence",
            CASE WHEN v.id IS NOT NULL THEN false ELSE true END as "verified_by_ai"
          FROM hakikisha.claims c
          LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
          LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
          LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
          WHERE c.status NOT IN ('rejected', 'pending')
          ORDER BY c.created_at DESC
          LIMIT $1
        `, [parseInt(limit)]);

        const fallbackClaims = fallbackResult.rows.map(claim => {
          let sources = [];
          try {
            sources = claim.sources ? 
              (typeof claim.sources === 'string' ? 
                JSON.parse(claim.sources) : claim.sources) : [];
          } catch (e) {
            console.log('Error parsing sources for fallback claim:', claim.id, e);
            sources = [];
          }

          return {
            ...claim,
            sources: sources,
            ai_confidence: claim.ai_confidence,
            verified_by_ai: claim.verified_by_ai
          };
        });
        
        res.json({
          success: true,
          trendingClaims: fallbackClaims,
          count: fallbackClaims.length
        });
      } else {
        res.json({
          success: true,
          trendingClaims: processedClaims,
          count: processedClaims.length
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

  // New method to handle verdict points awarding
  async awardPointsForVerdict(userId, claimId, verdictType) {
    try {
      if (verdictType === 'human_approved' || verdictType === 'completed') {
        const pointsResult = await PointsService.awardPointsForVerdictReceived(userId, claimId);
        console.log(`Awarded ${pointsResult.pointsAwarded} points for verdict on claim ${claimId}`);
        return pointsResult;
      }
    } catch (pointsError) {
      console.error('Error awarding verdict points:', pointsError);
      throw pointsError;
    }
  }

  // Method to handle claim status updates and award points accordingly
  async updateClaimStatus(claimId, newStatus, userId = null) {
    try {
      // Update claim status
      await db.query(
        'UPDATE hakikisha.claims SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, claimId]
      );

      // If user ID is provided and status indicates completion, award points
      if (userId && (newStatus === 'human_approved' || newStatus === 'completed')) {
        await this.awardPointsForVerdict(userId, claimId, newStatus);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating claim status:', error);
      throw error;
    }
  }

  // Submit user response to verdict
  async submitVerdictResponse(req, res) {
    try {
      const { claimId } = req.params;
      const { response, responseType } = req.body;

      if (!response || !responseType) {
        return res.status(400).json({
          success: false,
          error: 'Response and response type are required'
        });
      }

      const responseId = require('uuid').v4();

      await db.query(
        `INSERT INTO hakikisha.verdict_responses 
         (id, claim_id, user_id, response, response_type, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [responseId, claimId, req.user.userId, response, responseType]
      );

      res.status(201).json({
        success: true,
        message: 'Response submitted successfully',
        response_id: responseId
      });
    } catch (error) {
      console.error('Submit verdict response error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit response'
      });
    }
  }

  // Get verdict responses for a claim
  async getVerdictResponses(req, res) {
    try {
      const { claimId } = req.params;

      const result = await db.query(
        `SELECT 
          vr.id,
          vr.response,
          vr.response_type,
          vr.created_at,
          u.username,
          u.profile_picture
         FROM hakikisha.verdict_responses vr
         JOIN hakikisha.users u ON vr.user_id = u.id
         WHERE vr.claim_id = $1
         ORDER BY vr.created_at DESC`,
        [claimId]
      );

      res.json({
        success: true,
        responses: result.rows
      });
    } catch (error) {
      console.error('Get verdict responses error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get responses'
      });
    }
  }

  // Get verified claims (claims with final human verdict or published)
  async getVerifiedClaims(req, res) {
    try {
      const result = await db.query(
        `SELECT 
          c.id,
          c.title,
          c.category,
          c.status,
          c.created_at as "submittedDate",
          v.verdict,
          v.explanation as "verdictText",
          v.created_at as "verdictDate",
          av.verdict as "ai_verdict",
          av.confidence_score as "ai_confidence",
          CASE WHEN v.id IS NOT NULL THEN false ELSE true END as "verified_by_ai"
         FROM hakikisha.claims c
         LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
         LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
         WHERE c.status IN ('human_approved','published', 'ai_verified', 'ai_false', 'ai_misleading') 
            OR c.human_verdict_id IS NOT NULL
         ORDER BY c.created_at DESC
         LIMIT 50`
      );

      res.json({
        success: true,
        claims: result.rows
      });
    } catch (error) {
      console.error('Get verified claims error:', error);
      logger.error('Get verified claims error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verified claims',
        code: 'SERVER_ERROR'
      });
    }
  }
}

const claimController = new ClaimController();
module.exports = claimController;