const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class AdminActivity {
  static async create(activityData) {
    const {
      admin_id,
      activity_type,
      description,
      target_user_id = null,
      changes_made = {},
      ip_address,
      user_agent
    } = activityData;

    const id = uuidv4();
    const query = `
      INSERT INTO admin_activities (id, admin_id, activity_type, description, target_user_id, changes_made, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, admin_id, activity_type, description, target_user_id,
        JSON.stringify(changes_made), ip_address, user_agent
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating admin activity:', error);
      throw error;
    }
  }

  static async findByAdminId(adminId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM admin_activities 
      WHERE admin_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [adminId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding admin activities:', error);
      throw error;
    }
  }

  static async getRecent(limit = 20) {
    const query = `
      SELECT 
        aa.*,
        u.email as admin_email
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      ORDER BY aa.created_at DESC 
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting recent admin activities:', error);
      throw error;
    }
  }

  static async getActivityStats(timeframe = '30 days') {
    const query = `
      SELECT 
        activity_type,
        COUNT(*) as count,
        COUNT(DISTINCT admin_id) as unique_admins
      FROM admin_activities 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY activity_type
      ORDER BY count DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting admin activity stats:', error);
      throw error;
    }
  }

  static async searchActivities(searchParams, limit = 20, offset = 0) {
    let query = `
      SELECT 
        aa.*,
        u.email as admin_email,
        tu.email as target_user_email
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      LEFT JOIN users tu ON aa.target_user_id = tu.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (searchParams.admin_id) {
      query += ` AND aa.admin_id = $${paramCount}`;
      params.push(searchParams.admin_id);
      paramCount++;
    }

    if (searchParams.activity_type) {
      query += ` AND aa.activity_type = $${paramCount}`;
      params.push(searchParams.activity_type);
      paramCount++;
    }

    if (searchParams.date_from) {
      query += ` AND aa.created_at >= $${paramCount}`;
      params.push(searchParams.date_from);
      paramCount++;
    }

    if (searchParams.date_to) {
      query += ` AND aa.created_at <= $${paramCount}`;
      params.push(searchParams.date_to);
      paramCount++;
    }

    query += ` ORDER BY aa.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    try {
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error searching admin activities:', error);
      throw error;
    }
  }

  static async exportActivities(timeframe = '30 days') {
    const query = `
      SELECT 
        aa.*,
        u.email as admin_email,
        tu.email as target_user_email
      FROM admin_activities aa
      LEFT JOIN users u ON aa.admin_id = u.id
      LEFT JOIN users tu ON aa.target_user_id = tu.id
      WHERE aa.created_at >= NOW() - INTERVAL '${timeframe}'
      ORDER BY aa.created_at DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error exporting admin activities:', error);
      throw error;
    }
  }

  static async cleanupOldActivities(retentionDays = 90) {
    const query = `
      DELETE FROM admin_activities 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    try {
      const result = await db.query(query);
      logger.info(`Cleaned up ${result.rowCount} old admin activity records`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up admin activities:', error);
      throw error;
    }
  }
}

module.exports = AdminActivity;