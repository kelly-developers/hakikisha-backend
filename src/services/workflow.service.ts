import db from '../config/database';
import { AIService } from './aiService';
import { notificationService } from './notificationService';
import logger from '../utils/logger';

export class WorkflowService {
  // User Registration Workflow
  static async processUserRegistration(userId: string) {
    try {
      // Update user status to pending
      await db.query(
        'UPDATE users SET registration_status = $1 WHERE id = $2',
        ['pending', userId]
      );

      // Notify admins about new registration
      const admins = await db.query(
        "SELECT id FROM users WHERE role = 'admin'"
      );

      for (const admin of admins.rows) {
        await notificationService.create({
          user_id: admin.id,
          type: 'registration',
          title: 'New User Registration',
          message: 'A new user has registered and requires approval',
          related_id: userId
        });
      }

      logger.info(`User registration workflow initiated for user: ${userId}`);
    } catch (error) {
      logger.error('Error in user registration workflow:', error);
      throw error;
    }
  }

  // Claim Processing Workflow
  static async processClaimSubmission(claimId: string) {
    try {
      // Get claim details
      const claimResult = await db.query(
        'SELECT * FROM claims WHERE id = $1',
        [claimId]
      );
      const claim = claimResult.rows[0];

      // Update claim status to ai_processing
      await db.query(
        'UPDATE claims SET status = $1, updated_at = NOW() WHERE id = $2',
        ['ai_processing', claimId]
      );

      // Send to AI for verification
      const aiVerdict = await AIService.processClaimWithAI(
        `${claim.title}. ${claim.description}`
      );

      // Store AI verdict
      const AIVerdict = require('../models/AIVerdict');
      const aiVerdictRecord = await AIVerdict.create({
        claim_id: claimId,
        verdict: aiVerdict.verdict,
        confidence_score: aiVerdict.confidence_score,
        explanation: aiVerdict.explanation,
        evidence_sources: aiVerdict.sources,
        ai_model_version: process.env.AI_MODEL_VERSION || 'gpt-4',
        approved_by_human: false
      });

      // Update claim with AI verdict
      await db.query(
        'UPDATE claims SET ai_verdict_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [aiVerdictRecord.id, 'human_review', claimId]
      );

      // Notify fact-checkers
      const factCheckers = await db.query(
        "SELECT user_id FROM fact_checkers WHERE verification_status = 'approved'"
      );

      for (const fc of factCheckers.rows) {
        await notificationService.create({
          user_id: fc.user_id,
          type: 'claim_status',
          title: 'New Claim for Review',
          message: `AI has processed claim: ${claim.title}`,
          related_id: claimId
        });
      }

      logger.info(`Claim processing workflow completed for claim: ${claimId}`);
      return aiVerdictRecord;
    } catch (error) {
      logger.error('Error in claim processing workflow:', error);
      // Update claim status to failed
      await db.query(
        'UPDATE claims SET status = $1, updated_at = NOW() WHERE id = $2',
        ['pending', claimId]
      );
      throw error;
    }
  }

