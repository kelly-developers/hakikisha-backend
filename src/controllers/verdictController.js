const Verdict = require('../models/Verdict');
const Claim = require('../models/Claim');
const AIVerdict = require('../models/AIVerdict');
const Notification = require('../models/Notification');
const FactCheckerActivity = require('../models/FactCheckerActivity');
const logger = require('../utils/logger');
const { validateVerdict } = require('../utils/validators');
const db = require('../config/database');

class VerdictController {
  async submitVerdict(req, res, next) {
    try {
      const { error } = validateVerdict(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const {
        claim_id,
        verdict,
        explanation,
        evidence_sources,
        approve_ai_verdict = false,
        review_notes = '',
        time_spent = 0
      } = req.body;

      // Get claim details
      const claim = await Claim.findById(claim_id);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      // Check if claim is assigned to this fact-checker
      if (claim.assigned_fact_checker_id !== req.user.userId) {
        return res.status(403).json({ error: 'Claim not assigned to you' });
      }

      let ai_verdict_id = null;
      if (approve_ai_verdict && claim.ai_verdict_id) {
        ai_verdict_id = claim.ai_verdict_id;
      }

      // Create verdict
      const verdictData = {
        claim_id,
        fact_checker_id: req.user.userId,
        verdict,
        explanation,
        evidence_sources,
        ai_verdict_id,
        review_notes,
        time_spent
      };

      const newVerdict = await Verdict.create(verdictData);

      // Update claim status
      await Claim.updateStatus(claim_id, 'human_approved');

      // Log activity
      await FactCheckerActivity.create({
        fact_checker_id: req.user.userId,
        activity_type: 'verdict_submission',
        claim_id,
        verdict_id: newVerdict.id,
        start_time: new Date(Date.now() - time_spent * 1000),
        end_time: new Date()
      });

      // Notify user with verdict details
      await Notification.create({
        user_id: claim.user_id,
        type: 'verdict_ready',
        title: 'Your claim has been verified',
        message: `A fact-checker has reviewed your claim: "${claim.title}". Verdict: ${verdict}`,
        related_entity_type: 'claim',
        related_entity_id: claim_id,
        is_read: false
      });

      logger.info(`Verdict submitted for claim ${claim_id} by fact-checker ${req.user.userId}`);

      res.status(201).json({
        message: 'Verdict submitted successfully',
        verdict: newVerdict,
        claim_status: 'human_approved'
      });

    } catch (error) {
      logger.error('Verdict submission error:', error);
      next(error);
    }
  }

  async getVerdict(req, res, next) {
    try {
      const { id } = req.params;
      const verdict = await Verdict.findByClaimId(id);

      if (!verdict) {
        return res.status(404).json({ error: 'Verdict not found' });
      }

      // Check permissions
      const claim = await Claim.findById(id);
      if (claim.user_id !== req.user.userId && 
          !['admin', 'fact_checker'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ verdict });

    } catch (error) {
      logger.error('Get verdict error:', error);
      next(error);
    }
  }

  async getMyVerdicts(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const verdicts = await Verdict.findByFactChecker(req.user.userId, limit, offset);
      
      // Get total count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM verdicts WHERE fact_checker_id = $1`;
      const countResult = await db.query(countQuery, [req.user.userId]);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        verdicts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get my verdicts error:', error);
      next(error);
    }
  }

  async getVerdictStats(req, res, next) {
    try {
      const { timeframe = '30 days' } = req.query;
      
      const stats = await Verdict.getStats(req.user.userId, timeframe);

      res.json({
        stats,
        timeframe,
        message: 'Verdict statistics retrieved successfully'
      });

    } catch (error) {
      logger.error('Get verdict stats error:', error);
      next(error);
    }
  }

  async updateVerdict(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get verdict to check ownership
      const verdict = await Verdict.findById(id);
      if (!verdict) {
        return res.status(404).json({ error: 'Verdict not found' });
      }

      if (verdict.fact_checker_id !== req.user.userId) {
        return res.status(403).json({ error: 'Not authorized to update this verdict' });
      }

      const updatedVerdict = await Verdict.update(id, updates);

      res.json({
        message: 'Verdict updated successfully',
        verdict: updatedVerdict
      });

    } catch (error) {
      logger.error('Update verdict error:', error);
      next(error);
    }
  }

  async editAIVerdict(req, res, next) {
    try {
      const { claimId } = req.params;
      const { verdict, explanation, evidence_sources } = req.body;

      // Check if user is a fact-checker
      if (req.user.role !== 'fact_checker' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only fact-checkers can edit AI verdicts' });
      }

      // Get claim
      const claim = await Claim.findById(claimId);
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      if (!claim.ai_verdict_id) {
        return res.status(404).json({ error: 'No AI verdict found for this claim' });
      }

      // Update AI verdict with fact-checker's edits
      const updatedVerdict = await AIVerdict.updateByClaimId(
        claimId,
        {
          verdict,
          explanation,
          evidence_sources
        },
        req.user.userId
      );

      // Update claim status
      await Claim.updateStatus(claimId, 'verified', req.user.userId);

      // Send notification to user with verdict details
      await Notification.create({
        user_id: claim.user_id,
        type: 'verdict_ready',
        title: 'Your claim has been verified',
        message: `A fact-checker has reviewed and updated the verdict for your claim: "${claim.title}". Verdict: ${verdict}`,
        related_entity_type: 'claim',
        related_entity_id: claimId,
        is_read: false
      });

      logger.info(`AI verdict edited for claim ${claimId} by fact-checker ${req.user.userId}`);

      res.json({
        message: 'AI verdict updated successfully',
        verdict: updatedVerdict,
        claim_status: 'verified'
      });

    } catch (error) {
      logger.error('Edit AI verdict error:', error);
      next(error);
    }
  }

  async getPendingAIVerdicts(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Check if user is a fact-checker
      if (req.user.role !== 'fact_checker' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const query = `
        SELECT c.id, c.title, c.description, c.category, c.status,
               av.id as ai_verdict_id, av.verdict, av.explanation, 
               av.confidence_score, av.evidence_sources, av.created_at as verdict_date,
               av.is_edited_by_human
        FROM claims c
        INNER JOIN ai_verdicts av ON c.ai_verdict_id = av.id
        WHERE av.is_edited_by_human = false
          AND c.status IN ('ai_processed', 'completed')
        ORDER BY av.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM claims c
        INNER JOIN ai_verdicts av ON c.ai_verdict_id = av.id
        WHERE av.is_edited_by_human = false
          AND c.status IN ('ai_processed', 'completed')
      `;

      const [claims, countResult] = await Promise.all([
        db.query(query, [limit, offset]),
        db.query(countQuery)
      ]);

      res.json({
        claims: claims.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          pages: Math.ceil(countResult.rows[0].total / limit)
        }
      });

    } catch (error) {
      logger.error('Get pending AI verdicts error:', error);
      next(error);
    }
  }
}

module.exports = new VerdictController();