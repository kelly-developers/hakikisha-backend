const Blog = require('../models/Blog');
const logger = require('../utils/logger');

class BlogService {
  /**
   * Get blogs with filtering and pagination
   */
  async getBlogs(options = {}) {
    try {
      console.log('BlogService - Getting blogs with options:', options);
      const { category, limit = 10, offset = 0, author } = options;
      
      if (author === 'current') {
        throw new Error('Author filtering requires authentication');
      }
      
      let blogs;
      if (category) {
        blogs = await Blog.findByCategory(category, limit, offset);
      } else {
        // Default: get all published blogs
        blogs = await Blog.getAll(limit, offset);
      }

      console.log(`BlogService - Found ${blogs.length} blogs`);
      return blogs;
    } catch (error) {
      console.error('BlogService - Get blogs error:', error);
      logger.error('BlogService - Get blogs error:', error);
      throw error;
    }
  }

  /**
   * Get blog by ID
   */
  async getBlogById(id) {
    try {
      console.log(`BlogService - Getting blog by ID: ${id}`);
      const blog = await Blog.findById(id);
      if (!blog) {
        console.log(`BlogService - Blog not found: ${id}`);
        throw new Error('Blog not found');
      }
      console.log(`BlogService - Found blog: ${blog.title}`);
      return blog;
    } catch (error) {
      console.error('BlogService - Get blog by ID error:', error);
      logger.error('BlogService - Get blog by ID error:', error);
      throw error;
    }
  }

  /**
   * Get trending blogs
   */
  async getTrendingBlogs(limit = 5) {
    try {
      console.log(`BlogService - Getting trending blogs, limit: ${limit}`);
      const blogs = await Blog.getTrendingBlogs(limit);
      console.log(`BlogService - Found ${blogs.length} trending blogs`);
      return blogs;
    } catch (error) {
      console.error('BlogService - Get trending blogs error:', error);
      logger.error('BlogService - Get trending blogs error:', error);
      throw error;
    }
  }

  /**
   * Create a new blog
   */
  async createBlog(blogData) {
    try {
      console.log('BlogService - Creating new blog with data:', { 
        ...blogData, 
        content: blogData.content ? `${blogData.content.substring(0, 100)}...` : 'No content'
      });
      
      const blog = await Blog.create(blogData);
      console.log(`BlogService - Blog created successfully: ${blog.id}`);
      return blog;
    } catch (error) {
      console.error('BlogService - Create blog error:', error);
      logger.error('BlogService - Create blog error:', error);
      throw error;
    }
  }

  /**
   * Update blog
   */
  async updateBlog(id, updateData) {
    try {
      console.log(`BlogService - Updating blog: ${id}`, updateData);
      const blog = await Blog.update(id, updateData);
      if (!blog) {
        console.log(`BlogService - Blog not found for update: ${id}`);
        throw new Error('Blog not found');
      }
      console.log(`BlogService - Blog updated successfully: ${id}`);
      return blog;
    } catch (error) {
      console.error('BlogService - Update blog error:', error);
      logger.error('BlogService - Update blog error:', error);
      throw error;
    }
  }

