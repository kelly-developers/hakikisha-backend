const express = require('express');
const blogController = require('../controllers/blogController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', blogController.getBlogs);
router.get('/:blogId', blogController.getBlog);

// Protected routes (fact-checkers and admins only)
router.post('/create', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.createBlog);
router.put('/:id', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.updateBlog);
router.delete('/:id', authMiddleware, requireRole(['fact_checker', 'admin']), blogController.deleteBlog);

module.exports = router;
