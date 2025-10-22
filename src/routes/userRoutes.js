const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { PointsService } = require('../services/pointsService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profiles/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'profile-' + req.user.userId + '-' + uniqueSuffix + fileExtension);
  }
});

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
    fileSize: 5 * 1024 * 1024
  }
});

const verifyToken = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// FIXED: Main profile endpoint with proper JOIN for points
router.get('/profile', verifyToken, async (req, res) => {
  try {
    console.log('Get profile request for user:', req.user.userId);
    
    // First ensure user points are initialized
    try {
      await PointsService.initializeUserPoints(req.user.userId);
      console.log('Points initialized for user:', req.user.userId);
    } catch (initError) {
      console.log('Points initialization error:', initError.message);
    }
    
    // FIXED: Proper JOIN with user_points table
    const userResult = await db.query(
      `SELECT 
        u.id, u.email, u.username, u.phone, u.role, u.is_verified, u.registration_status, 
        u.profile_picture, u.login_count, u.last_login, u.created_at, u.updated_at,
        COALESCE(up.total_points, 0) as points,
        COALESCE(up.current_streak, 0) as current_streak,
        COALESCE(up.longest_streak, 0) as longest_streak,
        up.last_activity_date
       FROM hakikisha.users u
       LEFT JOIN hakikisha.user_points up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    
    console.log('Raw user data from database:', {
      points: user.points,
      current_streak: user.current_streak,
      longest_streak: user.longest_streak
    });
    
    // Build profile picture URL if it exists
    let profilePictureUrl = null;
    if (user.profile_picture) {
      if (user.profile_picture.startsWith('http')) {
        profilePictureUrl = user.profile_picture;
      } else {
        profilePictureUrl = `${req.protocol}://${req.get('host')}/${user.profile_picture}`;
      }
    }
    
    // Format points data properly
    const pointsData = {
      points: Number(user.points) || 0,
      current_streak: Number(user.current_streak) || 0,
      longest_streak: Number(user.longest_streak) || 0,
      last_activity_date: user.last_activity_date
    };

    console.log('Final profile data with points:', pointsData);

    // Return the complete user profile with points
    const responseData = {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.username,
      phone_number: user.phone,
      phone: user.phone,
      role: user.role,
      is_verified: user.is_verified,
      profile_picture: profilePictureUrl,
      registration_status: user.registration_status,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login: user.last_login,
      login_count: user.login_count,
      // Include points data directly in the response
      points: pointsData.points,
      current_streak: pointsData.current_streak,
      longest_streak: pointsData.longest_streak,
      last_activity_date: pointsData.last_activity_date
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Additional endpoint to get just points
router.get('/points', verifyToken, async (req, res) => {
  try {
    console.log('Get Points Request for user:', req.user.userId);
    
    const pointsData = await PointsService.getUserPoints(req.user.userId);

    console.log('Points data:', pointsData);

    res.json({
      success: true,
      data: pointsData
    });
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get points',
      code: 'SERVER_ERROR'
    });
  }
});

// Update user profile - FIXED: Also return points data
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { full_name, username, phone_number, phone, profile_picture } = req.body;
    const updates = {};
    
    if (full_name !== undefined) updates.username = full_name;
    if (username !== undefined) updates.username = username;
    if (phone_number !== undefined) updates.phone = phone_number;
    if (phone !== undefined) updates.phone = phone;
    if (profile_picture !== undefined) updates.profile_picture = profile_picture;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
    const values = Object.values(updates);
    values.push(req.user.userId);

    // Update user profile
    const result = await db.query(
      `UPDATE hakikisha.users 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, email, username, phone, role, profile_picture, is_verified, registration_status, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    // Get updated points data
    const pointsData = await PointsService.getUserPoints(req.user.userId);

    let profilePictureUrl = null;
    if (user.profile_picture) {
      if (user.profile_picture.startsWith('http')) {
        profilePictureUrl = user.profile_picture;
      } else {
        profilePictureUrl = `${req.protocol}://${req.get('host')}/${user.profile_picture}`;
      }
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.username,
        phone_number: user.phone,
        phone: user.phone,
        role: user.role,
        profile_picture: profilePictureUrl,
        is_verified: user.is_verified,
        registration_status: user.registration_status,
        created_at: user.created_at,
        updated_at: user.updated_at,
        // Include points in the response
        points: pointsData.points,
        current_streak: pointsData.current_streak,
        longest_streak: pointsData.longest_streak
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// FIXED: Also update the auth profile endpoint to include points
router.get('/auth/profile', verifyToken, async (req, res) => {
  try {
    console.log('Get auth profile request for user:', req.user.userId);
    
    // Ensure points are initialized
    await PointsService.initializeUserPoints(req.user.userId);
    
    const result = await db.query(
      `SELECT 
        u.id, u.email, u.username, u.role, u.is_verified, u.registration_status,
        COALESCE(up.total_points, 0) as points,
        COALESCE(up.current_streak, 0) as current_streak,
        COALESCE(up.longest_streak, 0) as longest_streak
       FROM hakikisha.users u
       LEFT JOIN hakikisha.user_points up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    
    const points = Number(user.points) || 0;
    const currentStreak = Number(user.current_streak) || 0;
    const longestStreak = Number(user.longest_streak) || 0;

    console.log('Auth profile with points:', { points, currentStreak, longestStreak });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status,
        points: points,
        current_streak: currentStreak,
        longest_streak: longestStreak
      }
    });
  } catch (error) {
    console.error('Get auth profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      code: 'SERVER_ERROR'
    });
  }
});

// Rest of the endpoints remain the same...
router.post('/profile-picture', verifyToken, upload.single('profile_picture'), async (req, res) => {
  try {
    console.log('Upload Profile Picture Request for user:', req.user.userId);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
        code: 'VALIDATION_ERROR'
      });
    }

    const filePath = `uploads/profiles/${req.file.filename}`;
    const profilePictureUrl = `${req.protocol}://${req.get('host')}/${filePath}`;

    await db.query(
      'UPDATE hakikisha.users SET profile_picture = $1, updated_at = NOW() WHERE id = $2',
      [filePath, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profile_picture: profilePictureUrl
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture',
      code: 'SERVER_ERROR'
    });
  }
});

router.delete('/profile-picture', verifyToken, async (req, res) => {
  try {
    console.log('Delete Profile Picture Request for user:', req.user.userId);

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
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile picture',
      code: 'SERVER_ERROR'
    });
  }
});

router.post('/change-password', verifyToken, async (req, res) => {
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long',
        code: 'VALIDATION_ERROR'
      });
    }

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

    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        code: 'AUTH_INVALID'
      });
    }

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
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/points/history', verifyToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const history = await PointsService.getPointsHistory(
      req.user.userId, 
      parseInt(limit), 
      parseInt(offset)
    );

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Get points history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get points history',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/leaderboard', verifyToken, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const leaderboard = await PointsService.getLeaderboard(parseInt(limit));

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      code: 'SERVER_ERROR'
    });
  }
});

router.get('/claims', verifyToken, async (req, res) => {
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
    res.status(500).json({
      success: false,
      error: 'Failed to get user claims',
      code: 'SERVER_ERROR'
    });
  }
});

router.delete('/account', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM hakikisha.users WHERE id = $1 RETURNING id',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'User routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;