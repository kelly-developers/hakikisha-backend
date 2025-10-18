const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production';

// Middleware to verify token
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

// Get user profile (protected) - FIXED ENDPOINT
router.get('/profile', verifyToken, async (req, res) => {
  try {
    console.log('Get profile request for user:', req.user.userId);
    
    const userResult = await db.query(
      `SELECT id, email, full_name, phone_number, role, is_verified, registration_status, 
              profile_picture, login_count, last_login, created_at, updated_at
       FROM hakikisha.users WHERE id = $1`,
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    
    // Ensure consistent response format
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        is_verified: user.is_verified,
        profile_picture: user.profile_picture,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update user profile (protected)
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { full_name, phone_number, profile_picture } = req.body;
    const updates = {};
    
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone_number !== undefined) updates.phone_number = phone_number;
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

    const result = await db.query(
      `UPDATE hakikisha.users 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, email, full_name, phone_number, role, profile_picture, is_verified, registration_status, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete user account
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

// Get all users (admin only)
router.get('/', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const usersResult = await db.query(
      `SELECT id, email, full_name, phone_number, role, is_verified, registration_status, 
              login_count, last_login, created_at
       FROM hakikisha.users 
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await db.query('SELECT COUNT(*) FROM hakikisha.users');

    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Simple health check for user routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'User routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;