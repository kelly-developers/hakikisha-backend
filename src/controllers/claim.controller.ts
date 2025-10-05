import { Request, Response, NextFunction } from 'express';
import { ClaimService } from '../services/claim.service';
import { claimSchema, searchSchema } from '../utils/validators';

export class ClaimController {
  static async submitClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = claimSchema.parse(req.body);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const claim = await ClaimService.createClaim(
        req.user.userId,
        validated.title,
        validated.description,
        validated.category,
        validated.media_type,
        validated.media_url
      );

      res.status(201).json({
        success: true,
        message: 'Claim submitted successfully',
        data: claim
      });
    } catch (error) {
      next(error);
    }
  }

  static async getClaims(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, category, page = 1, limit = 20 } = req.query;

      const result = await ClaimService.getClaims(
        { status, category },
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

  static async getClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const claim = await ClaimService.getClaimById(id);

      res.json({
        success: true,
        data: claim
      });
    } catch (error: any) {
      if (error.message === 'Claim not found') {
        return res.status(404).json({
          success: false,
          error: 'Claim not found'
        });
      }
      next(error);
    }
  }

  static async getTrendingClaims(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = 10 } = req.query;

      const claims = await ClaimService.getTrendingClaims(parseInt(limit as string));

      res.json({
        success: true,
        data: claims
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateClaim(req: Request, res: Response, next: NextFunction) {
    try {
      // Implementation for updating claim details
      res.json({
        success: true,
        message: 'Claim updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteClaim(req: Request, res: Response, next: NextFunction) {
    try {
      // Implementation for deleting claim
      res.json({
        success: true,
        message: 'Claim deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateClaimStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, factCheckerId } = req.body;

      const claim = await ClaimService.updateClaimStatus(id, status, factCheckerId);

      res.json({
        success: true,
        message: 'Claim status updated successfully',
        data: claim
      });
    } catch (error: any) {
      if (error.message === 'Claim not found') {
        return res.status(404).json({
          success: false,
          error: 'Claim not found'
        });
      }
      next(error);
    }
  }
}
