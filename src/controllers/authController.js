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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
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
        error: 'User already exists with this email',
        code: 'USER_EXISTS'
      });
    }

    if (username) {
      const existingUsername = await db.query(
        'SELECT id FROM hakikisha.users WHERE username = $1',
        [username]
      );

      if (existingUsername.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken',
          code: 'USERNAME_EXISTS'
        });
      }
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

    try {
      await PointsService.initializeUserPoints(user.id);
      console.log('User points initialized for new user');
      
      const pointsResult = await PointsService.awardPoints(
        user.id,
        POINTS.PROFILE_COMPLETION,
        'PROFILE_COMPLETION',
        'Completed registration and profile setup'
      );
      console.log('Registration points awarded:', pointsResult.pointsAwarded);
    } catch (pointsError) {
      console.log('Points initialization or award failed:', pointsError.message);
    }

    try {
      await emailService.sendWelcomeEmail(user.email, user.username);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    logger.info(`New user registered: ${user.email} with ID: ${user.id}`);

    res.status(201).json({
      success: true,
      message: role === 'fact_checker' 
        ? 'Registration submitted for approval. You will be notified once reviewed.'
        : 'Registration successful! You can now login to your account.',
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
      error: 'Registration failed. Please try again.',
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
        error: 'Email/username and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // UPDATED: Support login with either email OR username
    const userResult = await db.query(
      `SELECT id, email, username, password_hash, role, is_verified, registration_status, 
              two_factor_enabled, status, login_count, last_login
       FROM hakikisha.users 
       WHERE email = $1 OR username = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      logger.warn(`Failed login attempt for non-existent email/username: ${email}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password',
        code: 'AUTH_INVALID'
      });
    }

    const user = userResult.rows[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended or deactivated. Please contact support.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      logger.warn(`Failed login attempt for user: ${user.email} - Invalid password`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'AUTH_INVALID'
      });
    }

    if (user.registration_status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending approval. You will be notified once approved.',
        code: 'ACCOUNT_PENDING'
      });
    }

    if (user.role === 'admin' || user.two_factor_enabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.query(
        'DELETE FROM hakikisha.otp_codes WHERE user_id = $1 AND type = $2',
        [user.id, '2fa']
      );

      await db.query(
        'INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
        [user.id, otp, '2fa', expiresAt]
      );

      try {
        await emailService.send2FACode(user.email, otp, user.username);
        logger.info(`2FA code sent to user: ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send 2FA email:', emailError);
        logger.error(`Failed to send 2FA email to user: ${user.email}`, emailError);
      }

      return res.json({
        success: true,
        requires2FA: true,
        userId: user.id,
        message: 'Verification code sent to your email'
      });
    }

    await db.query(
      'UPDATE hakikisha.users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    try {
      const pointsResult = await PointsService.awardPointsForDailyLogin(user.id);
      console.log('Daily login points awarded:', pointsResult.pointsAwarded, 'Streak:', pointsResult.newStreak);
    } catch (pointsError) {
      console.log('Could not award login points:', pointsError.message);
    }

    const token = generateJWTToken(user);
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO hakikisha.user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $3, refresh_token = $4, expires_at = NOW() + INTERVAL '24 hours', last_accessed = NOW()`,
      [sessionId, user.id, token, refreshToken]
    );

    logger.info(`User logged in successfully: ${user.email}`);

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
        is_verified: user.is_verified,
        registration_status: user.registration_status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.',
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
        error: 'User ID and verification code are required',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Verification code must be 6 digits',
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
        error: 'Invalid or expired verification code',
        code: 'AUTH_INVALID'
      });
    }

    await db.query(
      'UPDATE hakikisha.otp_codes SET used = true, used_at = NOW() WHERE id = $1',
      [result.rows[0].id]
    );

    const userResult = await db.query(
      'SELECT id, email, username, role, is_verified, registration_status FROM hakikisha.users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    await db.query(
      'UPDATE hakikisha.users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    try {
      const pointsResult = await PointsService.awardPointsForDailyLogin(user.id);
      console.log('2FA login points awarded:', pointsResult.pointsAwarded, 'Streak:', pointsResult.newStreak);
    } catch (pointsError) {
      console.log('Could not award 2FA login points:', pointsError.message);
    }

    const token = generateJWTToken(user);
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO hakikisha.user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $3, refresh_token = $4, expires_at = NOW() + INTERVAL '24 hours', last_accessed = NOW()`,
      [sessionId, user.id, token, refreshToken]
    );

    logger.info(`2FA verification successful for user: ${user.email}`);

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
        is_verified: user.is_verified,
        registration_status: user.registration_status
      }
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    logger.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed. Please try again.',
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        code: 'VALIDATION_ERROR'
      });
    }

    const userResult = await db.query(
      'SELECT id, email, username FROM hakikisha.users WHERE email = $1 AND status = $2',
      [email, 'active']
    );

    if (userResult.rows.length === 0) {
      logger.info(`Password reset requested for non-existent email: ${email}`);
      return res.json({
        success: true,
        message: 'If the email exists, a password reset code has been sent'
      });
    }

    const user = userResult.rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      'DELETE FROM hakikisha.otp_codes WHERE user_id = $1 AND type = $2',
      [user.id, 'password_reset']
    );

    await db.query(
      'INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, resetCode, 'password_reset', expiresAt]
    );

    try {
      await emailService.sendPasswordResetCode(user.email, resetCode, user.username);
      logger.info(`Password reset code sent to user: ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      logger.error(`Failed to send password reset email to user: ${user.email}`, emailError);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to send reset code. Please try again.',
        code: 'EMAIL_ERROR'
      });
    }

    res.json({
      success: true,
      message: 'Password reset code sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request. Please try again.',
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
        code: 'VALIDATION_ERROR'
      });
    }

    if (!/^\d{6}$/.test(resetCode)) {
      return res.status(400).json({
        success: false,
        error: 'Reset code must be 6 digits',
        code: 'VALIDATION_ERROR'
      });
    }

    const userResult = await db.query(
      'SELECT id FROM hakikisha.users WHERE email = $1 AND status = $2',
      [email, 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found or account is inactive',
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
      'UPDATE hakikisha.otp_codes SET used = true, used_at = NOW() WHERE id = $1',
      [otpResult.rows[0].id]
    );

    await db.query(
      'DELETE FROM hakikisha.user_sessions WHERE user_id = $1',
      [userId]
    );

    logger.info(`Password reset successful for user: ${userId}`);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password. Please try again.',
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

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'AUTH_INVALID'
      });
    }

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
      'SELECT id, email, role, status FROM hakikisha.users WHERE id = $1',
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

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

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

    logger.info(`Token refreshed for user: ${user.email}`);

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
      logger.info(`User logged out: ${req.user.userId}`);
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

