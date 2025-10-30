const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class FactChecker {
  static async create(factCheckerData) {
    const {
      user_id,
      credentials = '',
      areas_of_expertise = [],
      verification_status = 'approved',
      is_active = true
    } = factCheckerData;

    const id = uuidv4();
    const query = `
      INSERT INTO hakikisha.fact_checkers (id, user_id, credentials, areas_of_expertise, verification_status, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, 
        user_id, 
        credentials, 
        JSON.stringify(areas_of_expertise), 
        verification_status, 
        is_active
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating fact checker:', error);
      
      // If the error is about missing columns, try to fix the database schema
      if (error.code === '42703' || error.message.includes('column') || error.message.includes('does not exist')) {
        logger.info('Attempting to fix database schema...');
        try {
          // Import and run database fix
          const DatabaseInitializer = require('../config/database-init');
          await DatabaseInitializer.fixExistingDatabase();
          
          // Retry the operation
          const retryResult = await db.query(query, [
            id, 
            user_id, 
            credentials, 
            JSON.stringify(areas_of_expertise), 
            verification_status, 
            is_active
          ]);
          logger.info('Successfully created fact checker after schema fix');
          return retryResult.rows[0];
        } catch (fixError) {
          logger.error('Failed to fix database schema:', fixError);
          throw error; // Throw the original error
        }
      } else {
        throw error;
      }
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT fc.*, u.email, u.username, u.phone
      FROM hakikisha.fact_checkers fc
      JOIN hakikisha.users u ON fc.user_id = u.id
      WHERE fc.user_id = $1
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding fact checker by user ID:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT fc.*, u.email, u.username, u.phone, u.role, u.status as user_status
      FROM hakikisha.fact_checkers fc
      JOIN hakikisha.users u ON fc.user_id = u.id
      WHERE fc.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding fact checker by ID:', error);
      throw error;
    }
  }

  static async findByUserIdWithDetails(userId) {
    const query = `
      SELECT 
        fc.*,
        u.email,
        u.username,
        u.phone,
        u.created_at as joined_date,
        u.last_login,
        u.status as user_status,
        COALESCE(v.verdicts_count, 0) as verdicts_count,
        COALESCE(v.avg_time_spent, 0) as avg_time_spent
      FROM hakikisha.fact_checkers fc
      JOIN hakikisha.users u ON fc.user_id = u.id
      LEFT JOIN (
        SELECT 
          fact_checker_id,
          COUNT(*) as verdicts_count,
          AVG(time_spent) as avg_time_spent
        FROM hakikisha.verdicts
        GROUP BY fact_checker_id
      ) v ON fc.user_id = v.fact_checker_id
      WHERE fc.user_id = $1
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding fact checker with details:', error);
      throw error;
    }
  }

  static async findAllWithDetails({ status, search, limit = 20, offset = 0 } = {}) {
    let query = `
      SELECT 
        fc.*,
        u.email,
        u.username,
        u.phone,
        u.created_at as joined_date,
        u.last_login,
        u.status as user_status,
        COALESCE(v.verdicts_count, 0) as verdicts_count,
        COALESCE(v.recent_activity, NULL) as last_activity
      FROM hakikisha.fact_checkers fc
      JOIN hakikisha.users u ON fc.user_id = u.id
      LEFT JOIN (
        SELECT 
          fact_checker_id,
          COUNT(*) as verdicts_count,
          MAX(created_at) as recent_activity
        FROM hakikisha.verdicts
        GROUP BY fact_checker_id
      ) v ON fc.user_id = v.fact_checker_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (status) {
      if (status === 'active') {
        query += ` AND fc.is_active = true`;
      } else if (status === 'inactive') {
        query += ` AND fc.is_active = false`;
      } else if (status === 'pending') {
        query += ` AND fc.verification_status = 'pending'`;
      } else if (status === 'approved') {
        query += ` AND fc.verification_status = 'approved'`;
      }
    }

    if (search) {
      query += ` AND (u.email ILIKE $${paramCount} OR u.username ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY v.verdicts_count DESC NULLS LAST, u.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding fact checkers with details:', error);
      throw error;
    }
  }

  static async countActive() {
    const query = `
      SELECT COUNT(*) as count 
      FROM hakikisha.fact_checkers 
      WHERE is_active = true AND verification_status = 'approved'
    `;

    try {
      const result = await db.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting active fact checkers:', error);
      return 0;
    }
  }

  static async countWithFilters({ status, search } = {}) {
    let query = `
      SELECT COUNT(*) 
      FROM hakikisha.fact_checkers fc
      JOIN hakikisha.users u ON fc.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (status) {
      if (status === 'active') {
        query += ` AND fc.is_active = true`;
      } else if (status === 'inactive') {
        query += ` AND fc.is_active = false`;
      } else if (status === 'pending') {
        query += ` AND fc.verification_status = 'pending'`;
      } else if (status === 'approved') {
        query += ` AND fc.verification_status = 'approved'`;
      }
    }

    if (search) {
      query += ` AND (u.email ILIKE $${paramCount} OR u.username ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    try {
      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting fact checkers with filters:', error);
      throw error;
    }
  }

  static async getAllActive() {
    const query = `
      SELECT fc.*, u.email, u.username, u.phone
      FROM hakikisha.fact_checkers fc
      JOIN hakikisha.users u ON fc.user_id = u.id
      WHERE fc.is_active = true AND fc.verification_status = 'approved'
      ORDER BY u.username
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active fact checkers:', error);
      return [];
    }
  }

  static async getAllActivity(timeframe = '7 days') {
    const query = `
      SELECT 
        fc.user_id as id,
        u.username,
        u.email,
        u.phone,
        u.created_at as join_date,
        u.last_login as last_active,
        COUNT(v.id) as claims_verified,
        COALESCE(AVG(v.time_spent), 0) as avg_time_spent,
        COUNT(CASE WHEN v.verdict = 'true' THEN 1 END) as true_count,
        COUNT(CASE WHEN v.verdict = 'false' THEN 1 END) as false_count,
        COUNT(CASE WHEN v.verdict = 'misleading' THEN 1 END) as misleading_count
      FROM hakikisha.fact_checkers fc
      JOIN hakikisha.users u ON fc.user_id = u.id
      LEFT JOIN hakikisha.verdicts v ON fc.user_id = v.fact_checker_id 
        AND v.created_at >= NOW() - INTERVAL '${timeframe}'
      WHERE fc.is_active = true AND fc.verification_status = 'approved'
      GROUP BY fc.user_id, u.username, u.email, u.phone, u.created_at, u.last_login
      ORDER BY claims_verified DESC
    `;

    try {
      const result = await db.query(query);
      
      // Format the results for frontend
      return result.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        phone: row.phone,
        joinDate: row.join_date,
        lastActive: row.last_active || 'Never',
        claimsVerified: parseInt(row.claims_verified) || 0,
        timeSpent: `${Math.round(row.avg_time_spent / 60)} min avg`,
        accuracy: row.claims_verified > 0 ? 
          `${Math.round((row.true_count / row.claims_verified) * 100)}%` : '0%'
      }));
    } catch (error) {
      logger.error('Error getting fact checker activity:', error);
      return [];
    }
  }

  static async getActivityStats(userId, timeframe = '7 days') {
    const query = `
      SELECT 
        COUNT(v.id) as total_verdicts,
        AVG(v.time_spent) as avg_time_spent,
        COUNT(CASE WHEN v.verdict = 'true' THEN 1 END) as true_count,
        COUNT(CASE WHEN v.verdict = 'false' THEN 1 END) as false_count,
        COUNT(CASE WHEN v.verdict = 'misleading' THEN 1 END) as misleading_count
      FROM hakikisha.verdicts v
      WHERE v.fact_checker_id = $1 
        AND v.created_at >= NOW() - INTERVAL '${timeframe}'
    `;

    try {
      const result = await db.query(query, [userId]);
      const stats = result.rows[0];
      
      return {
        total_verdicts: parseInt(stats.total_verdicts) || 0,
        avg_time_spent: Math.round(stats.avg_time_spent) || 0,
        accuracy: stats.total_verdicts > 0 ? 
          Math.round((stats.true_count / stats.total_verdicts) * 100) : 0,
        verdict_breakdown: {
          true: stats.true_count || 0,
          false: stats.false_count || 0,
          misleading: stats.misleading_count || 0
        }
      };
    } catch (error) {
      logger.error('Error getting fact checker activity stats:', error);
      throw error;
    }
  }

  static async getStats(userId) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_verdicts,
          AVG(time_spent) as avg_review_time,
          COUNT(DISTINCT DATE(created_at)) as active_days,
          MAX(created_at) as last_review
        FROM hakikisha.verdicts 
        WHERE fact_checker_id = $1
      `, [userId]);

      return result.rows[0] || {
        total_verdicts: 0,
        avg_review_time: 0,
        active_days: 0,
        last_review: null
      };
    } catch (error) {
      logger.error('Error getting fact checker stats:', error);
      return {
        total_verdicts: 0,
        avg_review_time: 0,
        active_days: 0,
        last_review: null
      };
    }
  }

  static async update(factCheckerId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      // Handle JSON fields
      if (key === 'areas_of_expertise' && Array.isArray(value)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
      paramCount++;
    }

    fields.push('updated_at = NOW()');
    values.push(factCheckerId);

    const query = `
      UPDATE hakikisha.fact_checkers 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating fact checker:', error);
      throw error;
    }
  }

  static async updateByUserId(userId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      // Handle JSON fields
      if (key === 'areas_of_expertise' && Array.isArray(value)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
      }
      paramCount++;
    }

    fields.push('updated_at = NOW()');
    values.push(userId);

    const query = `
      UPDATE hakikisha.fact_checkers 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating fact checker by user ID:', error);
      throw error;
    }
  }

  static async delete(factCheckerId) {
    const query = `
      DELETE FROM hakikisha.fact_checkers 
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [factCheckerId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting fact checker:', error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    try {
      // Delete fact checker record
      const result = await db.query('DELETE FROM hakikisha.fact_checkers WHERE user_id = $1', [userId]);
      
      // Update user role to regular user
      await db.query('UPDATE hakikisha.users SET role = $1 WHERE id = $2', ['user', userId]);
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting fact checker:', error);
      throw error;
    }
  }
}

module.exports = FactChecker;