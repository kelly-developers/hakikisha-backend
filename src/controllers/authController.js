const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const speakeasy = require('speakeasy');
const db = require('../config/database');
const logger = require('../utils/logger');
const { PointsService, POINTS } = require('../services/pointsService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

class AuthController {
  async register(req, res) {
    try {
      const { email, password, full_name, phone_number } = req.body;

      if (!email || !password || !full_name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password, and full name are required'
        });
      }

      // Check if user exists
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'User already exists',
          code: 'USER_EXISTS'
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      // Create user
      const result = await db.query(
        `INSERT INTO users (id, email, password_hash, phone, role, is_verified, registration_status, created_at)
         VALUES ($1, $2, $3, $4, 'user', false, 'approved', NOW())
         RETURNING id, email, phone, role, is_verified, created_at`,
        [userId, email, password_hash, phone_number || null]
      );

      const user = result.rows[0];

      // Initialize points for new user
      await PointsService.initializeUserPoints(user.id);

      // Award points for first registration
      await PointsService.awardPoints(user.id, POINTS.COMPLETE_PROFILE, 'REGISTRATION', 'Completed registration');

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refresh_token = jwt.sign(
        { userId: user.id, email: user.email, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
      );

      // Store session
      const sessionId = uuidv4();
      await db.query(
        `INSERT INTO user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed, is_active)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW(), true)`,
        [sessionId, user.id, token, refresh_token]
      );

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: full_name
          },
          token,
          refresh_token
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'SERVER_ERROR'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Find user
      const userResult = await db.query(
        'SELECT id, email, password_hash, role, is_verified, phone, two_factor_enabled, two_factor_secret FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'AUTH_INVALID'
        });
      }

      const user = userResult.rows[0];

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'AUTH_INVALID'
        });
      }

      // Check if 2FA is enabled for admin
      if (user.role === 'admin' && user.two_factor_enabled) {
        // Return temporary token for 2FA verification
        const tempToken = jwt.sign(
          { userId: user.id, email: user.email, role: user.role, require2FA: true },
          JWT_SECRET,
          { expiresIn: '10m' }
        );

        return res.json({
          success: true,
          requires2FA: true,
          tempToken
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1',
        [user.id]
      );

      // Award daily login points for regular users
      if (user.role === 'user') {
        await PointsService.awardPoints(user.id, POINTS.DAILY_LOGIN, 'DAILY_LOGIN', 'Daily login bonus');
      }

      // Generate tokens
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refresh_token = jwt.sign(
        { userId: user.id, email: user.email, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
      );

      // Store session
      const sessionId = uuidv4();
      await db.query(
        `INSERT INTO user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed, is_active)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW(), true)`,
        [sessionId, user.id, token, refresh_token]
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name || '',
            role: user.role
          },
          token,
          refresh_token
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'SERVER_ERROR'
      });
    }
  }

  async verify2FA(req, res) {
    try {
      const { tempToken, code } = req.body;

      if (!tempToken || !code) {
        return res.status(400).json({
          success: false,
          error: 'Temporary token and 2FA code are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Verify temp token
      const decoded = jwt.verify(tempToken, JWT_SECRET);

      if (!decoded.require2FA) {
        return res.status(400).json({
          success: false,
          error: 'Invalid token',
          code: 'AUTH_INVALID'
        });
      }

      // Get user's 2FA secret
      const userResult = await db.query(
        'SELECT id, email, role, two_factor_secret FROM users WHERE id = $1',
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

      // Verify 2FA code
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time steps before and after
      });

      if (!verified) {
        return res.status(401).json({
          success: false,
          error: 'Invalid 2FA code',
          code: 'AUTH_INVALID'
        });
      }

      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1',
        [user.id]
      );

      // Generate actual tokens
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const refresh_token = jwt.sign(
        { userId: user.id, email: user.email, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
      );

      // Store session
      const sessionId = uuidv4();
      await db.query(
        `INSERT INTO user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed, is_active)
         VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW(), true)`,
        [sessionId, user.id, token, refresh_token]
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role
          },
          token,
          refresh_token
        }
      });
    } catch (error) {
      logger.error('2FA verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify 2FA',
        code: 'SERVER_ERROR'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'VALIDATION_ERROR'
        });
      }

      const decoded = jwt.verify(refresh_token, JWT_SECRET);

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check session
      const session = await db.query(
        'SELECT user_id FROM user_sessions WHERE refresh_token = $1 AND expires_at > NOW() AND is_active = true',
        [refresh_token]
      );

      if (session.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
          code: 'AUTH_INVALID'
        });
      }

      // Get user
      const userResult = await db.query(
        'SELECT id, email, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Generate new tokens
      const newToken = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const newRefreshToken = jwt.sign(
        { userId: user.id, email: user.email, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
      );

      // Update session
      await db.query(
        `UPDATE user_sessions 
         SET token = $1, refresh_token = $2, expires_at = NOW() + INTERVAL '24 hours', last_accessed = NOW()
         WHERE refresh_token = $3`,
        [newToken, newRefreshToken, refresh_token]
      );

      res.json({
        success: true,
        data: {
          token: newToken,
          refresh_token: newRefreshToken
        }
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        code: 'AUTH_INVALID'
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Check if user exists
      const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);

      if (userResult.rows.length > 0) {
        // Generate reset token
        const resetToken = uuidv4();
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await db.query(
          'UPDATE users SET verification_token = $1, updated_at = NOW() WHERE email = $2',
          [resetToken, email]
        );

        // TODO: Send email with reset link
        logger.info(`Password reset requested for: ${email}, token: ${resetToken}`);
      }

      // Always return success for security
      res.json({
        success: true,
        message: 'Password reset link sent to email'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process request',
        code: 'SERVER_ERROR'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, new_password } = req.body;

      if (!token || !new_password) {
        return res.status(400).json({
          success: false,
          error: 'Token and new password are required',
          code: 'VALIDATION_ERROR'
        });
      }

      // Find user with reset token
      const userResult = await db.query(
        'SELECT id FROM users WHERE verification_token = $1',
        [token]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token',
          code: 'AUTH_INVALID'
        });
      }

      const user = userResult.rows[0];

      // Hash new password
      const password_hash = await bcrypt.hash(new_password, 10);

      // Update password and clear reset token
      await db.query(
        'UPDATE users SET password_hash = $1, verification_token = NULL, updated_at = NOW() WHERE id = $2',
        [password_hash, user.id]
      );

      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
        code: 'SERVER_ERROR'
      });
    }
  }

  async logout(req, res) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (req.user && token) {
        await db.query(
          'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND token = $2',
          [req.user.userId, token]
        );
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'SERVER_ERROR'
      });
    }
  }

  async getCurrentUser(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED'
        });
      }

      const result = await db.query(
        'SELECT id, email, phone, role, profile_picture, is_verified, created_at FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'NOT_FOUND'
        });
      }

      // Get points for regular users
      let points = null;
      if (result.rows[0].role === 'user') {
        points = await PointsService.getUserPoints(req.user.userId);
      }

      res.json({
        success: true,
        user: {
          ...result.rows[0],
          points
        }
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
        code: 'SERVER_ERROR'
      });
    }
  }
}

const authController = new AuthController();
module.exports = authController;
