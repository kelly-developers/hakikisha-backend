const express = require('express');
const blogController = require('../controllers/blogController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

console.log('✅ Blog routes module loaded successfully');

// Public routes - no authentication required
router.get('/', (req, res, next) => {
  console.log('📝 GET /api/v1/blogs - Public blogs endpoint hit');
  next();
}, blogController.getBlogs);

router.get('/trending', (req, res, next) => {
  console.log('📝 GET /api/v1/blogs/trending - Trending blogs endpoint hit');
  next();
}, blogController.getTrendingBlogs);

router.get('/search', (req, res, next) => {
  console.log('📝 GET /api/v1/blogs/search - Search blogs endpoint hit');
  next();
}, blogController.searchBlogs);

router.get('/stats', (req, res, next) => {
  console.log('📝 GET /api/v1/blogs/stats - Blog stats endpoint hit');
  next();
}, blogController.getBlogStats);

router.get('/:id', (req, res, next) => {
  console.log(`📝 GET /api/v1/blogs/${req.params.id} - Get blog by ID endpoint hit`);
  next();
}, blogController.getBlog);

// Protected routes (fact-checkers and admins only)
router.post('/', (req, res, next) => {
  console.log('📝 POST /api/v1/blogs - Create blog endpoint hit');
  console.log('Request body:', { 
    ...req.body, 
    content: req.body.content ? `${req.body.content.substring(0, 100)}...` : 'No content' 
  });
  next();
}, authMiddleware, requireRole(['fact_checker', 'admin']), blogController.createBlog);

router.put('/:id', (req, res, next) => {
  console.log(`📝 PUT /api/v1/blogs/${req.params.id} - Update blog endpoint hit`);
  next();
}, authMiddleware, requireRole(['fact_checker', 'admin']), blogController.updateBlog);

router.delete('/:id', (req, res, next) => {
  console.log(`📝 DELETE /api/v1/blogs/${req.params.id} - Delete blog endpoint hit`);
  next();
}, authMiddleware, requireRole(['fact_checker', 'admin']), blogController.deleteBlog);

// Publish blog route - FIXED
router.post('/:id/publish', (req, res, next) => {
  console.log(`📝 POST /api/v1/blogs/${req.params.id}/publish - Publish blog endpoint hit`);
  next();
}, authMiddleware, requireRole(['fact_checker', 'admin']), blogController.publishBlog);

router.post('/generate/ai', (req, res, next) => {
  console.log('📝 POST /api/v1/blogs/generate/ai - Generate AI blog endpoint hit');
  next();
}, authMiddleware, requireRole(['fact_checker', 'admin']), blogController.generateAIBlog);

// User's blogs
router.get('/user/my-blogs', (req, res, next) => {
  console.log('📝 GET /api/v1/blogs/user/my-blogs - My blogs endpoint hit');
  next();
}, authMiddleware, requireRole(['fact_checker', 'admin']), blogController.getMyBlogs);

// Test endpoint
router.get('/test/endpoint', (req, res) => {
  console.log('📝 GET /api/v1/blogs/test/endpoint - Test endpoint hit');
  res.json({
    success: true,
    message: 'Blog routes are working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/v1/blogs',
      'GET /api/v1/blogs/trending',
      'GET /api/v1/blogs/search',
      'GET /api/v1/blogs/stats',
      'GET /api/v1/blogs/:id',
      'POST /api/v1/blogs',
      'GET /api/v1/blogs/user/my-blogs',
      'PUT /api/v1/blogs/:id',
      'DELETE /api/v1/blogs/:id',
      'POST /api/v1/blogs/:id/publish'
    ]
  });
});

// Health check for blog routes
router.get('/health/check', (req, res) => {
  res.json({
    success: true,
    message: 'Blog routes are healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;