  // Fact-Checker Approval Workflow
  static async processFactCheckerApproval(
    claimId: string,
    factCheckerId: string,
    approved: boolean,
    editedVerdict?: string,
    editedSources?: string[]
  ) {
    try {
      const claimResult = await db.query(
        'SELECT * FROM claims WHERE id = $1',
        [claimId]
      );
      const claim = claimResult.rows[0];

      if (approved) {
        // Get AI verdict
        const aiVerdictResult = await db.query(
          'SELECT * FROM ai_verdicts WHERE id = $1',
          [claim.ai_verdict_id]
        );
        const aiVerdict = aiVerdictResult.rows[0];

        // Create human verdict based on AI or edited
        const Verdict = require('../models/Verdict');
        const verdict = await Verdict.create({
          claim_id: claimId,
          fact_checker_id: factCheckerId,
          verdict: aiVerdict.verdict,
          explanation: editedVerdict || aiVerdict.explanation,
          evidence_sources: editedSources || aiVerdict.evidence_sources,
          ai_verdict_id: aiVerdict.id,
          approval_status: 'approved'
        });

        // Update claim status to published
        await db.query(
          'UPDATE claims SET status = $1, human_verdict_id = $2, published_at = NOW(), updated_at = NOW() WHERE id = $3',
          ['published', verdict.id, claimId]
        );

        // Mark AI verdict as approved
        await db.query(
          'UPDATE ai_verdicts SET approved_by_human = true WHERE id = $1',
          [aiVerdict.id]
        );

        // Notify user
        await notificationService.create({
          user_id: claim.user_id,
          type: 'claim_verdict',
          title: 'Verdict Published',
          message: `Your claim "${claim.title}" has been verified and published`,
          related_id: claimId
        });

        // Award points to user
        const pointsService = require('./pointsService');
        await pointsService.awardPoints(claim.user_id, 10, 'claim_published');

        logger.info(`Fact-checker approved claim: ${claimId}`);
        return verdict;
      } else {
        // Reject the claim
        await db.query(
          'UPDATE claims SET status = $1, updated_at = NOW() WHERE id = $2',
          ['rejected', claimId]
        );

        // Notify user
        await notificationService.create({
          user_id: claim.user_id,
          type: 'claim_verdict',
          title: 'Claim Rejected',
          message: `Your claim "${claim.title}" has been rejected`,
          related_id: claimId
        });

        logger.info(`Fact-checker rejected claim: ${claimId}`);
      }
    } catch (error) {
      logger.error('Error in fact-checker approval workflow:', error);
      throw error;
    }
  }

  // Trending Detection Workflow
  static async processTrendingDetection() {
    try {
      // Get recent claims
      const recentClaims = await db.query(`
        SELECT * FROM claims 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        AND status = 'published'
        ORDER BY submission_count DESC
        LIMIT 100
      `);

      if (recentClaims.rows.length === 0) {
        logger.info('No recent claims for trending detection');
        return;
      }

      // Use AI to detect trending topics
      const trendingTopics = await AIService.detectTrendingTopics(
        recentClaims.rows,
        '24 hours'
      );

      // Store trending topics
      const TrendingTopic = require('../models/TrendingTopic');
      for (const topic of trendingTopics) {
        await TrendingTopic.create({
          topic_name: topic.topicName,
          category: topic.category,
          engagement_score: topic.engagementScore,
          related_claims: topic.relatedClaimIds,
          detected_patterns: topic.patterns
        });

        // Generate blog content if engagement is high
        if (topic.engagementScore > 80) {
          const relatedClaims = await db.query(
            'SELECT * FROM claims WHERE id = ANY($1)',
            [topic.relatedClaimIds]
          );

          const blogContent = await AIService.generateBlogContent(
            topic.topicName,
            relatedClaims.rows,
            'analysis'
          );

          const Blog = require('../models/Blog');
          await Blog.create({
            title: `Trending: ${topic.topicName}`,
            content: blogContent,
            category: topic.category,
            author_id: null, // AI generated
            is_trending: true,
            engagement_score: topic.engagementScore
          });
        }
      }

      logger.info(`Trending detection completed. Found ${trendingTopics.length} topics`);
    } catch (error) {
      logger.error('Error in trending detection workflow:', error);
      throw error;
    }
  }

  // Daily Points Reset Workflow
  static async processDailyPointsReset() {
    try {
      // Get users who haven't engaged in 24 hours
      const inactiveUsers = await db.query(`
        SELECT id FROM users 
        WHERE last_login < NOW() - INTERVAL '24 hours'
        AND points > 0
      `);

      // Reset points for inactive users
      for (const user of inactiveUsers.rows) {
        await db.query(
          'UPDATE users SET points = 0 WHERE id = $1',
          [user.id]
        );

        await notificationService.create({
          user_id: user.id,
          type: 'system',
          title: 'Points Reset',
          message: 'Your points have been reset due to inactivity. Engage with the app to start earning again!',
          related_id: null
        });
      }

      logger.info(`Reset points for ${inactiveUsers.rows.length} inactive users`);
    } catch (error) {
      logger.error('Error in daily points reset workflow:', error);
      throw error;
    }
  }
}

export default WorkflowService;
