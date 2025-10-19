const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const twoFactorService = require('../services/twoFactorService');
const emailService = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production';

// Helper function to generate username from email
function generateUsernameFromEmail(email) {
  const baseUsername = email.split('@')[0];
  // Remove special characters and ensure it's alphanumeric
  const cleanUsername = baseUsername.replace(/[^a-zA-Z0-9]/g, '');
  // Add random number to ensure uniqueness
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${cleanUsername}${randomSuffix}`;
}

// Simple register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password, phone, role = 'user', username } = req.body;

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

    // Generate username if not provided
    let finalUsername = username;
    if (!finalUsername) {
      finalUsername = generateUsernameFromEmail(email);
      
      // Ensure username is unique
      let usernameExists = true;
      let attempts = 0;
      while (usernameExists && attempts < 5) {
        const existingUsername = await db.query(
          'SELECT id FROM hakikisha.users WHERE username = $1',
          [finalUsername]
        );
        
        if (existingUsername.rows.length === 0) {
          usernameExists = false;
        } else {
          finalUsername = generateUsernameFromEmail(email);
          attempts++;
        }
      }
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
       (email, username, password_hash, phone, role, registration_status, is_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, email, username, role, registration_status, is_verified`,
      [email, finalUsername, passwordHash, phone, role, registrationStatus, isVerified]
    );

    const user = result.rows[0];

    // If user is admin, automatically enable 2FA
    if (role === 'admin') {
      await twoFactorService.enable2FA(user.id, 'email');
      console.log(`2FA automatically enabled for admin: ${email}`);
    }

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
        username: user.username,
        role: user.role,
        registration_status: user.registration_status,
        is_verified: user.is_verified
      },
      token: token
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      if (error.constraint.includes('email')) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      } else if (error.constraint.includes('username')) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists. Please try a different username.'
        });
      }
    } else if (error.code === '23502') { // Not null constraint violation
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Please check your input.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

// Enhanced login with 2FA for admins
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user by email
    const userResult = await db.query(
      `SELECT id, email, username, password_hash, role, registration_status, is_verified, two_factor_enabled
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
        error: 'Invalid email or password'
      });
    }

    // Check if 2FA is required (admins always require 2FA)
    const requires2FA = user.role === 'admin' && user.two_factor_enabled;

    if (requires2FA) {
      // Generate and send OTP for 2FA
      await twoFactorService.generateAndSendOTP(user.id, user.email, user.username || user.email.split('@')[0]);

      // Return temporary token for 2FA verification
      const tempToken = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          temp: true // Mark as temporary token
        },
        JWT_SECRET,
        { expiresIn: '15m' } // Short expiration for 2FA
      );

      return res.json({
        success: true,
        requires2FA: true,
        message: '2FA code sent to your email',
        tempToken: tempToken,
        userId: user.id
      });
    }

    // If no 2FA required, generate final token
    await db.query(
      'UPDATE hakikisha.users SET login_count = COALESCE(login_count, 0) + 1, last_login = NOW() WHERE id = $1',
      [user.id]
    );

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
      requires2FA: false,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status,
        two_factor_enabled: user.two_factor_enabled
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

// Verify 2FA OTP
router.post('/verify-2fa', async (req, res) => {
  try {
    const { tempToken, code, userId } = req.body;

    if ((!tempToken && !userId) || !code) {
      return res.status(400).json({
        success: false,
        error: 'Temporary token/user ID and OTP code are required'
      });
    }

    let decoded;
    let targetUserId = userId;

    // Verify temp token if provided
    if (tempToken) {
      try {
        decoded = jwt.verify(tempToken, JWT_SECRET);
        if (!decoded.temp) {
          return res.status(400).json({
            success: false,
            error: 'Invalid temporary token'
          });
        }
        targetUserId = decoded.userId;
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired temporary token'
        });
      }
    }

    // Verify OTP code
    const otpResult = await twoFactorService.verifyOTP(targetUserId, code);

    if (!otpResult.success) {
      return res.status(401).json({
        success: false,
        error: otpResult.error
      });
    }

    // Get user details
    const userResult = await db.query(
      `SELECT id, email, username, role, is_verified, registration_status, two_factor_enabled
       FROM hakikisha.users WHERE id = $1`,
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Update login stats
    await db.query(
      'UPDATE hakikisha.users SET login_count = COALESCE(login_count, 0) + 1, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Update 2FA last used
    await db.query(
      'UPDATE hakikisha.two_factor_auth SET last_used = NOW() WHERE user_id = $1 AND is_enabled = true',
      [user.id]
    );

    // Generate final JWT token
    const finalToken = jwt.sign(
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
      message: '2FA verification successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status,
        two_factor_enabled: user.two_factor_enabled
      },
      token: finalToken
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during 2FA verification'
    });
  }
});

// Resend 2FA OTP
router.post('/resend-2fa', async (req, res) => {
  try {
    const { tempToken, userId } = req.body;

    if (!tempToken && !userId) {
      return res.status(400).json({
        success: false,
        error: 'Temporary token or user ID is required'
      });
    }

    let decoded;
    let targetUserId = userId;

    // Verify temp token if provided
    if (tempToken) {
      try {
        decoded = jwt.verify(tempToken, JWT_SECRET);
        if (!decoded.temp) {
          return res.status(400).json({
            success: false,
            error: 'Invalid temporary token'
          });
        }
        targetUserId = decoded.userId;
      } catch (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired temporary token'
        });
      }
    }

    // Get user email
    const userResult = await db.query(
      'SELECT email, username FROM hakikisha.users WHERE id = $1',
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Resend OTP
    const result = await twoFactorService.resendOTP(targetUserId, user.email, user.username || user.email.split('@')[0]);

    res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn
    });

  } catch (error) {
    console.error('Resend 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend 2FA code'
    });
  }
});

// Enable 2FA for user
router.post('/enable-2fa', async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUser = req.user; // From auth middleware

    // Users can only enable their own 2FA, or admins can enable for others
    const targetUserId = userId || currentUser.userId;

    if (targetUserId !== currentUser.userId && currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const result = await twoFactorService.enable2FA(targetUserId, 'email');

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable 2FA'
    });
  }
});

// Disable 2FA for user
router.post('/disable-2fa', async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUser = req.user; // From auth middleware

    // Users can only disable their own 2FA, or admins can disable for others
    const targetUserId = userId || currentUser.userId;

    if (targetUserId !== currentUser.userId && currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const result = await twoFactorService.disable2FA(targetUserId);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable 2FA'
    });
  }
});

// Get 2FA status
router.get('/2fa-status', async (req, res) => {
  try {
    const { userId } = req.query;
    const currentUser = req.user; // From auth middleware

    // Users can only check their own 2FA status, or admins can check for others
    const targetUserId = userId || currentUser.userId;

    if (targetUserId !== currentUser.userId && currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    const status = await twoFactorService.get2FAStatus(targetUserId);

    res.json({
      success: true,
      twoFactorEnabled: status.enabled,
      method: status.method,
      lastUsed: status.lastUsed
    });

  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get 2FA status'
    });
  }
});

// Password reset endpoints
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if user exists
    const userResult = await db.query(
      'SELECT id, email, username FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal whether email exists or not
      return res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Token expires in 1 hour
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Create password_reset_tokens table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS hakikisha.password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES hakikisha.users(id),
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Store reset token in database
    await db.query(
      `INSERT INTO hakikisha.password_reset_tokens 
       (user_id, token_hash, expires_at) 
       VALUES ($1, $2, $3)`,
      [user.id, resetTokenHash, resetTokenExpiry]
    );

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken, user.username || user.email.split('@')[0]);

    console.log(`Password reset token sent to: ${user.email}`);

    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;

    if (!token || !email || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token, email, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const tokenResult = await db.query(
      `SELECT prt.*, u.id as user_id 
       FROM hakikisha.password_reset_tokens prt
       JOIN hakikisha.users u ON prt.user_id = u.id
       WHERE prt.token_hash = $1 
       AND u.email = $2 
       AND prt.expires_at > NOW() 
       AND prt.used = false`,
      [tokenHash, email]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await db.query(
      'UPDATE hakikisha.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, resetToken.user_id]
    );

    // Mark token as used
    await db.query(
      'UPDATE hakikisha.password_reset_tokens SET used = true WHERE id = $1',
      [resetToken.id]
    );

    // Clean up expired tokens
    await db.query(
      'DELETE FROM hakikisha.password_reset_tokens WHERE expires_at <= NOW() OR used = true'
    );

    console.log(`Password reset successful for user: ${email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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
      'SELECT id, email, username, role, is_verified, registration_status, two_factor_enabled FROM hakikisha.users WHERE id = $1',
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
        username: user.username,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status,
        two_factor_enabled: user.two_factor_enabled
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
      'SELECT id, email, username, role, phone, is_verified, registration_status, two_factor_enabled, created_at FROM hakikisha.users WHERE id = $1',
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