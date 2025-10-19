const logger = require('../utils/logger');
const BlogService = require('../services/blogService');

class BlogController {
  async getBlogs(req, res) {
    try {
      console.log('Get Blogs Request Received');
      const { category, limit = 10, page = 1, author } = req.query;
      
      const blogs = await BlogService.getBlogs({
        category,
        author,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      return res.json({
        success: true,
        message: 'Blogs retrieved successfully',
        blogs: blogs,
        count: blogs.length
      });
    } catch (error) {
      logger.error('Get blogs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get blogs'
      });
    }
  }

  async getBlog(req, res) {
    try {
      console.log('Get Blog Request Received:', req.params.id);
      const { id } = req.params;

      const blog = await BlogService.getBlogById(id);
      
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      await BlogService.incrementViewCount(id);

      return res.json({
        success: true,
        message: 'Blog retrieved successfully',
        blog: blog
      });
    } catch (error) {
      logger.error('Get blog error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get blog'
      });
    }
  }

  async getTrendingBlogs(req, res) {
    try {
      console.log('Get Trending Blogs Request Received');
      const { limit = 5 } = req.query;

      const blogs = await BlogService.getTrendingBlogs(parseInt(limit));

      return res.json({
        success: true,
        message: 'Trending blogs retrieved successfully',
        blogs: blogs,
        count: blogs.length
      });
    } catch (error) {
      logger.error('Get trending blogs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get trending blogs'
      });
    }
  }

  async createBlog(req, res) {
    try {
      console.log('Create Blog Request Received');
      console.log('User:', req.user);
      console.log('Request body:', req.body);

      const { title, content, category, excerpt, featured_image, read_time } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          error: 'Title and content are required'
        });
      }

      const blogData = {
        title,
        content,
        excerpt,
        author_id: req.user.userId,
        author_type: 'human',
        category: category || 'fact_check',
        featured_image: featured_image || null,
        read_time: read_time || 5,
        status: 'published' // Auto-publish for now
      };

      const blog = await BlogService.createBlog(blogData);

      return res.status(201).json({
        success: true,
        message: 'Blog created successfully',
        blog: blog
      });
    } catch (error) {
      logger.error('Create blog error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create blog'
      });
    }
  }

  async updateBlog(req, res) {
    try {
      console.log('Update Blog Request Received:', req.params.id);
      const { id } = req.params;
      const updateData = req.body;

      const blog = await BlogService.updateBlog(id, updateData);
      
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      return res.json({
        success: true,
        message: 'Blog updated successfully',
        blog: blog
      });
    } catch (error) {
      logger.error('Update blog error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update blog'
      });
    }
  }

  async deleteBlog(req, res) {
    try {
      console.log('Delete Blog Request Received:', req.params.id);
      const { id } = req.params;

      const deleted = await BlogService.deleteBlog(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      return res.json({
        success: true,
        message: 'Blog deleted successfully'
      });
    } catch (error) {
      logger.error('Delete blog error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete blog'
      });
    }
  }

  async generateAIBlog(req, res) {
    try {
      console.log('Generate AI Blog Request Received');
      const { topic, claims, tone = 'neutral', length = 'medium' } = req.body;

      if (!topic) {
        return res.status(400).json({
          success: false,
          error: 'Topic is required for AI blog generation'
        });
      }

      const aiBlog = await BlogService.generateAIBlog({
        topic,
        claims: claims || [],
        tone,
        length,
        author_id: req.user.userId
      });

      return res.json({
        success: true,
        message: 'AI blog generated successfully',
        blog: aiBlog
      });
    } catch (error) {
      logger.error('Generate AI blog error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate AI blog'
      });
    }
  }

  async getMyBlogs(req, res) {
    try {
      console.log('Get My Blogs Request Received');
      const { limit = 10, page = 1 } = req.query;

      const blogs = await BlogService.getBlogsByAuthor(req.user.userId, {
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      return res.json({
        success: true,
        message: 'User blogs retrieved successfully',
        blogs: blogs,
        count: blogs.length
      });
    } catch (error) {
      logger.error('Get my blogs error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user blogs'
      });
    }
  }
}

const blogController = new BlogController();
module.exports = blogController;