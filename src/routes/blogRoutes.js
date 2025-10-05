const express = require('express');
const blogController = require('../controllers/blogController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', blogController.getBlogs);
router.get('/:id', blogController.getBlog);
router.get('/trending', blogController.getTrendingBlogs);

// Protected routes (fact-checkers and admins only)
router.use(authMiddleware);

router.post('/', requireRole(['fact_checker', 'admin']), blogController.createBlog);
router.put('/:id', requireRole(['fact_checker', 'admin']), blogController.updateBlog);
router.delete('/:id', requireRole(['fact_checker', 'admin']), blogController.deleteBlog);
router.post('/ai-generate', requireRole(['fact_checker', 'admin']), blogController.generateAIBlog);

module.exports = router;