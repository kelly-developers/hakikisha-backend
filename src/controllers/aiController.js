const AIService = require('../services/aiService');
const Claim = require('../models/Claim');
const AIVerdict = require('../models/AIVerdict');
const Blog = require('../models/Blog');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class AIController {
  async processClaimWithAI(req, res, next) {
    try {
      const { claimId } = req.params;

      const claim = await Claim.findById(claimId);
      if (!claim) {
        return res.status(404).json({ error: Constants.ERROR_MESSAGES.NOT_FOUND });
      }

      // Check if AI verdict already exists
      const existingVerdict = await AIVerdict.findByClaimId(claimId);
      if (existingVerdict) {
        return res.status(409).json({ 
          error: 'AI verdict already exists for this claim',
          verdict: existingVerdict 
        });
      }

      const claimText = `${claim.title} ${claim.description}`;
      const aiResult = await AIService.processClaimWithAI(claimText);

      // Map old verdict types to new ones if needed
      const verdictMapping = {
        'verified': 'true',
        'false': 'false',
        'misleading': 'misleading',
        'needs_context': 'needs_context',
        'unverifiable': 'unverifiable'
      };

      const mappedVerdict = verdictMapping[aiResult.verdict] || aiResult.verdict;

      // Save AI verdict
      const aiVerdict = await AIVerdict.create({
        claim_id: claimId,
        verdict: mappedVerdict,
        confidence_score: aiResult.confidence_score,
        explanation: aiResult.explanation,
        evidence_sources: aiResult.sources,
        ai_model_version: Constants.AI.MODEL_VERSION
      });

      // Update claim status to 'completed'
      await Claim.updateStatus(claimId, 'completed');

      logger.info(`AI processing completed for claim ${claimId}`);

      res.json({
        message: 'AI processing completed successfully',
        verdict: aiVerdict,
        claim_status: 'completed'
      });

    } catch (error) {
      logger.error('AI processing error:', error);
      next(error);
    }
  }

  async getAIVerdict(req, res, next) {
    try {
      const { claimId } = req.params;

      const aiVerdict = await AIVerdict.findByClaimId(claimId);
      if (!aiVerdict) {
        return res.status(404).json({ error: 'AI verdict not found' });
      }

      res.json({
        verdict: aiVerdict
      });

    } catch (error) {
      logger.error('Get AI verdict error:', error);
      next(error);
    }
  }

  async generateBlogFromClaims(req, res, next) {
    try {
      const { claimIds, title, category = Constants.BLOG_CATEGORIES.FACT_CHECK } = req.body;

      if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
        return res.status(400).json({ error: 'Valid claim IDs array is required' });
      }

      // Get the claims details
      const claims = [];
      for (const claimId of claimIds) {
        const claim = await Claim.findById(claimId);
        if (claim) {
          claims.push(claim);
        }
      }

      if (claims.length === 0) {
        return res.status(404).json({ error: 'No valid claims found' });
      }

      // Generate blog content using AI
      const topic = title || `Analysis of ${claims.length} Related Claims`;
      const blogContent = await AIService.generateBlogContent(topic, claims);

      // Create blog article
      const blog = await Blog.create({
        title: topic,
        content: blogContent,
        author_id: req.user.userId,
        author_type: 'ai_assisted',
        category,
        source_claim_ids: claimIds
      });

      logger.info(`AI-generated blog created: ${blog.id}`);

      res.status(201).json({
        message: 'Blog generated successfully',
        blog: {
          id: blog.id,
          title: blog.title,
          category: blog.category,
          read_time: blog.read_time
        }
      });

    } catch (error) {
      logger.error('Generate blog from claims error:', error);
      next(error);
    }
  }

  async analyzeTrendingTopics(req, res, next) {
    try {
      const { timeframe = '24 hours', limit = 5 } = req.query;

      // Get recent claims for analysis
      const recentClaims = await Claim.getRecentForAnalysis(timeframe, 100);
      
      if (recentClaims.length === 0) {
        return res.json({
          message: 'No claims found for analysis',
          trending_topics: []
        });
      }

      const trendingAnalysis = await AIService.detectTrendingTopics(recentClaims, timeframe);

      logger.info(`Trending analysis completed: ${trendingAnalysis.length} topics found`);

      res.json({
        message: 'Trending analysis completed successfully',
        analysis: {
          timeframe,
          total_claims_analyzed: recentClaims.length,
          trending_topics: trendingAnalysis
        }
      });

    } catch (error) {
      logger.error('Analyze trending topics error:', error);
      next(error);
    }
  }

  async getAIPerformance(req, res, next) {
    try {
      const { timeframe = '30 days' } = req.query;

      const accuracyStats = await AIVerdict.getAccuracyStats(timeframe);
      const totalProcessed = await AIVerdict.countProcessed(timeframe);
      const averageConfidence = await AIVerdict.getAverageConfidence(timeframe);

      res.json({
        performance: {
          timeframe,
          total_claims_processed: totalProcessed,
          average_confidence: averageConfidence,
          accuracy_breakdown: accuracyStats
        }
      });

    } catch (error) {
      logger.error('Get AI performance error:', error);
      next(error);
    }
  }

  async reprocessLowConfidenceVerdicts(req, res, next) {
    try {
      const { confidence_threshold = 0.7, limit = 10 } = req.body;

      const lowConfidenceVerdicts = await AIVerdict.findLowConfidence(confidence_threshold, limit);

      const results = [];
      for (const verdict of lowConfidenceVerdicts) {
        try {
          const claim = await Claim.findById(verdict.claim_id);
          if (claim) {
            const claimText = `${claim.title} ${claim.description}`;
            const newResult = await AIService.processClaimWithAI(claimText);

            // Map verdict if needed
            const verdictMapping = {
              'verified': 'true',
              'false': 'false',
              'misleading': 'misleading',
              'needs_context': 'needs_context',
              'unverifiable': 'unverifiable'
            };
            const mappedVerdict = verdictMapping[newResult.verdict] || newResult.verdict;

            // Update verdict if confidence improved
            if (newResult.confidence_score > verdict.confidence_score) {
              await AIVerdict.update(verdict.id, {
                verdict: mappedVerdict,
                confidence_score: newResult.confidence_score,
                explanation: newResult.explanation,
                evidence_sources: newResult.sources
              });

              results.push({
                verdict_id: verdict.id,
                claim_id: verdict.claim_id,
                old_confidence: verdict.confidence_score,
                new_confidence: newResult.confidence_score,
                status: 'updated'
              });
            } else {
              results.push({
                verdict_id: verdict.id,
                claim_id: verdict.claim_id,
                confidence: verdict.confidence_score,
                status: 'no_improvement'
              });
            }
          }
        } catch (error) {
          logger.error(`Reprocessing failed for verdict ${verdict.id}:`, error);
          results.push({
            verdict_id: verdict.id,
            status: 'failed',
            error: error.message
          });
        }
      }

      res.json({
        message: 'Reprocessing completed',
        results,
        processed: results.length
      });

    } catch (error) {
      logger.error('Reprocess low confidence verdicts error:', error);
      next(error);
    }
  }

  // New method tha handle verdict mapping for frontend
  async getVerdictDisplayInfo(verdict) {
    const verdictDisplayMap = {
      'true': {
        label: 'True',
        color: 'green',
        icon: '✓',
        description: 'The claim is accurate and supported by evidence'
      },
      'false': {
        label: 'False',
        color: 'red',
        icon: '✗',
        description: 'The claim is inaccurate and contradicted by evidence'
      },
      'misleading': {
        label: 'Misleading',
        color: 'orange',
        icon: '⚠',
        description: 'The claim contains some truth but is presented in a misleading way'
      },
      'needs_context': {
        label: 'Needs Context',
        color: 'yellow',
        icon: '📋',
        description: 'The claim requires additional context to be properly understood'
      },
      'unverifiable': {
        label: 'Unverifiable',
        color: 'gray',
        icon: '?',
        description: 'There is not enough evidence to verify this claim'
      }
    };

    return verdictDisplayMap[verdict] || {
      label: 'Unknown',
      color: 'gray',
      icon: '?',
      description: 'Verdict status unknown'
    };
  }
}

module.exports = new AIController();