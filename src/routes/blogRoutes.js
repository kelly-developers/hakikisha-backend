const express = require('express');
const blogController = require('../controllers/blogController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes - FIXED: These should come first
router.get('/', blogController.getBlogs);
router.get('/trending', blogController.getTrendingBlogs);
router.get('/search', blogController.searchBlogs);
router.get('/stats', blogController.getBlogStats);
router.get('/:id', blogController.getBlog);

// Protected routes (fact-checkers and admins only)
router.post('/', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.createBlog);
router.put('/:id', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.updateBlog);
router.delete('/:id', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.deleteBlog);
router.post('/:id/publish', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.publishBlog);
router.post('/generate/ai', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.generateAIBlog);

// FIXED: Add the missing my-blogs endpoint
router.get('/user/my-blogs', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.getMyBlogs);

module.exports = router;