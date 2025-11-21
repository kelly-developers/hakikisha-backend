const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const twoFactorService = require('../services/twoFactorService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production';

// Validation constants
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

// Simple register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const { email, password, phone, role = 'user', username, full_name } = req.body;
    
    // Required fields validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format using regex
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format. Please provide a valid email address.'
      });
    }

    // Validate username if provided
    if (username && !USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username format. Username must be 3-30 characters long and contain only letters, numbers, and underscores.'
      });
    }

    const phoneInput = phone ?? req.body.phone_number ?? null;
    
    // Validate phone number - must not contain letters
    if (phoneInput) {
      const phoneRegex = /^\+?[\d\s\-()]+$/;
      if (!phoneRegex.test(phoneInput)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format. Phone number should only contain numbers, spaces, hyphens, and parentheses.'
        });
      }
    }

    console.log('Registration attempt:', { email, role });

    // Password validation
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

    // Check if username already exists (if provided)
    if (username) {
      const existingUsername = await db.query(
        'SELECT id FROM hakikisha.users WHERE username = $1',
        [username]
      );

      if (existingUsername.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists. Please choose a different username.'
        });
      }
    }

    // Use provided username or generate simple username from email (without random numbers)
    let finalUsername = username;
    if (!finalUsername) {
      // Simple username generation - just use the part before @
      finalUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Ensure basic username meets requirements
      if (finalUsername.length < 3) {
        finalUsername = 'user' + Date.now().toString().slice(-6);
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine registration status
    const registrationStatus = role === 'fact_checker' ? 'pending' : 'approved';
    // ALL USERS START AS UNVERIFIED - must verify email before login
    const isVerified = false;

    // Insert user
    const result = await db.query(
      `INSERT INTO hakikisha.users 
       (email, username, password_hash, phone, role, registration_status, is_verified, full_name) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, email, username, role, registration_status, is_verified, full_name`,
      [email, finalUsername, passwordHash, phoneInput, role, registrationStatus, isVerified, full_name]
    );

    const user = result.rows[0];

    // Generate and send email verification OTP for ALL users
    try {
      const otp = emailService.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.query(
        `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, otp, 'email_verification', expiresAt]
      );

      // Send verification email
      await emailService.sendEmailVerificationOTP(user.email, otp, user.username);
      console.log(`Email verification OTP sent to: ${user.email}`);
    } catch (otpError) {
      console.error('Failed to send verification email:', otpError);
      // Continue registration even if email fails - user can request resend
    }

    // If user is admin, automatically enable 2FA
    if (role === 'admin') {
      await twoFactorService.enable2FA(user.id, 'email');
      console.log(`2FA automatically enabled for admin: ${email}`);
    }

    // Generate temporary token (limited access until email verification)
    const tempToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        temp: true, // Mark as temporary until email verification
        is_verified: false
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Short expiry for temporary token
    );

    res.status(201).json({
      success: true,
      message: role === 'fact_checker' 
        ? 'Registration submitted for approval. Please verify your email to continue.'
        : 'Registration successful! Please check your email to verify your account before logging in.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        registration_status: user.registration_status,
        is_verified: user.is_verified,
        full_name: user.full_name
      },
      token: tempToken,
      requiresEmailVerification: true
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

// Enhanced login with email verification enforcement
router.post('/login', async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body;

    console.log('Login attempt:', { email, username, identifier });

    // Normalize identifier
    const emailOrUsername = (identifier ?? email ?? username ?? '').trim().toLowerCase();

    // Validate input
    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        error: 'Identifier (email or username) and password are required'
      });
    }

    // Find user by email OR username
    const userResult = await db.query(
      `SELECT id, email, username, password_hash, role, registration_status, is_verified, two_factor_enabled, status
       FROM hakikisha.users 
       WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
      [emailOrUsername]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Block suspended/inactive accounts
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended or deactivated. Please contact support for assistance.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // ENFORCE EMAIL VERIFICATION - Block login if email not verified
    if (!user.is_verified) {
      // Check if there's a pending verification OTP
      const pendingOTP = await db.query(
        `SELECT * FROM hakikisha.otp_codes 
         WHERE user_id = $1 AND type = 'email_verification' 
         AND expires_at > NOW() AND used = false
         ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );

      let message = 'Please verify your email address before logging in.';
      
      if (pendingOTP.rows.length === 0) {
        // No active OTP, generate and send a new one
        const otp = emailService.generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.query(
          `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [user.id, otp, 'email_verification', expiresAt]
        );

        await emailService.sendEmailVerificationOTP(user.email, otp, user.username);
        message += ' A new verification code has been sent to your email.';
      } else {
        message += ' Check your email for the verification code.';
      }

      return res.status(403).json({
        success: false,
        error: message,
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
        userId: user.id
      });
    }

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
        error: 'Invalid credentials'
      });
    }

    // Check if 2FA is required (admins always require 2FA)
    const requires2FA = user.role === 'admin' && user.two_factor_enabled;

    if (requires2FA) {
      // Generate and send OTP for 2FA
      await twoFactorService.generateAndSendOTP(
        user.id,
        user.email,
        user.username || user.email.split('@')[0]
      );

      // Return temporary token for 2FA verification
      const tempToken = jwt.sign(
        { userId: user.id, email: user.email, temp: true },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.json({
        success: true,
        requires2FA: true,
        message: '2FA code sent to your email',
        tempToken: tempToken,
        userId: user.id
      });
    }

    // If no 2FA required, generate final token and update login stats
    await db.query(
      'UPDATE hakikisha.users SET login_count = COALESCE(login_count, 0) + 1, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        is_verified: user.is_verified 
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

// Verify 2FA OTP with email verification check
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

    // ENFORCE EMAIL VERIFICATION before allowing 2FA login
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
        userId: user.id
      });
    }

    // Update login stats
    await db.query(
      'UPDATE hakikisha.users SET login_count = COALESCE(login_count, 0) + 1, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Update 2FA last used (optional - table may not exist)
    try {
      await db.query(
        'UPDATE hakikisha.two_factor_auth SET last_used = NOW() WHERE user_id = $1 AND is_enabled = true',
        [user.id]
      );
    } catch (updateError) {
      // Table doesn't exist yet - this is OK, continue with 2FA verification
      logger.warn('two_factor_auth table not found (optional tracking)', { userId: user.id });
    }

    // Generate final JWT token
    const finalToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        is_verified: user.is_verified 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Store session with both tokens
    const sessionId = require('uuid').v4();
    await db.query(
      `INSERT INTO hakikisha.user_sessions (id, user_id, token, refresh_token, expires_at, is_active)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', true)`,
      [sessionId, user.id, finalToken, refreshToken]
    );

    res.json({
      success: true,
      message: '2FA verification successful',
      token: finalToken,
      refreshToken: refreshToken,
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
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during 2FA verification'
    });
  }
});

