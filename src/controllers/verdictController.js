const Verdict = require('../models/Verdict');
const Claim = require('../models/Claim');
const AIVerdict = require('../models/AIVerdict');
const Notification = require('../models/Notification');
const FactCheckerActivity = require('../models/FactCheckerActivity');
const logger = require('../utils/logger');
const { validateVerdict } = require('../utils/validators');

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

      // Notify user
      await Notification.create({
        user_id: claim.user_id,
        type: 'verdict_ready',
        title: 'Your claim has been verified',
        message: `Fact-checkers have reviewed your claim: "${claim.title}"`,
        related_entity_type: 'claim',
        related_entity_id: claim_id
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
      const total = await Verdict.countByFactChecker(req.user.userId);

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
}

module.exports = new VerdictController();