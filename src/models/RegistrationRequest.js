const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class RegistrationRequest {
  static async create(requestData) {
    const {
      user_id,
      request_type = 'user',
      status = 'pending',
      admin_notes = null
    } = requestData;

    const id = uuidv4();
    const query = `
      INSERT INTO registration_requests (id, user_id, request_type, status, admin_notes, submitted_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, user_id, request_type, status, admin_notes
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating registration request:', error);
      throw error;
    }
  }

  static async findById(id) {
    const query = `
      SELECT rr.*, u.email, u.phone, u.role
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.id = $1
    `;

    try {
      const result = await db.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding registration request by ID:', error);
      throw error;
    }
  }

  static async findByUserId(userId) {
    const query = `
      SELECT * FROM registration_requests 
      WHERE user_id = $1 
      ORDER BY submitted_at DESC
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding registration request by user ID:', error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    const { status, request_type, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT 
        rr.*,
        u.email,
        u.phone,
        u.created_at as user_created_at,
        a.email as reviewed_by_email
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      LEFT JOIN users a ON rr.reviewed_by = a.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND rr.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (request_type) {
      query += ` AND rr.request_type = $${paramCount}`;
      params.push(request_type);
      paramCount++;
    }

    query += ` ORDER BY rr.submitted_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error finding all registration requests:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, reviewedBy = null, adminNotes = null) {
    const query = `
      UPDATE registration_requests 
      SET status = $1, reviewed_by = $2, reviewed_at = NOW(), admin_notes = $3
      WHERE id = $4
      RETURNING *
    `;

    try {
      const result = await db.query(query, [status, reviewedBy, adminNotes, id]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating registration request status:', error);
      throw error;
    }
  }

  static async approve(id, reviewedBy, notes = null) {
    return await this.updateStatus(id, 'approved', reviewedBy, notes);
  }

  static async reject(id, reviewedBy, notes = null) {
    return await this.updateStatus(id, 'rejected', reviewedBy, notes);
  }

  static async getStats() {
    const query = `
      SELECT 
        status,
        request_type,
        COUNT(*) as count
      FROM registration_requests 
      GROUP BY status, request_type
      ORDER BY request_type, status
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting registration request stats:', error);
      throw error;
    }
  }

  static async getPendingCount() {
    const query = `
      SELECT COUNT(*) as count 
      FROM registration_requests 
      WHERE status = 'pending'
    `;

    try {
      const result = await db.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Error getting pending registration count:', error);
      throw error;
    }
  }

  static async deleteByUserId(userId) {
    const query = `
      DELETE FROM registration_requests 
      WHERE user_id = $1
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rowCount;
    } catch (error) {
      logger.error('Error deleting registration requests by user ID:', error);
      throw error;
    }
  }

  static async cleanupOldRequests(retentionDays = 90) {
    const query = `
      DELETE FROM registration_requests 
      WHERE submitted_at < NOW() - INTERVAL '${retentionDays} days'
        AND status IN ('approved', 'rejected')
    `;

    try {
      const result = await db.query(query);
      logger.info(`Cleaned up ${result.rowCount} old registration requests`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up old registration requests:', error);
      throw error;
    }
  }
}

module.exports = RegistrationRequest;