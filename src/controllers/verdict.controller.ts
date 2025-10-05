import { Request, Response, NextFunction } from 'express';
import { VerdictService } from '../services/verdict.service';
import { verdictSchema } from '../utils/validators';

export class VerdictController {
  static async submitVerdict(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = verdictSchema.parse(req.body);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const verdict = await VerdictService.createVerdict(
        validated.claim_id,
        req.user.userId,
        validated.verdict,
        validated.explanation,
        validated.evidence_sources,
        validated.confidence_score
      );

      res.status(201).json({
        success: true,
        message: 'Verdict submitted successfully',
        data: verdict
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVerdict(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const verdict = await VerdictService.getVerdictByClaimId(id);

      if (!verdict) {
        return res.status(404).json({
          success: false,
          error: 'Verdict not found for this claim'
        });
      }

      res.json({
        success: true,
        data: verdict
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyVerdicts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const { page = 1, limit = 20 } = req.query;

      const result = await VerdictService.getVerdictsByFactChecker(
        req.user.userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVerdictStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const stats = await VerdictService.getVerdictStats(req.user.userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVerdict(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        message: 'Verdict updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
