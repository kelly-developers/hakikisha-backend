import { Router } from 'express';
import { SearchController } from '../controllers/search.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public search routes
router.get('/claims', SearchController.searchClaims);
router.get('/verdicts', SearchController.searchVerdicts);
router.get('/blogs', SearchController.searchBlogs);
router.get('/suggestions', SearchController.getSearchSuggestions);

// Protected search history routes
router.get('/history', authenticate, SearchController.getSearchHistory);
router.delete('/history', authenticate, SearchController.clearSearchHistory);

export default router;
