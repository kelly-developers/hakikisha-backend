const blogService = require('../services/blogService');
const logger = require('../utils/logger');

class BlogController {
  async getBlogs(req, res) {
    try {
      console.log('📝 BlogController - Getting blogs with query:', req.query);
      
      const { category, limit = 10, offset = 0, author } = req.query;
      
      const options = {
        category,
        limit: parseInt(limit),
        offset: parseInt(offset),
        author
      };

      const blogs = await blogService.getBlogs(options);
      
      console.log(`📝 BlogController - Successfully retrieved ${blogs.length} blogs`);
      
      res.json({
        success: true,
        data: blogs,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: blogs.length
        }
      });
    } catch (error) {
      console.error('❌ BlogController - Get blogs error:', error);
      logger.error('BlogController - Get blogs error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve blogs',
        message: error.message
      });
    }
  }

  async getBlog(req, res) {
    try {
      const { id } = req.params;
      console.log(`📝 BlogController - Getting blog by ID: ${id}`);
      
      const blog = await blogService.getBlogById(id);
      
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      // Increment view count
      await blogService.incrementViewCount(id);
      
      console.log(`📝 BlogController - Successfully retrieved blog: ${blog.title}`);
      
      res.json({
        success: true,
        data: blog
      });
    } catch (error) {
      console.error('❌ BlogController - Get blog error:', error);
      logger.error('BlogController - Get blog error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve blog',
        message: error.message
      });
    }
  }

  async createBlog(req, res) {
    try {
      console.log('📝 BlogController - Creating new blog');
      console.log('Request user:', req.user);
      
      const blogData = {
        ...req.body,
        author_id: req.user.userId,
        author_type: 'human'
      };

      // Validate required fields
      if (!blogData.title || !blogData.content) {
        return res.status(400).json({
          success: false,
          error: 'Title and content are required'
        });
      }

      const blog = await blogService.createBlog(blogData);
      
      console.log(`📝 BlogController - Successfully created blog: ${blog.id}`);
      
      res.status(201).json({
        success: true,
        data: blog,
        message: 'Blog created successfully'
      });
    } catch (error) {
      console.error('❌ BlogController - Create blog error:', error);
      logger.error('BlogController - Create blog error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to create blog',
        message: error.message
      });
    }
  }

  async updateBlog(req, res) {
    try {
      const { id } = req.params;
      console.log(`📝 BlogController - Updating blog: ${id}`);
      
      const blog = await blogService.getBlogById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      // Check if user owns the blog or is admin
      if (blog.author_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this blog'
        });
      }

      const updatedBlog = await blogService.updateBlog(id, req.body);
      
      console.log(`📝 BlogController - Successfully updated blog: ${id}`);
      
      res.json({
        success: true,
        data: updatedBlog,
        message: 'Blog updated successfully'
      });
    } catch (error) {
      console.error('❌ BlogController - Update blog error:', error);
      logger.error('BlogController - Update blog error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update blog',
        message: error.message
      });
    }
  }

  async deleteBlog(req, res) {
    try {
      const { id } = req.params;
      console.log(`📝 BlogController - Deleting blog: ${id}`);
      
      const blog = await blogService.getBlogById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      // Check if user owns the blog or is admin
      if (blog.author_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this blog'
        });
      }

      await blogService.deleteBlog(id);
      
      console.log(`📝 BlogController - Successfully deleted blog: ${id}`);
      
      res.json({
        success: true,
        message: 'Blog deleted successfully'
      });
    } catch (error) {
      console.error('❌ BlogController - Delete blog error:', error);
      logger.error('BlogController - Delete blog error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to delete blog',
        message: error.message
      });
    }
  }

  async publishBlog(req, res) {
    try {
      const { id } = req.params;
      console.log(`📝 BlogController - Publishing blog: ${id}`);
      
      const blog = await blogService.getBlogById(id);
      if (!blog) {
        return res.status(404).json({
          success: false,
          error: 'Blog not found'
        });
      }

      // Check if user owns the blog or is admin
      if (blog.author_id !== req.user.userId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to publish this blog'
        });
      }

      const publishedBlog = await blogService.publishBlog(id);
      
      console.log(`📝 BlogController - Successfully published blog: ${id}`);
      
      res.json({
        success: true,
        data: publishedBlog,
        message: 'Blog published successfully'
      });
    } catch (error) {
      console.error('❌ BlogController - Publish blog error:', error);
      logger.error('BlogController - Publish blog error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to publish blog',
        message: error.message
      });
    }
  }

  async getTrendingBlogs(req, res) {
    try {
      console.log('📝 BlogController - Getting trending blogs');
      
      const { limit = 5 } = req.query;
      const blogs = await blogService.getTrendingBlogs(parseInt(limit));
      
      console.log(`📝 BlogController - Successfully retrieved ${blogs.length} trending blogs`);
      
      res.json({
        success: true,
        data: blogs
      });
    } catch (error) {
      console.error('❌ BlogController - Get trending blogs error:', error);
      logger.error('BlogController - Get trending blogs error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trending blogs',
        message: error.message
      });
    }
  }

  async searchBlogs(req, res) {
    try {
      const { q, limit = 10, offset = 0 } = req.query;
      console.log(`📝 BlogController - Searching blogs for: "${q}"`);
      
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
      
      console.log(`📝 BlogController - Search found ${blogs.length} blogs for: "${q}"`);
      
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
      console.error('❌ BlogController - Search blogs error:', error);
      logger.error('BlogController - Search blogs error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to search blogs',
        message: error.message
      });
    }
  }

  async getBlogStats(req, res) {
    try {
      console.log('📝 BlogController - Getting blog statistics');
      
      const stats = await blogService.getBlogStats();
      
      console.log('📝 BlogController - Successfully retrieved blog statistics');
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('❌ BlogController - Get blog stats error:', error);
      logger.error('BlogController - Get blog stats error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve blog statistics',
        message: error.message
      });
    }
  }

  async generateAIBlog(req, res) {
    try {
      console.log('📝 BlogController - Generating AI blog');
      
      const { topic, claims, tone, length } = req.body;
      
      if (!topic) {
        return res.status(400).json({
          success: false,
          error: 'Topic is required for AI blog generation'
        });
      }

      const aiBlog = await blogService.generateAIBlog({
        topic,
        claims,
        tone,
        length,
        author_id: req.user.userId
      });
      
      console.log(`📝 BlogController - Successfully generated AI blog: ${aiBlog.id}`);
      
      res.status(201).json({
        success: true,
        data: aiBlog,
        message: 'AI blog generated successfully'
      });
    } catch (error) {
      console.error('❌ BlogController - Generate AI blog error:', error);
      logger.error('BlogController - Generate AI blog error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate AI blog',
        message: error.message
      });
    }
  }

  async getMyBlogs(req, res) {
    try {
      console.log(`📝 BlogController - Getting blogs for user: ${req.user.userId}`);
      
      const { status, limit = 10, offset = 0 } = req.query;
      
      const blogs = await blogService.getUserBlogs(req.user.userId, {
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      console.log(`📝 BlogController - Successfully retrieved ${blogs.length} blogs for user: ${req.user.userId}`);
      
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
      console.error('❌ BlogController - Get my blogs error:', error);
      logger.error('BlogController - Get my blogs error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve your blogs',
        message: error.message
      });
    }
  }
}

module.exports = new BlogController();