const Blog = require('../models/Blog');
const logger = require('../utils/logger');

class BlogService {
  /**
   * Get blogs with filtering and pagination
   */
  async getBlogs(options = {}) {
    try {
      const { category, limit = 10, offset = 0 } = options;
      
      if (category) {
        return await Blog.findByCategory(category, limit, offset);
      }
      
      // Default: get all published blogs
      const query = `
        SELECT ba.*, u.email as author_email, u.profile_picture as author_avatar
        FROM hakikisha.blog_articles ba
        LEFT JOIN hakikisha.users u ON ba.author_id = u.id
        WHERE ba.status = 'published'
        ORDER BY ba.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const db = require('../config/database');
      const result = await db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('BlogService - Get blogs error:', error);
      throw error;
    }
  }

  /**
   * Get blog by ID
   */
  async getBlogById(id) {
    try {
      return await Blog.findById(id);
    } catch (error) {
      logger.error('BlogService - Get blog by ID error:', error);
      throw error;
    }
  }

  /**
   * Get trending blogs
   */
  async getTrendingBlogs(limit = 5) {
    try {
      return await Blog.getTrendingBlogs(limit);
    } catch (error) {
      logger.error('BlogService - Get trending blogs error:', error);
      throw error;
    }
  }

  /**
   * Create a new blog
   */
  async createBlog(blogData) {
    try {
      return await Blog.create(blogData);
    } catch (error) {
      logger.error('BlogService - Create blog error:', error);
      throw error;
    }
  }

  /**
   * Update blog
   */
  async updateBlog(id, updateData) {
    try {
      const db = require('../config/database');
      
      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      const query = `
        UPDATE hakikisha.blog_articles 
        SET ${fields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await db.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('BlogService - Update blog error:', error);
      throw error;
    }
  }

  /**
   * Delete blog
   */
  async deleteBlog(id) {
    try {
      const db = require('../config/database');
      const query = 'DELETE FROM hakikisha.blog_articles WHERE id = $1 RETURNING *';
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('BlogService - Delete blog error:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id) {
    try {
      return await Blog.updateViewCount(id);
    } catch (error) {
      logger.error('BlogService - Increment view count error:', error);
      throw error;
    }
  }

  /**
   * Publish blog
   */
  async publishBlog(id) {
    try {
      return await Blog.publish(id);
    } catch (error) {
      logger.error('BlogService - Publish blog error:', error);
      throw error;
    }
  }

  /**
   * Search blogs
   */
  async searchBlogs(queryText, options = {}) {
    try {
      const { limit = 10, offset = 0 } = options;
      return await Blog.search(queryText, limit, offset);
    } catch (error) {
      logger.error('BlogService - Search blogs error:', error);
      throw error;
    }
  }

  /**
   * Generate AI blog
   */
  async generateAIBlog(options) {
    try {
      const { topic, claims, tone, length, author_id } = options;
      
      // This is a placeholder for AI blog generation
      // In a real implementation, you would call an AI service like OpenAI
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
        source_claim_ids: claims,
        status: 'draft'
      };

      return await Blog.create(blogData);
    } catch (error) {
      logger.error('BlogService - Generate AI blog error:', error);
      throw error;
    }
  }

  /**
   * Placeholder for AI service call
   */
  async callAIService(options) {
    // This is a mock implementation
    // Replace with actual AI service integration
    const { topic, claims, tone, length } = options;
    
    return `
      # ${topic}

      This is an AI-generated blog post about "${topic}".

      ## Key Points:
      ${claims && claims.length > 0 ? 
        claims.map(claim => `- ${claim}`).join('\n      ') : 
        '- No specific claims provided'
      }

      ## Analysis:
      Based on the available information, this topic requires careful fact-checking and analysis.

      ## Conclusion:
      Always verify information from multiple reliable sources before drawing conclusions.

      *This content was generated by AI and should be reviewed by human fact-checkers.*
    `;
  }

  /**
   * Get blog statistics
   */
  async getBlogStats() {
    try {
      const db = require('../config/database');
      
      const totalQuery = 'SELECT COUNT(*) as total FROM hakikisha.blog_articles WHERE status = $1';
      const publishedQuery = 'SELECT COUNT(*) as published FROM hakikisha.blog_articles WHERE status = $1';
      const viewsQuery = 'SELECT SUM(COALESCE(view_count, 0)) as total_views FROM hakikisha.blog_articles';
      const trendingQuery = 'SELECT COUNT(*) as trending FROM hakikisha.blog_articles WHERE trending_topic_id IS NOT NULL';

      const [totalResult, publishedResult, viewsResult, trendingResult] = await Promise.all([
        db.query(totalQuery, ['published']),
        db.query(publishedQuery, ['published']),
        db.query(viewsQuery),
        db.query(trendingQuery)
      ]);

      return {
        total: parseInt(totalResult.rows[0].total),
        published: parseInt(publishedResult.rows[0].published),
        total_views: parseInt(viewsResult.rows[0].total_views) || 0,
        trending: parseInt(trendingResult.rows[0].trending)
      };
    } catch (error) {
      logger.error('BlogService - Get blog stats error:', error);
      throw error;
    }
  }
}

module.exports = new BlogService();