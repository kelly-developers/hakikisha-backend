const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');

class UserController {
  async getProfile(req, res) {
    try {
      const result = await db.query(
        `SELECT id, email, username, phone, profile_picture, is_verified, role, status, created_at 
         FROM hakikisha.users WHERE id = $1`,
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
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        if (!usernameRegex.test(username)) {
          return res.status(400).json({
            success: false,
            error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens',
            code: 'VALIDATION_ERROR'
          });
        }

        // Check if username is already taken
        const existingUser = await db.query(
          'SELECT id FROM hakikisha.users WHERE username = $1 AND id != $2',
          [username, req.user.userId]
        );
        
        if (existingUser.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Username already taken',
            code: 'USERNAME_EXISTS'
          });
        }

        updates.push(`username = $${paramCount}`);
        params.push(username);
        paramCount++;
      }

      if (phone !== undefined) {
        if (phone) {
          // Validate phone format
          const phoneRegex = /^\+?[\d\s-()]{10,}$/;
          if (!phoneRegex.test(phone)) {
            return res.status(400).json({
              success: false,
              error: 'Invalid phone number format',
              code: 'VALIDATION_ERROR'
            });
          }

          // Check if phone is already registered
          const existingUser = await db.query(
            'SELECT id FROM hakikisha.users WHERE phone = $1 AND id != $2',
            [phone, req.user.userId]
          );
          
          if (existingUser.rows.length > 0) {
            return res.status(409).json({
              success: false,
              error: 'Phone number already registered',
              code: 'PHONE_EXISTS'
            });
          }
        }

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
        `UPDATE hakikisha.users SET ${updates.join(', ')} WHERE id = $${paramCount} 
         RETURNING id, email, username, phone, profile_picture, created_at`,
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
        'UPDATE hakikisha.users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
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

      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 6 characters long',
          code: 'VALIDATION_ERROR'
        });
      }

      // Get current password hash
      const userResult = await db.query(
        'SELECT password_hash FROM hakikisha.users WHERE id = $1',
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
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      await db.query(
        'UPDATE hakikisha.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
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
        FROM hakikisha.claims c
        LEFT JOIN hakikisha.verdicts v ON c.human_verdict_id = v.id
        LEFT JOIN hakikisha.ai_verdicts av ON c.ai_verdict_id = av.id
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

  async deleteAccount(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'Password is required to delete account',
          code: 'VALIDATION_ERROR'
        });
      }

      // Verify password
      const userResult = await db.query(
        'SELECT password_hash FROM hakikisha.users WHERE id = $1',
        [req.user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND'
        });
      }

      const isValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Password is incorrect',
          code: 'AUTH_INVALID'
        });
      }

      // Soft delete by updating status
      await db.query(
        'UPDATE hakikisha.users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', req.user.userId]
      );

      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        code: 'SERVER_ERROR'
      });
    }
  }
}

const userController = new UserController();
module.exports = userController;