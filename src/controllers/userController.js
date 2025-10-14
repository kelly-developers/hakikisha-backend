const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');

class UserController {
  async getProfile(req, res) {
    try {
      const result = await db.query(
        `SELECT id, email, phone, profile_picture, is_verified, created_at 
         FROM users WHERE id = $1`,
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND'
        });
      }

      res.json({
        success: true,
        profile: result.rows[0]
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
        code: 'SERVER_ERROR'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const { username, phone, bio } = req.body;
      
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (username !== undefined) {
        updates.push(`email = $${paramCount}`);
        params.push(username);
        paramCount++;
      }

      if (phone !== undefined) {
        updates.push(`phone = $${paramCount}`);
        params.push(phone);
        paramCount++;
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
          code: 'VALIDATION_ERROR'
        });
      }

      updates.push(`updated_at = NOW()`);
      params.push(req.user.userId);

      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} 
         RETURNING id, email, phone, profile_picture, created_at`,
        params
      );

      res.json({
        success: true,
        message: 'Profile updated successfully',
        profile: result.rows[0]
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Profile update failed',
        code: 'SERVER_ERROR'
      });
    }
  }

  async uploadProfilePicture(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          code: 'VALIDATION_ERROR'
        });
      }

      // TODO: Upload to S3 or cloud storage
      const imageUrl = `/uploads/profiles/${req.user.userId}-${Date.now()}.jpg`;

      await db.query(
        'UPDATE users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
        [imageUrl, req.user.userId]
      );

      res.json({
        success: true,
        message: 'Profile picture uploaded',
        imageUrl
      });
    } catch (error) {
      logger.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload profile picture',
        code: 'SERVER_ERROR'
      });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current and new password are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Get current password hash
      const userResult = await db.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND'
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect',
          code: 'AUTH_INVALID'
        });
      }

      // Hash and update new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await db.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, req.user.userId]
      );

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getMyClaims(req, res) {
    try {
      const { status } = req.query;

      let query = `
        SELECT c.*, 
               COALESCE(v.verdict, av.verdict) as final_verdict
        FROM claims c
        LEFT JOIN verdicts v ON c.human_verdict_id = v.id
        LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
        WHERE c.user_id = $1
      `;
      
      const params = [req.user.userId];

      if (status && status !== 'all') {
        query += ` AND c.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY c.created_at DESC`;

      const result = await db.query(query, params);

      res.json({
        success: true,
        claims: result.rows
      });
    } catch (error) {
      logger.error('Get my claims error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user claims',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getNotifications(req, res) {
    try {
      const result = await db.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [req.user.userId]
      );

      res.json({
        success: true,
        notifications: result.rows
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get notifications',
        code: 'SERVER_ERROR'
      });
    }
  }

  async markNotificationAsRead(req, res) {
    try {
      await db.query(
        `UPDATE notifications 
         SET is_read = true, updated_at = NOW() 
         WHERE id = $1 AND user_id = $2`,
        [req.params.id, req.user.userId]
      );

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      logger.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getSearchHistory(req, res) {
    try {
      const result = await db.query(
        `SELECT * FROM search_logs 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 50`,
        [req.user.userId]
      );

      res.json({
        success: true,
        history: result.rows
      });
    } catch (error) {
      logger.error('Get search history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get search history',
        code: 'SERVER_ERROR'
      });
    }
  }

  async saveSearchHistory(req, res) {
    try {
      const { query, filters } = req.body;

      await db.query(
        `INSERT INTO search_logs (user_id, query, filters_applied, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [req.user.userId, query, JSON.stringify(filters || {})]
      );

      res.json({
        success: true,
        message: 'Search history saved'
      });
    } catch (error) {
      logger.error('Save search history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save search history',
        code: 'SERVER_ERROR'
      });
    }
  }
}

const userController = new UserController();
module.exports = userController;
