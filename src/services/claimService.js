const Claim = require('../models/Claim');
const AIVerdict = require('../models/AIVerdict');
const Verdict = require('../models/Verdict');
const Notification = require('../models/Notification');
const TrendingTopic = require('../models/TrendingTopic');
const { addToQueue } = require('../queues/claimQueue');
const aiService = require('./aiService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class ClaimService {
  async submitClaim(claimData, userId) {
    try {
      // Create claim
      const claim = await Claim.create({
        ...claimData,
        user_id: userId
      });

      // Check for similar claims (basic duplicate detection)
      const similarClaims = await this.findSimilarClaims(claim.title, claim.description);
      if (similarClaims.length > 0) {
        await Claim.update(claim.id, {
          submission_count: similarClaims.length + 1,
          similarity_hash: this.generateSimilarityHash(claim.title)
        });

        // Update similar claims' submission counts
        for (const similarClaim of similarClaims) {
          await Claim.update(similarClaim.id, {
            submission_count: similarClaim.submission_count + 1
          });
        }
      }

      // Add to AI processing queue
      await addToQueue('ai-processing', {
        claimId: claim.id,
        claimText: `${claim.title} ${claim.description}`,
        userId: userId
      });

      // Notify admins about new claim (if needed)
      await this.notifyAdminsAboutNewClaim(claim);

      logger.info('Claim submitted successfully', { claimId: claim.id, userId });

      return {
        claim: {
          id: claim.id,
          title: claim.title,
          status: claim.status,
          estimated_processing_time: '24-48 hours'
        },
        similar_claims_found: similarClaims.length
      };

    } catch (error) {
      logger.error('Claim submission failed:', error);
      throw error;
    }
  }

  async processClaimWithAI(claimId) {
    try {
      const claim = await Claim.findById(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      const claimText = `${claim.title} ${claim.description}`;
      
      // Get AI verdict
      const aiResult = await aiService.processClaimWithAI(claimText);

      // Save AI verdict
      const aiVerdict = await AIVerdict.create({
        claim_id: claimId,
        verdict: aiResult.verdict,
        confidence_score: aiResult.confidence_score,
        explanation: aiResult.explanation,
        evidence_sources: aiResult.sources,
        ai_model_version: Constants.AI.MODEL_VERSION
      });

      // Update claim status
      await Claim.update(claimId, {
        ai_verdict_id: aiVerdict.id,
        status: Constants.CLAIM_STATUS.AI_APPROVED
      });

      // Check if claim should be flagged for human review
      if (aiResult.confidence_score < Constants.AI.CONFIDENCE_THRESHOLD) {
        await this.flagForHumanReview(claimId);
      }

      logger.info('AI processing completed', { claimId, verdict: aiResult.verdict });

      return aiVerdict;

    } catch (error) {
      logger.error('AI claim processing failed:', error);
      
      // Update claim status to indicate processing failure
      await Claim.update(claimId, {
        status: Constants.CLAIM_STATUS.PENDING
      });

      throw error;
    }
  }

  async assignClaimToFactChecker(claimId, factCheckerId) {
    try {
      const claim = await Claim.findById(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      // Assign claim to fact-checker
      const updatedClaim = await Claim.assignToFactChecker(claimId, factCheckerId);

      // Notify fact-checker
      await Notification.create({
        user_id: factCheckerId,
        type: 'claim_assigned',
        title: 'New Claim Assigned',
        message: `You have been assigned a new claim: "${claim.title}"`,
        related_entity_type: 'claim',
        related_entity_id: claimId
      });

      logger.info('Claim assigned to fact-checker', { claimId, factCheckerId });

      return updatedClaim;

    } catch (error) {
      logger.error('Claim assignment failed:', error);
      throw error;
    }
  }

  async submitVerdict(verdictData, factCheckerId) {
    try {
      const { claim_id, verdict, explanation, evidence_sources, approve_ai_verdict } = verdictData;

      const claim = await Claim.findById(claim_id);
      if (!claim) {
        throw new Error('Claim not found');
      }

      let ai_verdict_id = null;
      if (approve_ai_verdict && claim.ai_verdict_id) {
        ai_verdict_id = claim.ai_verdict_id;
      }

      // Create verdict
      const humanVerdict = await Verdict.create({
        claim_id,
        fact_checker_id: factCheckerId,
        verdict,
        explanation,
        evidence_sources,
        ai_verdict_id
      });

      // Update claim status
      await Claim.updateStatus(claim_id, Constants.CLAIM_STATUS.HUMAN_APPROVED);

      // Notify original claim submitter
      await Notification.create({
        user_id: claim.user_id,
        type: 'verdict_ready',
        title: 'Your Claim Has Been Verified',
        message: `Fact-checkers have reviewed your claim: "${claim.title}"`,
        related_entity_type: 'claim',
        related_entity_id: claim_id
      });

      // Check if claim should be promoted to trending
      await this.checkForTrendingPromotion(claim_id);

      logger.info('Verdict submitted successfully', { claimId: claim_id, factCheckerId });

      return humanVerdict;

    } catch (error) {
      logger.error('Verdict submission failed:', error);
      throw error;
    }
  }

  async findSimilarClaims(title, description, threshold = 0.8) {
    try {
      // Basic similarity search using title and description
      // In production, you might use more advanced techniques like embedding similarity
      const query = `
        SELECT id, title, description, submission_count
        FROM claims 
        WHERE (
          SIMILARITY(title, $1) > $2 
          OR title % $1
          OR description ILIKE '%' || $1 || '%'
        )
        AND status NOT IN ('rejected', 'draft')
        ORDER BY submission_count DESC
        LIMIT 5
      `;

      // This would use your database's full-text search capabilities
      // For now, return empty array as placeholder
      return [];

    } catch (error) {
      logger.error('Similar claims search failed:', error);
      return [];
    }
  }

  generateSimilarityHash(text) {
    // Simple hash for similarity detection
    // In production, use proper hashing or embedding
    const words = text.toLowerCase().split(/\s+/).sort();
    return words.join(' ').substring(0, 100); // Truncate for efficiency
  }

  async flagForHumanReview(claimId) {
    try {
      await Claim.updateStatus(claimId, Constants.CLAIM_STATUS.HUMAN_REVIEW);
      
      // Notify available fact-checkers
      await this.notifyFactCheckersForReview(claimId);

      logger.info('Claim flagged for human review', { claimId });

    } catch (error) {
      logger.error('Flagging for human review failed:', error);
    }
  }

  async notifyFactCheckersForReview(claimId) {
    try {
      // This would notify fact-checkers based on their expertise and availability
      // For now, this is a placeholder implementation
      const claim = await Claim.findById(claimId);
      
      // You would typically:
      // 1. Find fact-checkers with relevant expertise
      // 2. Check their current workload
      // 3. Send notifications to available fact-checkers

      logger.debug('Fact-checker notification placeholder', { claimId });

    } catch (error) {
      logger.error('Fact-checker notification failed:', error);
    }
  }

  async notifyAdminsAboutNewClaim(claim) {
    try {
      // This would notify admins about high-priority or sensitive claims
      if (this.isHighPriorityClaim(claim)) {
        // Implementation for admin notifications
        logger.debug('Admin notification placeholder for high-priority claim', { 
          claimId: claim.id, 
          category: claim.category 
        });
      }

    } catch (error) {
      logger.error('Admin notification failed:', error);
    }
  }

  isHighPriorityClaim(claim) {
    // Determine if claim is high priority
    const highPriorityCategories = [Constants.CATEGORIES.POLITICS, Constants.CATEGORIES.HEALTH];
    const urgentKeywords = ['emergency', 'urgent', 'breaking', 'crisis'];
    
    const title = claim.title.toLowerCase();
    const isUrgent = urgentKeywords.some(keyword => title.includes(keyword));
    
    return highPriorityCategories.includes(claim.category) || isUrgent;
  }

  async checkForTrendingPromotion(claimId) {
    try {
      const claim = await Claim.findById(claimId);
      
      if (claim.submission_count >= 10) { // Threshold for trending
        // Create or update trending topic
        await this.createOrUpdateTrendingTopic(claim);
        
        // Update claim as trending
        await Claim.update(claimId, {
          is_trending: true,
          trending_score: this.calculateTrendingScore(claim)
        });

        logger.info('Claim promoted to trending', { claimId });
      }

    } catch (error) {
      logger.error('Trending promotion check failed:', error);
    }
  }

  async createOrUpdateTrendingTopic(claim) {
    try {
      // Find existing topic or create new one
      const existingTopic = await TrendingTopic.findByTopicName(claim.title);
      
      if (existingTopic) {
        await TrendingTopic.addRelatedClaim(existingTopic.id, claim.id);
      } else {
        await TrendingTopic.create({
          topic: claim.title,
          category: claim.category,
          claim_count: 1,
          engagement_score: this.calculateEngagementScore(claim),
          related_claims: [claim.id]
        });
      }

    } catch (error) {
      logger.error('Trending topic update failed:', error);
    }
  }

  calculateTrendingScore(claim) {
    // Simple trending score calculation
    let score = claim.submission_count * 10; // Base score from submissions
    
    if (claim.priority === Constants.PRIORITY.HIGH) score += 20;
    if (claim.priority === Constants.PRIORITY.CRITICAL) score += 50;
    
    // Add time decay (newer claims get higher scores)
    const hoursSinceSubmission = (new Date() - new Date(claim.created_at)) / (1000 * 60 * 60);
    const timeDecay = Math.max(0, 1 - (hoursSinceSubmission / 168)); // Decay over 1 week
    
    return score * timeDecay;
  }

  calculateEngagementScore(claim) {
    // Calculate engagement based on various factors
    let score = claim.submission_count * 5;
    
    // Add weights based on category
    const categoryWeights = {
      [Constants.CATEGORIES.POLITICS]: 1.5,
      [Constants.CATEGORIES.HEALTH]: 1.3,
      [Constants.CATEGORIES.EDUCATION]: 1.1,
      [Constants.CATEGORIES.OTHER]: 1.0
    };
    
    score *= categoryWeights[claim.category] || 1.0;
    
    return Math.min(score, 100); // Cap at 100
  }

  async getClaimStatistics(timeframe = '30 days') {
    try {
      const stats = await Claim.getStatistics(timeframe);
      return stats;
    } catch (error) {
      logger.error('Claim statistics retrieval failed:', error);
      throw error;
    }
  }

  async exportClaims(filters, format = 'json') {
    try {
      const claims = await Claim.findByFilters(filters);
      
      if (format === 'csv') {
        return this.convertToCSV(claims);
      }
      
      return claims;
    } catch (error) {
      logger.error('Claims export failed:', error);
      throw error;
    }
  }

  convertToCSV(claims) {
    const headers = ['ID', 'Title', 'Category', 'Status', 'Submission Count', 'Created At'];
    const rows = claims.map(claim => [
      claim.id,
      `"${claim.title.replace(/"/g, '""')}"`,
      claim.category,
      claim.status,
      claim.submission_count,
      claim.created_at
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

module.exports = new ClaimService();