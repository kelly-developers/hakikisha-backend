const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { PointsService, POINTS } = require('../services/pointsService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const generateJWTToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
};

const register = async (req, res) => {
  try {
    console.log('Register Request Received');
    const { email, username, password, phone, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const existingUser = await db.query(
      'SELECT id FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User already exists',
        code: 'USER_EXISTS'
      });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    const registrationStatus = role === 'fact_checker' ? 'pending' : 'approved';
    const isVerified = role !== 'fact_checker';

    const result = await db.query(
      `INSERT INTO hakikisha.users (id, email, username, password_hash, phone, role, registration_status, is_verified, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', NOW(), NOW())
       RETURNING id, email, username, role, registration_status, is_verified, created_at`,
      [userId, email, username || email.split('@')[0], password_hash, phone || null, role, registrationStatus, isVerified]
    );

    const user = result.rows[0];

    // Initialize points for new user
    try {
      await PointsService.initializeUserPoints(user.id);
      console.log('User points initialized');
    } catch (pointsError) {
      console.log('Points initialization skipped:', pointsError.message);
    }

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
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    logger.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'SERVER_ERROR'
    });
  }
};

const login = async (req, res) => {
  try {
    console.log('Login Request Received');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const userResult = await db.query(
      'SELECT id, email, username, password_hash, role, is_verified, registration_status, two_factor_enabled, status FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'AUTH_INVALID'
      });
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended or deactivated',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        code: 'AUTH_INVALID'
      });
    }

    if (user.registration_status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Account pending approval',
        code: 'ACCOUNT_PENDING'
      });
    }

    if (user.role === 'admin' || user.two_factor_enabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.query(
        'INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
        [user.id, otp, '2fa', expiresAt]
      );

      try {
        await emailService.send2FACode(user.email, otp, user.username);
      } catch (emailError) {
        console.error('Failed to send 2FA email:', emailError);
      }

      return res.json({
        success: true,
        requires2FA: true,
        userId: user.id,
        message: '2FA code sent to your email'
      });
    }

    // Update login stats but don't award points yet
    await db.query(
      'UPDATE hakikisha.users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1',
      [user.id]
    );

    // Note: Points are NOT awarded here - only when user actually engages with content

    const token = generateJWTToken(user);

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO hakikisha.user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW())`,
      [sessionId, user.id, token, refreshToken]
    );

    console.log('Login successful for user:', user.email);
    console.log('JWT Token generated');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'SERVER_ERROR'
    });
  }
};

const verify2FA = async (req, res) => {
  try {
    console.log('Verify 2FA Request');
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'User ID and 2FA code are required',
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await db.query(
      'SELECT * FROM hakikisha.otp_codes WHERE user_id = $1 AND code = $2 AND type = $3 AND expires_at > NOW() AND used = false',
      [userId, code, '2fa']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired 2FA code',
        code: 'AUTH_INVALID'
      });
    }

    await db.query(
      'UPDATE hakikisha.otp_codes SET used = true WHERE id = $1',
      [result.rows[0].id]
    );

    const userResult = await db.query(
      'SELECT id, email, username, role, is_verified FROM hakikisha.users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    await db.query(
      'UPDATE hakikisha.users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1',
      [user.id]
    );

    // Note: Points are NOT awarded for 2FA verification either

    const token = generateJWTToken(user);

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO hakikisha.user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW())`,
      [sessionId, user.id, token, refreshToken]
    );

    console.log('2FA verification successful for user:', user.email);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_verified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    logger.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      code: 'SERVER_ERROR'
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    console.log('Forgot Password Request');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const userResult = await db.query(
      'SELECT id, email, username FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists, a password reset code has been sent'
      });
    }

    const user = userResult.rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      'INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, resetCode, 'password_reset', expiresAt]
    );

    try {
      await emailService.sendPasswordResetCode(user.email, resetCode, user.username);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    res.json({
      success: true,
      message: 'Password reset code sent to email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
      code: 'SERVER_ERROR'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    console.log('Reset Password Request');
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, reset code, and new password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
        code: 'VALIDATION_ERROR'
      });
    }

    const userResult = await db.query(
      'SELECT id FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const userId = userResult.rows[0].id;

    const otpResult = await db.query(
      'SELECT * FROM hakikisha.otp_codes WHERE user_id = $1 AND code = $2 AND type = $3 AND expires_at > NOW() AND used = false',
      [userId, resetCode, 'password_reset']
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired reset code',
        code: 'AUTH_INVALID'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await db.query(
      'UPDATE hakikisha.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    await db.query(
      'UPDATE hakikisha.otp_codes SET used = true WHERE id = $1',
      [otpResult.rows[0].id]
    );

    await db.query(
      'DELETE FROM hakikisha.user_sessions WHERE user_id = $1',
      [userId]
    );

    console.log('Password reset successful for user:', userId);

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      code: 'SERVER_ERROR'
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    console.log('Refresh Token Request');
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type',
        code: 'AUTH_INVALID'
      });
    }

    const session = await db.query(
      'SELECT user_id FROM hakikisha.user_sessions WHERE refresh_token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (session.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'AUTH_INVALID'
      });
    }

    const userResult = await db.query(
      'SELECT id, email, role FROM hakikisha.users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    const newToken = generateJWTToken(user);

    const newRefreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    await db.query(
      `UPDATE hakikisha.user_sessions 
       SET token = $1, refresh_token = $2, expires_at = NOW() + INTERVAL '24 hours', last_accessed = NOW()
       WHERE refresh_token = $3`,
      [newToken, newRefreshToken, refreshToken]
    );

    res.json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token',
      code: 'AUTH_INVALID'
    });
  }
};

const logout = async (req, res) => {
  try {
    console.log('Logout Request');
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (req.user && token) {
      await db.query(
        'DELETE FROM hakikisha.user_sessions WHERE user_id = $1 AND token = $2',
        [req.user.userId, token]
      );
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'SERVER_ERROR'
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    console.log('Get Current User Request');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        code: 'AUTH_REQUIRED'
      });
    }

    const result = await db.query(
      'SELECT id, email, username, phone, role, profile_picture, is_verified, registration_status, created_at FROM hakikisha.users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    // Get user points information
    let pointsInfo = {};
    try {
      pointsInfo = await PointsService.getUserPoints(req.user.userId);
    } catch (pointsError) {
      console.log('Could not fetch points info:', pointsError.message);
    }

    const user = result.rows[0];
    
    res.json({
      success: true,
      user: {
        ...user,
        points: pointsInfo.total_points || 0,
        current_streak: pointsInfo.current_streak_days || 0,
        longest_streak: pointsInfo.longest_streak_days || 0
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  register,
  login,
  verify2FA,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getCurrentUser
};