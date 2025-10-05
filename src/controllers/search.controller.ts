import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service';

export class SearchController {
  static async searchClaims(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, category, page = 1, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const result = await SearchService.searchClaims(
        q,
        category as string,
        parseInt(page as string),
        parseInt(limit as string),
        req.user?.userId
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchVerdicts(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const result = await SearchService.searchVerdicts(
        q,
        parseInt(page as string),
        parseInt(limit as string),
        req.user?.userId
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchBlogs(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, page = 1, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const result = await SearchService.searchBlogs(
        q,
        parseInt(page as string),
        parseInt(limit as string),
        req.user?.userId
      );

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSearchSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const { q, limit = 5 } = req.query;

      if (!q || typeof q !== 'string') {
        return res.json({
          success: true,
          data: []
        });
      }

      const suggestions = await SearchService.getSearchSuggestions(
        q,
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSearchHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const result = await db.query(
        `SELECT search_query, search_type, results_count, created_at
         FROM search_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [req.user.userId]
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }

  static async clearSearchHistory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      await db.query(
        'DELETE FROM search_logs WHERE user_id = $1',
        [req.user.userId]
      );

      res.json({
        success: true,
        message: 'Search history cleared successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
