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
      read_time = 5
    } = blogData;

    const id = uuidv4();
    const query = `
      INSERT INTO blog_articles (
        id, title, content, author_id, author_type, category, source_claim_ids,
        trending_topic_id, status, featured_image, read_time, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, title, content, author_id, author_type, category,
        JSON.stringify(source_claim_ids), trending_topic_id, status,
        featured_image, read_time
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating blog article:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT ba.*, 
             u.email as author_email,
             u.profile_picture as author_avatar,
             tt.topic as trending_topic
      FROM blog_articles ba
      LEFT JOIN users u ON ba.author_id = u.id
      LEFT JOIN trending_topics tt ON ba.trending_topic_id = tt.id
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
      SELECT ba.*, u.email as author_email, u.profile_picture as author_avatar
      FROM blog_articles ba
      LEFT JOIN users u ON ba.author_id = u.id
      WHERE ba.category = $1 AND ba.status = 'published'
      ORDER BY ba.created_at DESC
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

  static async getTrendingBlogs(limit = 5) {
    const query = `
      SELECT ba.*, u.email as author_email, u.profile_picture as author_avatar
      FROM blog_articles ba
      LEFT JOIN users u ON ba.author_id = u.id
      WHERE ba.status = 'published' AND ba.trending_topic_id IS NOT NULL
      ORDER BY ba.view_count DESC, ba.created_at DESC
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
      UPDATE blog_articles 
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
      UPDATE blog_articles 
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
      SELECT ba.*, u.email as author_email, 
             ts_rank(to_tsvector(ba.title || ' ' || ba.content), plainto_tsquery($1)) as rank
      FROM blog_articles ba
      LEFT JOIN users u ON ba.author_id = u.id
      WHERE ba.status = 'published'
        AND (to_tsvector(ba.title || ' ' || ba.content) @@ plainto_tsquery($1))
      ORDER BY rank DESC, ba.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [queryText, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching blogs:', error);
      throw error;
    }
  }
}

module.exports = Blog;