  /**
   * Delete blog
   */
  async deleteBlog(id) {
    try {
      console.log(`BlogService - Deleting blog: ${id}`);
      const blog = await Blog.delete(id);
      if (!blog) {
        console.log(`BlogService - Blog not found for deletion: ${id}`);
        throw new Error('Blog not found');
      }
      console.log(`BlogService - Blog deleted successfully: ${id}`);
      return blog;
    } catch (error) {
      console.error('BlogService - Delete blog error:', error);
      logger.error('BlogService - Delete blog error:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id) {
    try {
      console.log(`BlogService - Incrementing view count for blog: ${id}`);
      const blog = await Blog.updateViewCount(id);
      console.log(`BlogService - View count incremented for blog: ${id}`);
      return blog;
    } catch (error) {
      console.error('BlogService - Increment view count error:', error);
      logger.error('BlogService - Increment view count error:', error);
      throw error;
    }
  }

  /**
   * Publish blog - FIXED IMPLEMENTATION
   */
  async publishBlog(id) {
    try {
      console.log(`BlogService - Publishing blog: ${id}`);
      const blog = await Blog.publish(id);
      if (!blog) {
        console.log(`BlogService - Blog not found for publishing: ${id}`);
        throw new Error('Blog not found');
      }
      console.log(`BlogService - Blog published successfully: ${id}`);
      return blog;
    } catch (error) {
      console.error('BlogService - Publish blog error:', error);
      logger.error('BlogService - Publish blog error:', error);
      throw error;
    }
  }

  /**
   * Search blogs
   */
  async searchBlogs(queryText, options = {}) {
    try {
      console.log(`BlogService - Searching blogs for: "${queryText}"`, options);
      const { limit = 10, offset = 0 } = options;
      const blogs = await Blog.search(queryText, limit, offset);
      console.log(`BlogService - Found ${blogs.length} blogs for search: "${queryText}"`);
      return blogs;
    } catch (error) {
      console.error('BlogService - Search blogs error:', error);
      logger.error('BlogService - Search blogs error:', error);
      throw error;
    }
  }

  /**
   * Generate AI blog
   */
  async generateAIBlog(options) {
    try {
      console.log('BlogService - Generating AI blog with options:', options);
      const { topic, claims, tone, length, author_id } = options;
      
      if (!topic) {
        throw new Error('Topic is required for AI blog generation');
      }

      // This is a placeholder for AI blog generation
      const aiContent = await this.callAIService({
        topic,
        claims,
        tone,
        length
      });

      const blogData = {
        title: `AI Generated: ${topic}`,
        content: aiContent,
        author_id: author_id,
        author_type: 'ai',
        category: 'fact_check',
        source_claim_ids: claims || [],
        status: 'draft'
      };

      const blog = await Blog.create(blogData);
      console.log(`BlogService - AI blog generated successfully: ${blog.id}`);
      return blog;
    } catch (error) {
      console.error('BlogService - Generate AI blog error:', error);
      logger.error('BlogService - Generate AI blog error:', error);
      throw error;
    }
  }

  /**
   * Placeholder for AI service call
   */
  async callAIService(options) {
    try {
      console.log('BlogService - Calling AI service with options:', options);
      const { topic, claims, tone, length } = options;
      
      // This is a mock implementation
      // Replace with actual AI service integration
      const aiContent = `
# ${topic}

This is an AI-generated blog post about "${topic}".

## Key Points:
${claims && claims.length > 0 ? 
  claims.map(claim => `- ${claim}`).join('\n') : 
  '- No specific claims provided'
}

## Analysis:
Based on the available information, this topic requires careful fact-checking and analysis.

## Conclusion:
Always verify information from multiple reliable sources before drawing conclusions.

*This content was generated by AI and should be reviewed by human fact-checkers.*
      `;

      console.log('BlogService - AI service call completed');
      return aiContent;
    } catch (error) {
      console.error('BlogService - AI service call error:', error);
      throw error;
    }
  }

  /**
   * Get blog statistics
   */
  async getBlogStats() {
    try {
      console.log('BlogService - Getting blog statistics');
      const db = require('../config/database');
      
      const totalQuery = 'SELECT COUNT(*) as total FROM hakikisha.blog_articles WHERE status = $1';
      const publishedQuery = 'SELECT COUNT(*) as published FROM hakikisha.blog_articles WHERE status = $1';
      const viewsQuery = 'SELECT SUM(COALESCE(view_count, 0)) as total_views FROM hakikisha.blog_articles';
      const authorsQuery = 'SELECT COUNT(DISTINCT author_id) as total_authors FROM hakikisha.blog_articles';

      const [totalResult, publishedResult, viewsResult, authorsResult] = await Promise.all([
        db.query(totalQuery, ['published']),
        db.query(publishedQuery, ['published']),
        db.query(viewsQuery),
        db.query(authorsQuery)
      ]);

      const stats = {
        total: parseInt(totalResult.rows[0]?.total) || 0,
        published: parseInt(publishedResult.rows[0]?.published) || 0,
        total_views: parseInt(viewsResult.rows[0]?.total_views) || 0,
        total_authors: parseInt(authorsResult.rows[0]?.total_authors) || 0
      };

      console.log('BlogService - Blog statistics:', stats);
      return stats;
    } catch (error) {
      console.error('BlogService - Get blog stats error:', error);
      logger.error('BlogService - Get blog stats error:', error);
      
      // Return default stats instead of throwing error
      return {
        total: 0,
        published: 0,
        total_views: 0,
        total_authors: 0
      };
    }
  }

  /**
   * Get blogs by author
   */
  async getBlogsByAuthor(authorId, options = {}) {
    try {
      console.log(`BlogService - Getting blogs by author: ${authorId}`, options);
      const { limit = 10, offset = 0 } = options;
      const blogs = await Blog.getByAuthor(authorId, limit, offset);
      console.log(`BlogService - Found ${blogs.length} blogs for author: ${authorId}`);
      return blogs;
    } catch (error) {
      console.error('BlogService - Get blogs by author error:', error);
      logger.error('BlogService - Get blogs by author error:', error);
      throw error;
    }
  }

  /**
   * Get draft blogs by author
   */
  async getDraftBlogs(authorId) {
    try {
      console.log(`BlogService - Getting draft blogs for author: ${authorId}`);
      const blogs = await Blog.getDrafts(authorId);
      console.log(`BlogService - Found ${blogs.length} draft blogs for author: ${authorId}`);
      return blogs;
    } catch (error) {
      console.error('BlogService - Get draft blogs error:', error);
      logger.error('BlogService - Get draft blogs error:', error);
      throw error;
    }
  }

  /**
   * Get user's blogs (both published and drafts)
   */
  async getUserBlogs(userId, options = {}) {
    try {
      console.log(`BlogService - Getting all blogs for user: ${userId}`, options);
      const { status, limit = 10, offset = 0 } = options;
      
      let blogs;
      if (status === 'draft') {
        blogs = await this.getDraftBlogs(userId);
      } else if (status === 'published') {
        blogs = await this.getBlogsByAuthor(userId, { limit, offset });
      } else {
        // Get both published and drafts
        const [publishedBlogs, draftBlogs] = await Promise.all([
          this.getBlogsByAuthor(userId, { limit, offset }),
          this.getDraftBlogs(userId)
        ]);
        blogs = [...publishedBlogs, ...draftBlogs];
      }

      console.log(`BlogService - Found ${blogs.length} total blogs for user: ${userId}`);
      return blogs;
    } catch (error) {
      console.error('BlogService - Get user blogs error:', error);
      logger.error('BlogService - Get user blogs error:', error);
      throw error;
    }
  }
}

module.exports = new BlogService();