const logoutAllDevices = async (req, res) => {
  try {
    console.log('Logout All Devices Request');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        code: 'AUTH_REQUIRED'
      });
    }

    await db.query(
      'DELETE FROM hakikisha.user_sessions WHERE user_id = $1',
      [req.user.userId]
    );

    logger.info(`All devices logged out for user: ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all devices error:', error);
    logger.error('Logout all devices error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from all devices',
      code: 'SERVER_ERROR'
    });
  }
};

// In your authController.js, update the getCurrentUser function:
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

    // Ensure points are initialized
    try {
      await PointsService.initializeUserPoints(req.user.userId);
      console.log('User points initialized/verified in getCurrentUser');
    } catch (initError) {
      console.log('Points initialization check in getCurrentUser:', initError.message);
    }

    // FIXED: Use the JOIN query
    const result = await db.query(
      `SELECT 
        u.id, u.email, u.username, u.phone, u.profile_picture, 
        u.is_verified, u.role, u.registration_status, 
        u.created_at, u.last_login, u.login_count, u.updated_at,
        COALESCE(up.total_points, 0) as points,
        COALESCE(up.current_streak, 0) as current_streak,
        COALESCE(up.longest_streak, 0) as longest_streak,
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
    
    const points = Number(userData.points) || 0;
    const currentStreak = Number(userData.current_streak) || 0;
    const longestStreak = Number(userData.longest_streak) || 0;
    
    console.log('Current user data with points:', {
      points: points,
      current_streak: currentStreak,
      longest_streak: longestStreak
    });

    res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        phone: userData.phone,
        role: userData.role,
        profile_picture: userData.profile_picture,
        is_verified: userData.is_verified,
        registration_status: userData.registration_status,
        created_at: userData.created_at,
        last_login: userData.last_login,
        login_count: userData.login_count,
        points: points,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_activity_date: userData.last_activity_date
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
      code: 'SERVER_ERROR'
    });
  }
};

const checkAuth = async (req, res) => {
  try {
    console.log('Check Auth Request');
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        code: 'AUTH_REQUIRED'
      });
    }

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
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = result.rows[0];
    
    const points = Number(user.points) || 0;
    const currentStreak = Number(user.current_streak) || 0;
    const longestStreak = Number(user.longest_streak) || 0;

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
    console.error('Check auth error:', error);
    logger.error('Check auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify authentication',
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
  logoutAllDevices,
  getCurrentUser,
  checkAuth
};