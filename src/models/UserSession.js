const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class UserSession {
  static async create(sessionData) {
    const {
      user_id,
      session_token,
      ip_address,
      user_agent,
      expires_at
    } = sessionData;

    const id = uuidv4();
    const query = `
      INSERT INTO user_sessions (id, user_id, session_token, ip_address, user_agent, login_time, last_activity, expires_at, is_active)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), $6, true)
      RETURNING *
    `;

    try {
      const result = await db.query(query, [
        id, user_id, session_token, ip_address, user_agent, expires_at
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user session:', error);
      throw error;
    }
  }

  static async findByToken(sessionToken) {
    const query = `
      SELECT 
        us.*,
        u.email,
        u.role,
        u.is_verified
      FROM user_sessions us
      LEFT JOIN users u ON us.user_id = u.id
      WHERE us.session_token = $1 
        AND us.is_active = true 
        AND us.expires_at > NOW()
    `;

    try {
      const result = await db.query(query, [sessionToken]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error finding session by token:', error);
      throw error;
    }
  }

  static async updateActivity(sessionId) {
    const query = `
      UPDATE user_sessions 
      SET last_activity = NOW()
      WHERE id = $1 AND is_active = true
      RETURNING *
    `;

    try {
      const result = await db.query(query, [sessionId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating session activity:', error);
      throw error;
    }
  }

  static async invalidateSession(sessionId) {
    const query = `
      UPDATE user_sessions 
      SET is_active = false, logout_time = NOW()
      WHERE id = $1
      RETURNING *
    `;

    try {
      const result = await db.query(query, [sessionId]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error invalidating session:', error);
      throw error;
    }
  }

  static async invalidateAllUserSessions(userId, exceptSessionId = null) {
    let query = `
      UPDATE user_sessions 
      SET is_active = false, logout_time = NOW()
      WHERE user_id = $1 AND is_active = true
    `;

    const params = [userId];
    
    if (exceptSessionId) {
      query += ` AND id != $2`;
      params.push(exceptSessionId);
    }

    query += ` RETURNING COUNT(*) as invalidated_count`;

    try {
      const result = await db.query(query, params);
      return parseInt(result.rows[0].invalidated_count);
    } catch (error) {
      logger.error('Error invalidating user sessions:', error);
      throw error;
    }
  }

  static async getActiveSessions(userId) {
    const query = `
      SELECT * FROM user_sessions 
      WHERE user_id = $1 
        AND is_active = true 
        AND expires_at > NOW()
      ORDER BY last_activity DESC
    `;

    try {
      const result = await db.query(query, [userId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active sessions:', error);
      throw error;
    }
  }

  static async getSessionStats(timeframe = '7 days') {
    const query = `
      SELECT 
        -- Session counts
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
        COUNT(CASE WHEN logout_time IS NOT NULL THEN 1 END) as completed_sessions,
        
        -- Duration statistics
        AVG(EXTRACT(EPOCH FROM (COALESCE(logout_time, NOW()) - login_time))) as avg_session_duration,
        MAX(EXTRACT(EPOCH FROM (COALESCE(logout_time, NOW()) - login_time))) as max_session_duration,
        
        -- Concurrent sessions
        COUNT(DISTINCT user_id) as unique_users,
        AVG(sessions_per_user) as avg_sessions_per_user
        
      FROM user_sessions,
      LATERAL (
        SELECT COUNT(*) as sessions_per_user
        FROM user_sessions us2 
        WHERE us2.user_id = user_sessions.user_id
          AND us2.login_time >= NOW() - INTERVAL '${timeframe}'
      ) user_stats
      
      WHERE login_time >= NOW() - INTERVAL '${timeframe}'
    `;

    try {
      const result = await db.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting session stats:', error);
      throw error;
    }
  }

  static async cleanupExpiredSessions() {
    const query = `
      UPDATE user_sessions 
      SET is_active = false 
      WHERE expires_at <= NOW() AND is_active = true
      RETURNING COUNT(*) as expired_count
    `;

    try {
      const result = await db.query(query);
      const expiredCount = parseInt(result.rows[0].expired_count);
      
      if (expiredCount > 0) {
        logger.info(`Cleaned up ${expiredCount} expired sessions`);
      }
      
      return expiredCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      throw error;
    }
  }

  static async getSuspiciousSessions(thresholdHours = 24) {
    const query = `
      SELECT 
        us.*,
        u.email,
        COUNT(*) OVER (PARTITION BY us.user_id) as user_session_count
      FROM user_sessions us
      LEFT JOIN users u ON us.user_id = u.id
      WHERE us.login_time >= NOW() - INTERVAL '${thresholdHours} hours'
        AND us.is_active = true
      GROUP BY us.id, u.email
      HAVING COUNT(*) OVER (PARTITION BY us.user_id) > 3  -- More than 3 sessions in threshold
      ORDER BY user_session_count DESC, us.login_time DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting suspicious sessions:', error);
      throw error;
    }
  }
}

module.exports = UserSession;