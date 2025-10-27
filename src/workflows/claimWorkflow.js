const Claim = require('../models/Claim');
const AIVerdict = require('../models/AIVerdict');
const Verdict = require('../models/Verdict');
const { processClaimWithAI } = require('../services/poeAIService');
const { sendNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Complete claim processing workflow
 * 1. User submits claim
 * 2. AI automatically processes and responds with disclaimer
 * 3. Fact-checker can view AI response
 * 4. Fact-checker can approve or edit AI response
 * 5. If edited, responsibility transfers to CRECO (disclaimer removed)
 */

class ClaimWorkflow {
  /**
   * Process a new claim with automatic AI response
   */
  static async processNewClaim(claimId, claimText) {
    try {
      logger.info(`Starting automatic AI processing for claim: ${claimId}`);
      
      const claim = await Claim.findById(claimId);
      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }

      // Get AI verdict with disclaimer
      const aiResult = await processClaimWithAI(claimText);
      
      // Create AI verdict with disclaimer
      const aiVerdict = await AIVerdict.create({
        claim_id: claimId,
        verdict: aiResult.verdict,
        confidence_score: aiResult.confidence_score,
        explanation: aiResult.explanation,
        evidence_sources: aiResult.sources,
        ai_model_version: 'poe-web-search',
        disclaimer: 'This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers.',
        is_edited_by_human: false
      });

      // Update claim with AI verdict
      await Claim.update(claimId, {
        ai_verdict_id: aiVerdict.id,
        status: 'ai_processed'
      });

      // Notify user that AI has responded
      await sendNotification({
        user_id: claim.user_id,
        type: 'claim_ai_processed',
        title: 'Your claim has been processed by AI',
        message: `We've provided an initial AI-generated response to your claim. A fact-checker will review it soon.`,
        related_id: claimId
      });

      logger.info(`AI processing completed for claim ${claimId}`);
      
      return {
        success: true,
        aiVerdictId: aiVerdict.id,
        claimStatus: 'ai_processed'
      };

    } catch (error) {
      logger.error(`AI processing failed for claim ${claimId}:`, error);
      throw error;
    }
  }

  /**
   * Fact-checker approves AI verdict without editing
   * Keeps AI disclaimer and responsibility
   */
  static async approveAIVerdict(claimId, factCheckerId) {
    try {
      logger.info(`Fact-checker ${factCheckerId} approving AI verdict for claim ${claimId}`);
      
      const claim = await Claim.findById(claimId);
      if (!claim || !claim.ai_verdict_id) {
        throw new Error('Claim or AI verdict not found');
      }

      // Update claim status to approved
      await Claim.updateStatus(claimId, 'approved', factCheckerId);

      // Notify user
      await sendNotification({
        user_id: claim.user_id,
        type: 'claim_approved',
        title: 'Your claim has been verified',
        message: 'A fact-checker has reviewed and approved the AI response to your claim.',
        related_id: claimId
      });

      logger.info(`AI verdict approved for claim ${claimId}`);
      
      return {
        success: true,
        status: 'approved',
        responsibility: 'ai'
      };

    } catch (error) {
      logger.error(`Approving AI verdict failed for claim ${claimId}:`, error);
      throw error;
    }
  }

  /**
   * Fact-checker edits AI verdict
   * Removes disclaimer and transfers responsibility to CRECO
   */
  static async editAIVerdict(claimId, factCheckerId, editedData) {
    try {
      logger.info(`Fact-checker ${factCheckerId} editing AI verdict for claim ${claimId}`);
      
      const claim = await Claim.findById(claimId);
      if (!claim || !claim.ai_verdict_id) {
        throw new Error('Claim or AI verdict not found');
      }

      // Update AI verdict to mark as edited by human
      await AIVerdict.update(claim.ai_verdict_id, {
        verdict: editedData.verdict,
        explanation: editedData.explanation,
        evidence_sources: editedData.sources,
        is_edited_by_human: true,
        edited_by_fact_checker_id: factCheckerId,
        edited_at: new Date()
      }, factCheckerId);

      // Remove disclaimer since human edited it
      const updatedVerdict = await AIVerdict.findByClaimId(claimId);
      
      // Update claim status
      await Claim.updateStatus(claimId, 'approved', factCheckerId);

      // Notify user that verdict was edited by fact-checker
      await sendNotification({
        user_id: claim.user_id,
        type: 'claim_approved',
        title: 'Your claim has been verified',
        message: 'A fact-checker has reviewed and updated the verdict for your claim.',
        related_id: claimId
      });

      logger.info(`AI verdict edited for claim ${claimId}, responsibility transferred to CRECO`);
      
      return {
        success: true,
        status: 'approved',
        responsibility: 'creco',
        editedBy: factCheckerId
      };

    } catch (error) {
      logger.error(`Editing AI verdict failed for claim ${claimId}:`, error);
      throw error;
    }
  }

  /**
   * Fact-checker creates original verdict (bypassing AI)
   */
  static async createHumanVerdict(claimId, factCheckerId, verdictData) {
    try {
      logger.info(`Fact-checker ${factCheckerId} creating human verdict for claim ${claimId}`);
      
      const claim = await Claim.findById(claimId);
      if (!claim) {
        throw new Error('Claim not found');
      }

      // Create human verdict with CRECO responsibility
      const verdict = await Verdict.create({
        claim_id: claimId,
        fact_checker_id: factCheckerId,
        verdict: verdictData.verdict,
        explanation: verdictData.explanation,
        evidence_sources: verdictData.sources,
        responsibility: 'creco',
        is_final: true
      });

      // Update claim with human verdict
      await Claim.update(claimId, {
        human_verdict_id: verdict.id,
        status: 'approved',
        assigned_fact_checker_id: factCheckerId
      });

      // Notify user
      await sendNotification({
        user_id: claim.user_id,
        type: 'claim_approved',
        title: 'Your claim has been verified',
        message: 'A fact-checker has provided a verdict for your claim.',
        related_id: claimId
      });

      logger.info(`Human verdict created for claim ${claimId}`);
      
      return {
        success: true,
        verdictId: verdict.id,
        status: 'approved',
        responsibility: 'creco'
      };

    } catch (error) {
      logger.error(`Creating human verdict failed for claim ${claimId}:`, error);
      throw error;
    }
  }
}

module.exports = ClaimWorkflow;
