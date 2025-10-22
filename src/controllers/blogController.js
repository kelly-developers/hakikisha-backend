const blogService = require('../services/BlogService');
const logger = require('../utils/logger');

class BlogController {
  /**
   * Get all published blogs
   */
  async getBlogs(req, res) {
    try {
      const { category, limit = 10, offset = 0 } = req.query;
      
      const blogs = await blogService.getBlogs({
        category,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: blogs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: blogs.length
        }
      });
    } catch (error) {
      logger.error('Get blogs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blogs',
        message: error.message
      });
    }
  }

  /**
   * Get single blog by ID
   */
  async getBlog(req, res) {
    try {
      const { id } = req.params;
      
      const blog = await blogService.getBlogById(id);
      
      // Increment view count
      await blogService.incrementViewCount(id);

      res.json({
        success: true,
        data: blog
      });
    } catch (error) {
      logger.error('Get blog error:', error);
      if (error.message === 'Blog not found') {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blog',
        message: error.message
      });
    }
  }

  /**
   * Get trending blogs
   */
  async getTrendingBlogs(req, res) {
    try {
      const { limit = 5 } = req.query;
      
      const blogs = await blogService.getTrendingBlogs(parseInt(limit));

      res.json({
        success: true,
        data: blogs
      });
    } catch (error) {
      logger.error('Get trending blogs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending blogs',
        message: error.message
      });
    }
  }

  /**
   * Create new blog
   */
  async createBlog(req, res) {
    try {
      const {
        title,
        content,
        category = 'fact_check',
        source_claim_ids = [],
        featured_image = null,
        read_time = 5,
        excerpt = null,
        status = 'draft'
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: 'Title and content are required'
        });
      }

      const blogData = {
        title,
        content,
        author_id: req.user.userId,
        category,
        source_claim_ids,
        featured_image,
        read_time,
        excerpt,
        status
      };

      const blog = await blogService.createBlog(blogData);

      res.status(201).json({
        success: true,
        data: blog,
        message: status === 'published' ? 'Blog published successfully' : 'Blog created as draft'
      });
    } catch (error) {
      logger.error('Create blog error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create blog',
        message: error.message
      });
    }
  }

  /**
   * Update blog
   */
  async updateBlog(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check if user owns the blog or is admin
      const existingBlog = await blogService.getBlogById(id);
      if (existingBlog.author_id !== req.user.userId && !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this blog'
        });
      }

      const blog = await blogService.updateBlog(id, updateData);

      res.json({
        success: true,
        data: blog,
        message: 'Blog updated successfully'
      });
    } catch (error) {
      logger.error('Update blog error:', error);
      if (error.message === 'Blog not found') {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to update blog',
        message: error.message
      });
    }
  }

  /**
   * Delete blog
   */
  async deleteBlog(req, res) {
    try {
      const { id } = req.params;

      // Check if user owns the blog or is admin
      const existingBlog = await blogService.getBlogById(id);
      if (existingBlog.author_id !== req.user.userId && !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this blog'
        });
      }

      await blogService.deleteBlog(id);

      res.json({
        success: true,
        message: 'Blog deleted successfully'
      });
    } catch (error) {
      logger.error('Delete blog error:', error);
      if (error.message === 'Blog not found') {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to delete blog',
        message: error.message
      });
    }
  }

  /**
   * Publish blog
   */
  async publishBlog(req, res) {
    try {
      const { id } = req.params;

      // Check if user owns the blog or is admin
      const existingBlog = await blogService.getBlogById(id);
      if (existingBlog.author_id !== req.user.userId && !req.user.roles.includes('admin')) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to publish this blog'
        });
      }

      const blog = await blogService.publishBlog(id);

      res.json({
        success: true,
        data: blog,
        message: 'Blog published successfully'
      });
    } catch (error) {
      logger.error('Publish blog error:', error);
      if (error.message === 'Blog not found') {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to publish blog',
        message: error.message
      });
    }
  }

  /**
   * Search blogs
   */
  async searchBlogs(req, res) {
    try {
      const { q, limit = 10, offset = 0 } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required'
        });
      }

      const blogs = await blogService.searchBlogs(q, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      res.json({
        success: true,
        data: blogs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: blogs.length
        }
      });
    } catch (error) {
      logger.error('Search blogs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search blogs',
        message: error.message
      });
    }
  }

  /**
   * Generate AI blog
   */
  async generateAIBlog(req, res) {
    try {
      const { topic, claims, tone, length } = req.body;

      if (!topic) {
        return res.status(400).json({
          success: false,
          error: 'Topic is required'
        });
      }

      const blog = await blogService.generateAIBlog({
        topic,
        claims,
        tone,
        length,
        author_id: req.user.userId
      });

      res.status(201).json({
        success: true,
        data: blog,
        message: 'AI blog generated successfully'
      });
    } catch (error) {
      logger.error('Generate AI blog error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate AI blog',
        message: error.message
      });
    }
  }

  /**
   * Get my blogs (current user's blogs)
   */
  async getMyBlogs(req, res) {
    try {
      const { status, limit = 10, offset = 0 } = req.query;
      
      let blogs;
      if (status === 'draft') {
        blogs = await blogService.getDraftBlogs(req.user.userId);
      } else {
        blogs = await blogService.getBlogsByAuthor(req.user.userId, {
          limit: parseInt(limit),
          offset: parseInt(offset)
        });
      }

      res.json({
        success: true,
        data: blogs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: blogs.length
        }
      });
    } catch (error) {
      logger.error('Get my blogs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch your blogs',
        message: error.message
      });
    }
  }

  /**
   * Get blog statistics
   */
  async getBlogStats(req, res) {
    try {
      const stats = await blogService.getBlogStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get blog stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch blog statistics',
        message: error.message
      });
    }
  }
}

module.exports = new BlogController();