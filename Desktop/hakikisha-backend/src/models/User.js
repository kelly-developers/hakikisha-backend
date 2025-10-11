const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class User {
  static async create(userData) {
    const {
      email,
      password_hash,
      phone = null,
      role = 'user',
      profile_picture = null
    } = userData;

    const id = uuidv4();
    const query = `
      INSERT INTO users (id, email, password_hash, phone, role, profile_picture, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, email, password_hash, phone, role, profile_picture
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    try {
      const result = await db.query(query, [email]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding user by id:', error);
      throw error;
    }
  }

  static async update(id, updates) {
    const allowedFields = ['phone', 'profile_picture', 'last_login', 'is_verified'];
    const setClause = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(field => {
      if (allowedFields.includes(field)) {
        setClause.push(`${field} = $${paramCount}`);
        values.push(updates[field]);
        paramCount++;
      }
    });

    if (setClause.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClause.push('updated_at = NOW()');
    values.push(id);

    const query = `
      UPDATE users 
      SET ${setClause.join(', ')}
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

  static async updateLoginStats(id) {
    const query = `
      UPDATE users 
      SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user login stats:', error);
      throw error;
    }
  }

  static async getFactCheckers() {
    const query = `
      SELECT u.*, fc.expertise_areas, fc.verification_status, fc.rating
      FROM users u
      LEFT JOIN fact_checkers fc ON u.id = fc.user_id
      WHERE u.role = 'fact_checker' AND fc.verification_status = 'approved'
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting fact checkers:', error);
      throw error;
    }
  }
}

module.exports = User;