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
      status = 'active'
    } = userData;

    const id = uuidv4();
    const query = `
      INSERT INTO hakikisha.users (id, email, username, password_hash, phone, role, is_verified, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, email, username, password_hash, phone, role, is_verified, status
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
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

  static async findAll(options = {}) {
    const { role, limit = 20, offset = 0 } = options;
    
    let query = 'SELECT * FROM hakikisha.users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
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
    const { role } = options;
    
    let query = 'SELECT COUNT(*) FROM hakikisha.users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (role) {
      query += ` AND role = $${paramCount}`;
      params.push(role);
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
}

module.exports = User;