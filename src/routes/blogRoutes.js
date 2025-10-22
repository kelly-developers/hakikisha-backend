const express = require('express');
const blogController = require('../controllers/blogController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

console.log('✓ Blog routes module loaded');

// Public routes
router.get('/', (req, res, next) => {
  console.log('GET /api/v1/blogs - Public blogs endpoint hit');
  next();
}, blogController.getBlogs);

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

// User's blogs
router.get('/user/my-blogs', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.getMyBlogs);

// Test endpoint
router.get('/test/endpoint', (req, res) => {
  res.json({
    success: true,
    message: 'Blog routes are working!',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;