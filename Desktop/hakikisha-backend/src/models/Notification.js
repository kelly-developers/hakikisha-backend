const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class Notification {
  static async create(notificationData) {
    const {
      user_id,
      type,
      title,
      message,
      related_entity_type = null,
      related_entity_id = null,
      is_read = false
    } = notificationData;

    const id = uuidv4();
    const query = `
      INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, user_id, type, title, message, related_entity_type, related_entity_id, is_read
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  static async findByUserId(userId, limit = 20, offset = 0) {
    const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error finding notifications by user ID:', error);
      throw error;
    }
  }

  static async markAsRead(notificationId) {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [notificationId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications 
      SET is_read = true, read_at = NOW()
      WHERE user_id = $1 AND is_read = false
      RETURNING COUNT(*) as updated_count
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rows[0].updated_count;
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as unread_count 
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `;

    try {
      const result = await db.query(query, [userId]);
      return parseInt(result.rows[0].unread_count);
    } catch (error) {
      logger.error('Error getting unread notification count:', error);
      throw error;
    }
  }

  static async createBatch(notificationsData) {
    if (!notificationsData.length) return [];

    const placeholders = [];
    const values = [];
    let paramCount = 1;

    notificationsData.forEach((notification, index) => {
      const id = uuidv4();
      const base = index * 7;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, NOW())`);
      
      values.push(
        id,
        notification.user_id,
        notification.type,
        notification.title,
        notification.message,
        notification.related_entity_type,
        notification.related_entity_id,
        notification.is_read || false
      );
      paramCount += 7;
    });

    const query = `
      INSERT INTO notifications (id, user_id, type, title, message, related_entity_type, related_entity_id, is_read, created_at)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error creating batch notifications:', error);
      throw error;
    }
  }
}

module.exports = Notification;