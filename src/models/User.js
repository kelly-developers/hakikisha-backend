const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class User {
  static async findByEmail(email) {
    const query = 'SELECT * FROM hakikisha.users WHERE email = $1';
    try {
      const result = await db.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM hakikisha.users WHERE username = $1';
    try {
      const result = await db.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  static async findByPhone(phone) {
    const query = 'SELECT * FROM hakikisha.users WHERE phone = $1';
    try {
      const result = await db.query(query, [phone]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by phone:', error);
      throw error;
    }
  }

  static async findByEmailOrUsername(identifier) {
    const query = 'SELECT * FROM hakikisha.users WHERE email = $1 OR username = $1';
    try {
      const result = await db.query(query, [identifier]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email or username:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM hakikisha.users WHERE id = $1';
    try {
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  static async create(userData) {
    const {
      email,
      username,
      password_hash,
      phone = null,
      role = 'user',
      is_verified = false,
      status = 'active',
      registration_status = 'pending'
    } = userData;

    // Validate required fields
    if (!email || !password_hash) {
      throw new Error('Email and password are required');
    }

    // Generate username if not provided
    let finalUsername = username;
    if (!finalUsername) {
      finalUsername = email.split('@')[0] + Math.floor(1000 + Math.random() * 9000);
    }

    const id = uuidv4();
    const query = `
      INSERT INTO hakikisha.users (id, email, username, password_hash, phone, role, is_verified, status, registration_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, email, finalUsername, password_hash, phone, role, is_verified, status, registration_status
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      
      // Handle unique constraint violations
      if (error.code === '23505') {
        if (error.constraint.includes('email')) {
          throw new Error('Email already exists');
        } else if (error.constraint.includes('username')) {
          throw new Error('Username already exists');
        } else if (error.constraint.includes('phone')) {
          throw new Error('Phone number already exists');
        }
      }
      
      throw error;
    }
  }

  static async update(userId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    fields.push('updated_at = NOW()');
    values.push(userId);

    const query = `
      UPDATE hakikisha.users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  static async updateLoginStats(userId, ipAddress = null) {
    const query = `
      UPDATE hakikisha.users 
      SET last_login = NOW(), 
          login_count = login_count + 1,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user login stats:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    const { role, status, registration_status, limit = 20, offset = 0 } = options;
    
    let query = 'SELECT * FROM hakikisha.users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (registration_status) {
      query += ` AND registration_status = $${paramCount}`;
      params.push(registration_status);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  // FIXED: Added count() method that accepts where conditions
  static async count(where = {}) {
    let query = 'SELECT COUNT(*) FROM hakikisha.users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(where)) {
      query += ` AND ${key} = $${paramCount}`;
      params.push(value);
      paramCount++;
    }

    try {
      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting users:', error);
      throw error;
    }
  }

  // Keep the existing countAll method for backward compatibility
  static async countAll(options = {}) {
    const { role, status, registration_status } = options;
    
    let query = 'SELECT COUNT(*) FROM hakikisha.users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (registration_status) {
      query += ` AND registration_status = $${paramCount}`;
      params.push(registration_status);
    }

    try {
      const result = await db.query(query, params);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting users:', error);
      throw error;
    }
  }

  static async countNew(timeframe = '30 days') {
    const query = `
      SELECT COUNT(*) 
      FROM hakikisha.users 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
    `;

    try {
      const result = await db.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting new users:', error);
      throw error;
    }
  }

  static async countActive(timeframe = '30 days') {
    const query = `
      SELECT COUNT(*) 
      FROM hakikisha.users 
      WHERE last_login >= NOW() - INTERVAL '${timeframe}'
        AND status = 'active'
    `;

    try {
      const result = await db.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting active users:', error);
      throw error;
    }
  }

  static async searchUsers(searchTerm, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM hakikisha.users 
      WHERE email ILIKE $1 OR username ILIKE $1 OR phone ILIKE $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [`%${searchTerm}%`, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error searching users:', error);
      throw error;
    }
  }

  static async delete(userId) {
    const query = 'DELETE FROM hakikisha.users WHERE id = $1 RETURNING *';
    
    try {
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  // Add to User model
  static async countByRegistrationStatus(status) {
    try {
      const result = await db.query(
        'SELECT COUNT(*) FROM hakikisha.users WHERE registration_status = $1',
        [status]
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error counting users by registration status:', error);
      return 0;
    }
  }

  static async findByRegistrationStatus(status, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT id, email, username, role, registration_status, status, created_at 
         FROM hakikisha.users 
         WHERE registration_status = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [status, limit, offset]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding users by registration status:', error);
      return [];
    }
  }

  // Additional useful methods for admin functionality
  static async getPendingRegistrations(limit = 20, offset = 0) {
    return this.findByRegistrationStatus('pending', limit, offset);
  }

  static async getApprovedRegistrations(limit = 20, offset = 0) {
    return this.findByRegistrationStatus('approved', limit, offset);
  }

  static async getRejectedRegistrations(limit = 20, offset = 0) {
    return this.findByRegistrationStatus('rejected', limit, offset);
  }

  static async bulkUpdateRegistrationStatus(userIds, newStatus, adminId = null) {
    try {
      const placeholders = userIds.map((_, index) => `$${index + 1}`).join(',');
      const query = `
        UPDATE hakikisha.users 
        SET registration_status = $${userIds.length + 1}, 
            updated_at = NOW(),
            ${adminId ? 'verified_by = $' + (userIds.length + 2) + ',' : ''}
            is_verified = $${userIds.length + (adminId ? 3 : 2)}
        WHERE id IN (${placeholders})
        RETURNING *
      `;

      const params = [...userIds, newStatus];
      if (adminId) {
        params.push(adminId);
      }
      params.push(newStatus === 'approved'); // Set is_verified based on status

      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error bulk updating registration status:', error);
      throw error;
    }
  }

  static async getRegistrationStats() {
    try {
      const query = `
        SELECT 
          registration_status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM hakikisha.users), 2) as percentage
        FROM hakikisha.users 
        GROUP BY registration_status
        ORDER BY count DESC
      `;

      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting registration stats:', error);
      return [];
    }
  }

  static async findPendingFactCheckers(limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT u.id, u.email, u.username, u.created_at, u.phone,
                fc.credentials, fc.areas_of_expertise
         FROM hakikisha.users u
         LEFT JOIN hakikisha.fact_checkers fc ON u.id = fc.user_id
         WHERE u.registration_status = 'pending' 
           AND u.role = 'fact_checker'
         ORDER BY u.created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      return result.rows;
    } catch (error) {
      logger.error('Error finding pending fact checkers:', error);
      return [];
    }
  }
}

module.exports = User;