// Email verification routes
router.post('/verify-email', async (req, res) => {
  try {
    console.log('Verify Email Request');
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'User ID and verification code are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check OTP for email verification
    const result = await db.query(
      `SELECT * FROM hakikisha.otp_codes 
       WHERE user_id = $1 AND code = $2 AND type = 'email_verification' 
       AND expires_at > NOW() AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code',
        code: 'INVALID_CODE'
      });
    }

    // Mark OTP as used
    await db.query(
      'UPDATE hakikisha.otp_codes SET used = true WHERE id = $1',
      [result.rows[0].id]
    );

    // Mark user as verified
    await db.query(
      'UPDATE hakikisha.users SET is_verified = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Get updated user data
    const userResult = await db.query(
      'SELECT id, email, username, role, is_verified, registration_status FROM hakikisha.users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    // Generate proper JWT token now that email is verified
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        is_verified: true 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log(`Email verified successfully for user: ${userId}`);

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status
      },
      token: token
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
});

// Resend Email Verification Code
router.post('/resend-verification', async (req, res) => {
  try {
    console.log('Resend Verification Code Request');
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Find user by email
    const userResult = await db.query(
      'SELECT id, email, username, is_verified FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Invalidate old OTPs
    await db.query(
      `UPDATE hakikisha.otp_codes SET used = true 
       WHERE user_id = $1 AND type = 'email_verification' AND used = false`,
      [user.id]
    );

    // Generate new OTP
    const otp = emailService.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, otp, 'email_verification', expiresAt]
    );

    await emailService.sendEmailVerificationOTP(user.email, otp, user.username);
    console.log(`Verification code resent to user: ${user.email}`);

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification code. Please try again.',
      code: 'SERVER_ERROR'
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

// Password reset endpoints - FIXED VERSION
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
        message: 'If the email exists, a password reset code has been sent'
      });
    }

    const user = userResult.rows[0];

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP expires in 15 minutes
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    // FIX: Use type instead of purpose, or provide both
    await db.query(
      `INSERT INTO hakikisha.otp_codes 
       (user_id, code, type, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, otp, 'password_reset', otpExpiry]
    );

    // Send OTP via email
    await emailService.sendPasswordResetCode(user.email, otp, user.username || user.email.split('@')[0]);

    logger.info(`Password reset OTP sent to: ${user.email}`);

    res.json({
      success: true,
      message: 'If the email exists, a password reset code has been sent'
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
        error: 'Code, email, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Find user by email
    const userResult = await db.query(
      'SELECT id, email FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset code'
      });
    }

    const user = userResult.rows[0];

    // FIX: Verify OTP using type instead of purpose
    const otpResult = await db.query(
      `SELECT id, code, expires_at, used 
       FROM hakikisha.otp_codes 
       WHERE user_id = $1 
       AND code = $2 
       AND type = $3 
       AND expires_at > NOW() 
       AND used = false
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, token, 'password_reset']
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset code'
      });
    }

    const otp = otpResult.rows[0];

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    await db.query(
      'UPDATE hakikisha.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, user.id]
    );

    // Mark the OTP as used
    await db.query(
      'UPDATE hakikisha.otp_codes SET used = true WHERE id = $1',
      [otp.id]
    );

    // Clean up expired/used OTPs
    await db.query(
      'DELETE FROM hakikisha.otp_codes WHERE expires_at <= NOW() OR used = true'
    );

    logger.info(`Password reset successful for user: ${email}`);

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
      'SELECT id, email, username, role, phone, is_verified, registration_status, two_factor_enabled, created_at, full_name FROM hakikisha.users WHERE id = $1',
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