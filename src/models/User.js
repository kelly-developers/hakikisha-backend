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
}

module.exports = User;