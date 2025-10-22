const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class Blog {
  static async create(blogData) {
    const {
      title,
      content,
      author_id,
      author_type = 'human',
      category = 'fact_check',
      source_claim_ids = [],
      trending_topic_id = null,
      status = 'draft',
      featured_image = null,
      read_time = 5,
      excerpt = null
    } = blogData;

    const id = uuidv4();
    
    // Generate excerpt from content if not provided
    let generatedExcerpt = excerpt;
    if (!generatedExcerpt && content) {
      generatedExcerpt = content.substring(0, 150) + (content.length > 150 ? '...' : '');
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100);

    const query = `
      INSERT INTO hakikisha.blog_articles (
        id, title, content, excerpt, author_id, author_type, category, source_claim_ids,
        trending_topic_id, status, featured_image, read_time, slug, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, title, content, generatedExcerpt, author_id, author_type, category,
        JSON.stringify(source_claim_ids), trending_topic_id, status,
        featured_image, read_time, slug
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating blog article:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT 
        ba.*, 
        u.email as author_email,
        u.username as author_name,
        u.profile_picture as author_avatar
      FROM hakikisha.blog_articles ba
      LEFT JOIN hakikisha.users u ON ba.author_id = u.id
      WHERE ba.id = $1
    `;
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding blog by ID:', error);
      throw error;
    }
  }

  static async findByCategory(category, limit = 10, offset = 0) {
    const query = `
      SELECT 
        ba.*, 
        u.email as author_email,
        u.username as author_name,
        u.profile_picture as author_avatar
      FROM hakikisha.blog_articles ba
      LEFT JOIN hakikisha.users u ON ba.author_id = u.id
      WHERE ba.category = $1 AND ba.status = 'published'
      ORDER BY ba.published_at DESC NULLS LAST, ba.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [category, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding blogs by category:', error);
      throw error;
    }
  }

  static async getAll(limit = 10, offset = 0) {
    const query = `
      SELECT 
        ba.*, 
        u.email as author_email,
        u.username as author_name,
        u.profile_picture as author_avatar
      FROM hakikisha.blog_articles ba
      LEFT JOIN hakikisha.users u ON ba.author_id = u.id
      WHERE ba.status = 'published'
      ORDER BY ba.published_at DESC NULLS LAST, ba.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all blogs:', error);
      throw error;
    }
  }

  static async getTrendingBlogs(limit = 5) {
    const query = `
      SELECT 
        ba.*, 
        u.email as author_email,
        u.username as author_name,
        u.profile_picture as author_avatar
      FROM hakikisha.blog_articles ba
      LEFT JOIN hakikisha.users u ON ba.author_id = u.id
      WHERE ba.status = 'published'
      ORDER BY ba.view_count DESC NULLS LAST, ba.published_at DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting trending blogs:', error);
      throw error;
    }
  }

  static async updateViewCount(id) {
    const query = `
      UPDATE hakikisha.blog_articles 
      SET view_count = COALESCE(view_count, 0) + 1
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating blog view count:', error);
      throw error;
    }
  }

  static async publish(id) {
    const query = `
      UPDATE hakikisha.blog_articles 
      SET status = 'published', published_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error publishing blog:', error);
      throw error;
    }
  }

  static async search(queryText, limit = 10, offset = 0) {
    const query = `
      SELECT 
        ba.*, 
        u.email as author_email,
        u.username as author_name
      FROM hakikisha.blog_articles ba
      LEFT JOIN hakikisha.users u ON ba.author_id = u.id
      WHERE ba.status = 'published'
        AND (ba.title ILIKE $1 OR ba.content ILIKE $1 OR ba.excerpt ILIKE $1)
      ORDER BY 
        CASE 
          WHEN ba.title ILIKE $1 THEN 1
          WHEN ba.content ILIKE $1 THEN 2
          ELSE 3
        END,
        ba.published_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [`%${queryText}%`, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching blogs:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
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

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating blog:', error);
      throw error;
    }
  }

  static async delete(id) {
    const query = `
      DELETE FROM hakikisha.blog_articles 
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting blog:', error);
      throw error;
    }
  }

  static async getByAuthor(authorId, limit = 10, offset = 0) {
    const query = `
      SELECT 
        ba.*, 
        u.email as author_email,
        u.username as author_name,
        u.profile_picture as author_avatar
      FROM hakikisha.blog_articles ba
      LEFT JOIN hakikisha.users u ON ba.author_id = u.id
      WHERE ba.author_id = $1
      ORDER BY ba.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [authorId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting blogs by author:', error);
      throw error;
    }
  }

  static async getDrafts(authorId) {
    const query = `
      SELECT 
        ba.*, 
        u.email as author_email,
        u.username as author_name
      FROM hakikisha.blog_articles ba
      LEFT JOIN hakikisha.users u ON ba.author_id = u.id
      WHERE ba.author_id = $1 AND ba.status = 'draft'
      ORDER BY ba.updated_at DESC
    `;

    try {
      const result = await db.query(query, [authorId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting draft blogs:', error);
      throw error;
    }
  }
}

module.exports = Blog;