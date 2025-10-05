const Verdict = require('../models/Verdict');
const Claim = require('../models/Claim');
const AIVerdict = require('../models/AIVerdict');
const FactChecker = require('../models/FactChecker');
const Notification = require('../models/Notification');
const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class VerdictService {
  async createVerdict(verdictData, factCheckerId) {
    try {
      const {
        claim_id,
        verdict,
        explanation,
        evidence_sources,
        approve_ai_verdict = false,
        review_notes = '',
        time_spent = 0
      } = verdictData;

      // Validate claim exists and is assigned to fact-checker
      const claim = await Claim.findById(claim_id);
      if (!claim) {
        throw new Error('Claim not found');
      }

      if (claim.assigned_fact_checker_id !== factCheckerId) {
        throw new Error('Claim not assigned to this fact-checker');
      }

      let ai_verdict_id = null;
      if (approve_ai_verdict && claim.ai_verdict_id) {
        ai_verdict_id = claim.ai_verdict_id;
      }

      // Create verdict
      const newVerdict = await Verdict.create({
        claim_id,
        fact_checker_id: factCheckerId,
        verdict,
        explanation,
        evidence_sources,
        ai_verdict_id,
        review_notes,
        time_spent
      });

      // Update claim status
      await Claim.updateStatus(claim_id, Constants.CLAIM_STATUS.HUMAN_APPROVED, factCheckerId);

      // Update fact-checker statistics
      await this.updateFactCheckerStats(factCheckerId, verdict, time_spent);

      // Notify claim submitter
      await this.notifyClaimSubmitter(claim, newVerdict);

      // Track analytics
      await Analytics.trackUserAction(factCheckerId, 'verdict_submission', {
        claim_id,
        verdict,
        time_spent,
        ai_approved: approve_ai_verdict
      });

      logger.info('Verdict created successfully', {
        verdictId: newVerdict.id,
        claimId: claim_id,
        factCheckerId
      });

      return newVerdict;

    } catch (error) {
      logger.error('Verdict creation failed:', error);
      throw error;
    }
  }

  async updateVerdict(verdictId, updates, factCheckerId) {
    try {
      // Verify ownership
      const existingVerdict = await Verdict.findById(verdictId);
      if (!existingVerdict) {
        throw new Error('Verdict not found');
      }

      if (existingVerdict.fact_checker_id !== factCheckerId) {
        throw new Error('Not authorized to update this verdict');
      }

      const updatedVerdict = await Verdict.update(verdictId, updates);

      logger.info('Verdict updated successfully', { verdictId, factCheckerId });

      return updatedVerdict;

    } catch (error) {
      logger.error('Verdict update failed:', error);
      throw error;
    }
  }

  async getVerdictWithDetails(verdictId) {
    try {
      const verdict = await Verdict.findById(verdictId);
      if (!verdict) {
        throw new Error('Verdict not found');
      }

      // Get related data
      const [claim, factChecker, aiVerdict] = await Promise.all([
        Claim.findById(verdict.claim_id),
        FactChecker.findByUserId(verdict.fact_checker_id),
        verdict.ai_verdict_id ? AIVerdict.findById(verdict.ai_verdict_id) : null
      ]);

      return {
        verdict,
        claim: {
          id: claim.id,
          title: claim.title,
          description: claim.description,
          category: claim.category
        },
        fact_checker: {
          id: factChecker.id,
          expertise_areas: factChecker.expertise_areas,
          rating: factChecker.rating
        },
        ai_verdict: aiVerdict
      };

    } catch (error) {
      logger.error('Verdict details retrieval failed:', error);
      throw error;
    }
  }

  async getVerdictsByFactChecker(factCheckerId, filters = {}) {
    try {
      const { page = 1, limit = 20, timeframe, verdict_type } = filters;
      const offset = (page - 1) * limit;

      const verdicts = await Verdict.findByFactChecker(factCheckerId, limit, offset, {
        timeframe,
        verdict_type
      });

      const total = await Verdict.countByFactChecker(factCheckerId, {
        timeframe,
        verdict_type
      });

      return {
        verdicts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Verdicts retrieval failed:', error);
      throw error;
    }
  }

  async getVerdictStatistics(factCheckerId = null, timeframe = '30 days') {
    try {
      const stats = await Verdict.getStats(factCheckerId, timeframe);

      // Calculate additional metrics
      const totalVerdicts = stats.reduce((sum, item) => sum + item.total, 0);
      const accuracyRate = await this.calculateAccuracyRate(factCheckerId, timeframe);
      const averageTime = await this.calculateAverageReviewTime(factCheckerId, timeframe);

      return {
        verdict_distribution: stats,
        total_verdicts: totalVerdicts,
        accuracy_rate: accuracyRate,
        average_review_time: averageTime,
        timeframe
      };

    } catch (error) {
      logger.error('Verdict statistics retrieval failed:', error);
      throw error;
    }
  }

  async calculateAccuracyRate(factCheckerId, timeframe) {
    try {
      // This would compare fact-checker verdicts with consensus or known truths
      // For now, return a placeholder calculation
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN v.verdict = av.verdict THEN 1 END) as matching_ai
        FROM verdicts v
        LEFT JOIN ai_verdicts av ON v.ai_verdict_id = av.id
        WHERE v.fact_checker_id = $1 
          AND v.created_at >= NOW() - INTERVAL '${timeframe}'
          AND av.verdict IS NOT NULL
      `;

      // Placeholder implementation
      return 0.85; // 85% accuracy rate

    } catch (error) {
      logger.error('Accuracy rate calculation failed:', error);
      return 0;
    }
  }

  async calculateAverageReviewTime(factCheckerId, timeframe) {
    try {
      const stats = await Verdict.getStats(factCheckerId, timeframe);
      const totalTime = stats.reduce((sum, item) => sum + (item.avg_time_spent * item.total), 0);
      const totalVerdicts = stats.reduce((sum, item) => sum + item.total, 0);

      return totalVerdicts > 0 ? totalTime / totalVerdicts : 0;

    } catch (error) {
      logger.error('Average review time calculation failed:', error);
      return 0;
    }
  }

  async updateFactCheckerStats(factCheckerId, verdict, timeSpent) {
    try {
      const factChecker = await FactChecker.findByUserId(factCheckerId);
      if (!factChecker) {
        throw new Error('Fact-checker not found');
      }

      // Update rating based on verdict quality (simplified)
      const ratingChange = this.calculateRatingChange(verdict, timeSpent);
      await FactChecker.updateRating(factChecker.id, ratingChange);

      logger.debug('Fact-checker stats updated', { factCheckerId, ratingChange });

    } catch (error) {
      logger.error('Fact-checker stats update failed:', error);
    }
  }

  calculateRatingChange(verdict, timeSpent) {
    // Simplified rating calculation
    // In production, this would be more sophisticated
    let baseRating = 0;

    // Different verdict types might have different weights
    const verdictWeights = {
      [Constants.VERDICTS.TRUE]: 1.0,
      [Constants.VERDICTS.FALSE]: 1.0,
      [Constants.VERDICTS.MISLEADING]: 1.2, // More complex verdicts get higher weight
      [Constants.VERDICTS.SATIRE]: 0.8,
      [Constants.VERDICTS.NEEDS_CONTEXT]: 1.1
    };

    baseRating = verdictWeights[verdict] || 1.0;

    // Time efficiency bonus (faster reviews get slight bonus, but quality is more important)
    const timeEfficiency = Math.max(0.5, Math.min(2.0, 1800 / (timeSpent || 1800))); // 30 minutes as baseline

    return baseRating * timeEfficiency;
  }

  async notifyClaimSubmitter(claim, verdict) {
    try {
      await Notification.create({
        user_id: claim.user_id,
        type: 'verdict_ready',
        title: 'Claim Verification Complete',
        message: `Your claim "${claim.title}" has been verified. Verdict: ${verdict.verdict}`,
        related_entity_type: 'claim',
        related_entity_id: claim.id
      });

      logger.debug('Claim submitter notified', { claimId: claim.id, userId: claim.user_id });

    } catch (error) {
      logger.error('Claim submitter notification failed:', error);
    }
  }

  async exportVerdicts(filters, format = 'json') {
    try {
      const verdicts = await Verdict.findByFilters(filters);
      
      if (format === 'csv') {
        return this.convertVerdictsToCSV(verdicts);
      }
      
      return verdicts;
    } catch (error) {
      logger.error('Verdicts export failed:', error);
      throw error;
    }
  }

  convertVerdictsToCSV(verdicts) {
    const headers = ['ID', 'Claim ID', 'Verdict', 'Explanation', 'Fact-Checker ID', 'Created At'];
    const rows = verdicts.map(verdict => [
      verdict.id,
      verdict.claim_id,
      verdict.verdict,
      `"${verdict.explanation.replace(/"/g, '""')}"`,
      verdict.fact_checker_id,
      verdict.created_at
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async getVerdictQualityMetrics(timeframe = '30 days') {
    try {
      // Get various quality metrics
      const [
        consistencyRate,
        averageConfidence,
        turnaroundTime,
        userSatisfaction
      ] = await Promise.all([
        this.calculateConsistencyRate(timeframe),
        this.calculateAverageConfidence(timeframe),
        this.calculateTurnaroundTime(timeframe),
        this.calculateUserSatisfaction(timeframe)
      ]);

      return {
        consistency_rate: consistencyRate,
        average_confidence: averageConfidence,
        average_turnaround_time: turnaroundTime,
        user_satisfaction_score: userSatisfaction,
        timeframe
      };

    } catch (error) {
      logger.error('Verdict quality metrics retrieval failed:', error);
      throw error;
    }
  }

  async calculateConsistencyRate(timeframe) {
    // Calculate how consistent verdicts are for similar claims
    // Placeholder implementation
    return 0.92;
  }

  async calculateAverageConfidence(timeframe) {
    // Calculate average confidence score of AI verdicts that were approved
    const query = `
      SELECT AVG(av.confidence_score) as avg_confidence
      FROM verdicts v
      JOIN ai_verdicts av ON v.ai_verdict_id = av.id
      WHERE v.created_at >= NOW() - INTERVAL '${timeframe}'
        AND v.approve_ai_verdict = true
    `;

    // Placeholder
    return 0.87;
  }

  async calculateTurnaroundTime(timeframe) {
    // Calculate average time from claim submission to verdict
    const query = `
      SELECT AVG(EXTRACT(EPOCH FROM (v.created_at - c.created_at))) as avg_turnaround
      FROM verdicts v
      JOIN claims c ON v.claim_id = c.id
      WHERE v.created_at >= NOW() - INTERVAL '${timeframe}'
    `;

    // Placeholder (in seconds)
    return 86400; // 24 hours
  }

  async calculateUserSatisfaction(timeframe) {
    // Calculate user satisfaction based on feedback or other metrics
    // Placeholder implementation
    return 4.2; // Out of 5
  }
}

module.exports = new VerdictService();