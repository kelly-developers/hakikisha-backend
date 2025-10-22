const bcrypt = require('bcryptjs');
const db = require('../config/database');
const logger = require('../utils/logger');
const { PointsService } = require('../services/pointsService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profiles/';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with user ID and timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'profile-' + req.user.userId + '-' + uniqueSuffix + fileExtension);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

class UserController {
  async getProfile(req, res) {
    try {
      console.log('Get Profile Request for user:', req.user.userId);
      
      // First, ensure user points are initialized
      try {
        await PointsService.initializeUserPoints(req.user.userId);
        console.log('User points initialized/verified');
      } catch (initError) {
        console.log('Points initialization check:', initError.message);
      }

      // Get user basic info AND points in a single query with JOIN
      const result = await db.query(
        `SELECT 
          u.id, u.email, u.username, u.phone, u.profile_picture, 
          u.is_verified, u.role, u.registration_status, 
          u.created_at, u.last_login, u.login_count, u.updated_at,
          COALESCE(up.total_points, 0) as points,
          COALESCE(up.current_streak, 0) as current_streak,
          COALESCE(up.longest_streak, 0) as longest_streak,
          COALESCE(up.current_streak_days, 0) as current_streak_days,
          COALESCE(up.longest_streak_days, 0) as longest_streak_days,
          up.last_activity_date
         FROM hakikisha.users u
         LEFT JOIN hakikisha.user_points up ON u.id = up.user_id
         WHERE u.id = $1`,
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND'
        });
      }

      const userData = result.rows[0];
      
      // Use the correct column names (try both variations)
      const points = Number(userData.points) || 0;
      const currentStreak = Number(userData.current_streak) || Number(userData.current_streak_days) || 0;
      const longestStreak = Number(userData.longest_streak) || Number(userData.longest_streak_days) || 0;
      
      console.log('User profile data with points:', {
        points: points,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        raw_data: userData
      });

      // Build profile picture URL
      let profilePictureUrl = null;
      if (userData.profile_picture) {
        if (userData.profile_picture.startsWith('http')) {
          profilePictureUrl = userData.profile_picture;
        } else {
          profilePictureUrl = `${req.protocol}://${req.get('host')}/${userData.profile_picture}`;
        }
      }

