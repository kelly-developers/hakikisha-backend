const express = require('express');
const searchController = require('../controllers/searchController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Search routes (some public, some protected)
router.get('/claims', searchController.searchClaims);
router.get('/verdicts', searchController.searchVerdicts);
router.get('/blogs', searchController.searchBlogs);
router.get('/suggestions', searchController.getSearchSuggestions);

// Protected search history routes
router.use(authMiddleware);
router.get('/history', searchController.getSearchHistory);
router.delete('/history', searchController.clearSearchHistory);

module.exports = router;