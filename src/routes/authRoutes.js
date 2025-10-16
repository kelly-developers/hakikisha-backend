const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Simple register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, phone, role = 'user' } = req.body;

    console.log('Registration attempt:', { email, role });

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

    // Insert user
    const result = await db.query(
      `INSERT INTO hakikisha.users 
       (email, password_hash, phone, role, registration_status, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, role, registration_status`,
      [email, passwordHash, phone, role, registrationStatus, role === 'user']
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: role === 'fact_checker' 
        ? 'Registration submitted for approval. You will be notified once reviewed.'
        : 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        registration_status: user.registration_status
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

// Simple login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // Find user
    const userResult = await db.query(
      `SELECT id, email, password_hash, role, registration_status, is_verified 
       FROM hakikisha.users WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
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