      const responseData = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        full_name: userData.username,
        phone: userData.phone,
        phone_number: userData.phone,
        role: userData.role,
        profile_picture: profilePictureUrl,
        is_verified: userData.is_verified,
        registration_status: userData.registration_status,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        last_login: userData.last_login,
        login_count: userData.login_count,
        // Points data - directly from joined query
        points: points,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_date: userData.last_activity_date
      };

      res.json({
        success: true,
        data: responseData
      });
    } catch (error) {
      console.error('Get profile error:', error);
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
      console.log('Update Profile Request for user:', req.user.userId);
      const { username, phone, bio, full_name } = req.body;
      
      const updates = [];
      const params = [];
      let paramCount = 1;

      // Use full_name as username if provided, otherwise use username
      const nameToUpdate = full_name || username;
      
      if (nameToUpdate !== undefined) {
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        if (!usernameRegex.test(nameToUpdate)) {
          return res.status(400).json({
            success: false,
            error: 'Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens',
            code: 'VALIDATION_ERROR'
          });
        }

        // Check if username is already taken
        const existingUser = await db.query(
          'SELECT id FROM hakikisha.users WHERE username = $1 AND id != $2',
          [nameToUpdate, req.user.userId]
        );
        
        if (existingUser.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Username already taken',
            code: 'USERNAME_EXISTS'
          });
        }

        updates.push(`username = $${paramCount}`);
        params.push(nameToUpdate);
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
         RETURNING id, email, username, phone, profile_picture, created_at, updated_at`,
        params
      );

      // Award points for profile completion/update
      try {
        await PointsService.awardPoints(
          req.user.userId, 
          5, 
          'PROFILE_UPDATE', 
          'Updated profile information'
        );
        console.log('Points awarded for profile update');
      } catch (pointsError) {
        console.log('Could not award points for profile update:', pointsError.message);
      }

      // Get updated profile with points
      const updatedProfileResult = await db.query(
        `SELECT 
          u.id, u.email, u.username, u.phone, u.profile_picture, 
          u.created_at, u.updated_at,
          COALESCE(up.total_points, 0) as points,
          COALESCE(up.current_streak, 0) as current_streak,
          COALESCE(up.longest_streak, 0) as longest_streak,
          COALESCE(up.current_streak_days, 0) as current_streak_days,
          COALESCE(up.longest_streak_days, 0) as longest_streak_days
         FROM hakikisha.users u
         LEFT JOIN hakikisha.user_points up ON u.id = up.user_id
         WHERE u.id = $1`,
        [req.user.userId]
      );

      const updatedUserData = updatedProfileResult.rows[0];

      // Build profile picture URL
      let profilePictureUrl = null;
      if (updatedUserData.profile_picture) {
        if (updatedUserData.profile_picture.startsWith('http')) {
          profilePictureUrl = updatedUserData.profile_picture;
        } else {
          profilePictureUrl = `${req.protocol}://${req.get('host')}/${updatedUserData.profile_picture}`;
        }
      }

      const points = Number(updatedUserData.points) || 0;
      const currentStreak = Number(updatedUserData.current_streak) || Number(updatedUserData.current_streak_days) || 0;
      const longestStreak = Number(updatedUserData.longest_streak) || Number(updatedUserData.longest_streak_days) || 0;

      const responseData = {
        id: updatedUserData.id,
        email: updatedUserData.email,
        username: updatedUserData.username,
        full_name: updatedUserData.username,
        phone: updatedUserData.phone,
        phone_number: updatedUserData.phone,
        profile_picture: profilePictureUrl,
        created_at: updatedUserData.created_at,
        updated_at: updatedUserData.updated_at,
        points: points,
        current_streak: currentStreak,
        longest_streak: longestStreak
      };

      console.log('Sending updated profile with points:', {
        points: responseData.points,
        current_streak: responseData.current_streak,
        longest_streak: responseData.longest_streak
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: responseData
      });
    } catch (error) {
      console.error('Update profile error:', error);
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
      console.log('Upload Profile Picture Request for user:', req.user.userId);
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          code: 'VALIDATION_ERROR'
        });
      }

      // Build the file path (relative to uploads directory)
      const filePath = `uploads/profiles/${req.file.filename}`;
      
      // Build full URL for the profile picture
      const profilePictureUrl = `${req.protocol}://${req.get('host')}/${filePath}`;

      // Update user profile in database
      await db.query(
        'UPDATE hakikisha.users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
        [filePath, req.user.userId]
      );

      // Award points for adding profile picture
      try {
        await PointsService.awardPoints(
          req.user.userId, 
          10, 
          'PROFILE_PICTURE', 
          'Added profile picture'
        );
        console.log('Points awarded for profile picture');
      } catch (pointsError) {
        console.log('Could not award points for profile picture:', pointsError.message);
      }

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profile_picture: profilePictureUrl
        }
      });
    } catch (error) {
      console.error('Upload profile picture error:', error);
      logger.error('Upload profile picture error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload profile picture',
        code: 'SERVER_ERROR'
      });
    }
  }

  async deleteProfilePicture(req, res) {
    try {
      console.log('Delete Profile Picture Request for user:', req.user.userId);

      // Get current profile picture path
      const userResult = await db.query(
        'SELECT profile_picture FROM hakikisha.users WHERE id = $1',
        [req.user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND'
        });
      }

      const currentProfilePicture = userResult.rows[0].profile_picture;

      // Delete file from filesystem if it exists and is a local file
      if (currentProfilePicture && !currentProfilePicture.startsWith('http')) {
        try {
          if (fs.existsSync(currentProfilePicture)) {
            fs.unlinkSync(currentProfilePicture);
            console.log('Deleted profile picture file:', currentProfilePicture);
          }
        } catch (fileError) {
          console.log('Could not delete profile picture file:', fileError.message);
        }
      }

      // Update database to remove profile picture
      await db.query(
        'UPDATE hakikisha.users SET profile_picture = NULL, updated_at = NOW() WHERE id = $1',
        [req.user.userId]
      );

      res.json({
        success: true,
        message: 'Profile picture deleted successfully'
      });
    } catch (error) {
      console.error('Delete profile picture error:', error);
      logger.error('Delete profile picture error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete profile picture',
        code: 'SERVER_ERROR'
      });
    }
  }

  async changePassword(req, res) {
    try {
      console.log('Change Password Request for user:', req.user.userId);
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
      console.error('Change password error:', error);
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
      console.log('Get My Claims - User:', req.user.userId);
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
      console.error('Get my claims error:', error);
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
      console.log('Delete Account Request for user:', req.user.userId);
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
      console.error('Delete account error:', error);
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
        code: 'SERVER_ERROR'
      });
    }
  }

  // New endpoint to get points specifically
  async getPoints(req, res) {
    try {
      console.log('Get Points Request for user:', req.user.userId);
      
      // Ensure points are initialized
      try {
        await PointsService.initializeUserPoints(req.user.userId);
      } catch (initError) {
        console.log('Points initialization check in getPoints:', initError.message);
      }

      const result = await db.query(
        `SELECT 
          COALESCE(up.total_points, 0) as points,
          COALESCE(up.current_streak, 0) as current_streak,
          COALESCE(up.longest_streak, 0) as longest_streak,
          COALESCE(up.current_streak_days, 0) as current_streak_days,
          COALESCE(up.longest_streak_days, 0) as longest_streak_days,
          up.last_activity_date
         FROM hakikisha.user_points up
         WHERE up.user_id = $1`,
        [req.user.userId]
      );

      let pointsData = {
        points: 0,
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: null
      };

      if (result.rows.length > 0) {
        const row = result.rows[0];
        pointsData = {
          points: Number(row.points) || 0,
          current_streak: Number(row.current_streak) || Number(row.current_streak_days) || 0,
          longest_streak: Number(row.longest_streak) || Number(row.longest_streak_days) || 0,
          last_activity_date: row.last_activity_date
        };
      }

      console.log('Sending points response:', pointsData);

      res.json({
        success: true,
        data: pointsData
      });
    } catch (error) {
      console.error('Get points error:', error);
      logger.error('Get points error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get points',
        code: 'SERVER_ERROR'
      });
    }
  }
}

const userController = new UserController();
module.exports = { userController, upload };