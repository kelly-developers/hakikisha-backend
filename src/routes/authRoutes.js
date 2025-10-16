const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production';

// Simple register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, phone, role = 'user' } = req.body;

    console.log('Registration attempt:', { email, role });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine registration status
    const registrationStatus = role === 'fact_checker' ? 'pending' : 'approved';
    const isVerified = role === 'user'; // Auto-verify regular users

    // Insert user
    const result = await db.query(
      `INSERT INTO hakikisha.users 
       (email, password_hash, phone, role, registration_status, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, role, registration_status, is_verified`,
      [email, passwordHash, phone, role, registrationStatus, isVerified]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: role === 'fact_checker' 
        ? 'Registration submitted for approval. You will be notified once reviewed.'
        : 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        registration_status: user.registration_status,
        is_verified: user.is_verified
      },
      token: token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

// Enhanced login endpoint that accepts email or username
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    console.log('Login attempt:', { email, username });

    // Validate input - accept either email or username
    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/username and password are required'
      });
    }

    // Find user by email or username
    let userResult;
    if (email) {
      userResult = await db.query(
        `SELECT id, email, password_hash, role, registration_status, is_verified 
         FROM hakikisha.users WHERE email = $1`,
        [email]
      );
    } else {
      // If using username, we need to check if username field exists or use email as username
      userResult = await db.query(
        `SELECT id, email, password_hash, role, registration_status, is_verified 
         FROM hakikisha.users WHERE email = $1`,
        [username] // For now, treat username as email since we don't have separate username field
      );
    }

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password'
      });
    }

    const user = userResult.rows[0];

    // Check registration status
    if (user.registration_status === 'pending') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval'
      });
    }

    if (user.registration_status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Your account registration was rejected'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password'
      });
    }

    // Update login stats
    await db.query(
      'UPDATE hakikisha.users SET login_count = COALESCE(login_count, 0) + 1, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status
      },
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

// Verify token endpoint
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists
    const userResult = await db.query(
      'SELECT id, email, role, is_verified, registration_status FROM hakikisha.users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    const userResult = await db.query(
      'SELECT id, email, role, phone, is_verified, registration_status, created_at FROM hakikisha.users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Simple health check for auth routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;