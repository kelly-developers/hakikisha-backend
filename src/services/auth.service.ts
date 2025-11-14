import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { User } from '../types/models';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export class AuthService {
  static async register(email: string, password: string, phone?: string, role: string = 'user') {
    // Trim and normalize inputs
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone ? phone.trim() : null;
    
    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    
    if (existing.rows.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    // For normal users, set is_verified to false initially (needs email verification)
    // For admin/fact_checker, they verify via 2FA on login
    const isVerified = role === 'admin' || role === 'fact_checker' ? false : false;

    // Create user
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, phone, role, registration_status, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, email, role, is_verified, registration_status, created_at`,
      [id, trimmedEmail, password_hash, trimmedPhone, role, 'pending', isVerified]
    );

    const user = result.rows[0];

    // Send email verification OTP for normal users
    if (role === 'user') {
      const emailService = require('./emailService');
      const otp = emailService.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.query(
        `INSERT INTO hakikisha.otp_codes (user_id, code, purpose, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [id, otp, 'email_verification', expiresAt]
      );

      await emailService.sendEmailVerificationOTP(trimmedEmail, otp);

      return {
        ...user,
        requiresEmailVerification: true,
        message: 'Registration successful. Please check your email for verification code.'
      };
    }

    return user;
  }

  static async login(email: string, password: string) {
    // Trim and normalize input - support both email and username
    const trimmedEmailOrUsername = email.trim().toLowerCase();
    
    // Find user by email or username
    const userResult = await db.query(
      'SELECT id, email, password_hash, role, is_verified, registration_status FROM users WHERE LOWER(email) = $1 OR username = $2',
      [trimmedEmailOrUsername, email.trim()]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user needs email verification (normal users only)
    if (user.role === 'user' && !user.is_verified) {
      throw new Error('Please verify your email before logging in. Check your inbox for the verification code.');
    }

    // Check registration status
    if (user.registration_status !== 'approved') {
      throw new Error('Account pending approval');
    }

    // Send 2FA OTP for admin and fact_checker
    if (user.role === 'admin' || user.role === 'fact_checker') {
      const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

      await db.query(
        `INSERT INTO hakikisha.otp_codes (user_id, code, purpose, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, twoFactorCode, '2fa_login', expiresAt]
      );

      const emailService = require('./emailService');
      await emailService.send2FACode(user.email, twoFactorCode);

      return {
        requires2FA: true,
        userId: user.id,
        email: user.email,
        role: user.role,
        message: 'Password correct. 2FA code sent to your email. Please enter it to complete login.'
      };
    }

    // Regular user login (no 2FA, but must be verified)
    await db.query(
      'UPDATE users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW())`,
      [sessionId, user.id, token, refreshToken]
    );

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status
      }
    };
  }

  static async verify2FA(userId: string, code: string) {
    // Check OTP from hakikisha.otp_codes table
    const result = await db.query(
      `SELECT * FROM hakikisha.otp_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = '2fa_login' 
       AND expires_at > NOW() AND is_used = false
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired 2FA code. Please request a new code.');
    }

    // Mark OTP as used
    await db.query(
      'UPDATE hakikisha.otp_codes SET is_used = true WHERE id = $1',
      [result.rows[0].id]
    );

    const userResult = await db.query(
      'SELECT id, email, role, is_verified, registration_status FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    await db.query(
      'UPDATE users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    const sessionId = uuidv4();
    await db.query(
      `INSERT INTO user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours', NOW(), NOW())`,
      [sessionId, user.id, token, refreshToken]
    );

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status
      }
    };
  }

  static async verifyEmail(userId: string, code: string) {
    // Check OTP for email verification
    const result = await db.query(
      `SELECT * FROM hakikisha.otp_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'email_verification' 
       AND expires_at > NOW() AND is_used = false
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification code. Please request a new code.');
    }

    // Mark OTP as used
    await db.query(
      'UPDATE hakikisha.otp_codes SET is_used = true WHERE id = $1',
      [result.rows[0].id]
    );

    // Mark user as verified
    await db.query(
      'UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    return {
      success: true,
      message: 'Email verified successfully. You can now log in.'
    };
  }

  static async resendVerificationCode(email: string) {
    // Find user by email
    const userResult = await db.query(
      'SELECT id, email, is_verified FROM users WHERE LOWER(email) = $1',
      [email.trim().toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      throw new Error('Email already verified');
    }

    // Invalidate old OTPs
    await db.query(
      `UPDATE hakikisha.otp_codes SET is_used = true 
       WHERE user_id = $1 AND purpose = 'email_verification' AND is_used = false`,
      [user.id]
    );

    // Generate new OTP
    const emailService = require('./emailService');
    const otp = emailService.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `INSERT INTO hakikisha.otp_codes (user_id, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, otp, 'email_verification', expiresAt]
    );

    await emailService.sendEmailVerificationOTP(user.email, otp);

    return {
      success: true,
      message: 'Verification code sent to your email'
    };
  }

  static async resend2FACode(userId: string, email: string) {
    // Invalidate old 2FA codes
    await db.query(
      `UPDATE hakikisha.otp_codes SET is_used = true 
       WHERE user_id = $1 AND purpose = '2fa_login' AND is_used = false`,
      [userId]
    );

    // Generate new 2FA code
    const emailService = require('./emailService');
    const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `INSERT INTO hakikisha.otp_codes (user_id, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, twoFactorCode, '2fa_login', expiresAt]
    );

    await emailService.send2FACode(email, twoFactorCode);

    return {
      success: true,
      message: '2FA code resent to your email'
    };
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if session exists
      const session = await db.query(
        'SELECT user_id FROM user_sessions WHERE refresh_token = $1 AND expires_at > NOW()',
        [refreshToken]
      );

      if (session.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
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
        [newToken, newRefreshToken, refreshToken]
      );

      return {
        token: newToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static async logout(userId: string, token: string) {
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1 AND token = $2',
      [userId, token]
    );
  }

  static async getCurrentUser(userId: string) {
    const result = await db.query(
      'SELECT id, email, phone, role, profile_picture, is_verified, registration_status, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  }

  static async requestPasswordReset(email: string) {
    const trimmedEmail = email.trim().toLowerCase();

    // Find user by email
    const userResult = await db.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = $1',
      [trimmedEmail]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      };
    }

    const user = userResult.rows[0];

    // Invalidate old password reset tokens
    await db.query(
      `UPDATE hakikisha.otp_codes SET is_used = true 
       WHERE user_id = $1 AND purpose = 'password_reset' AND is_used = false`,
      [user.id]
    );

    // Generate reset token (6-digit code)
    const emailService = require('./emailService');
    const resetToken = emailService.generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `INSERT INTO hakikisha.otp_codes (user_id, code, purpose, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, resetToken, 'password_reset', expiresAt]
    );

    // Send password reset email with token
    const resetUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    };
  }

  static async resetPassword(email: string, token: string, newPassword: string) {
    const trimmedEmail = email.trim().toLowerCase();

    // Find user
    const userResult = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [trimmedEmail]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid reset token or email');
    }

    const user = userResult.rows[0];

    // Verify reset token
    const tokenResult = await db.query(
      `SELECT * FROM hakikisha.otp_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'password_reset' 
       AND expires_at > NOW() AND is_used = false
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, token]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or expired reset token. Please request a new password reset.');
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, user.id]
    );

    // Mark token as used
    await db.query(
      'UPDATE hakikisha.otp_codes SET is_used = true WHERE id = $1',
      [tokenResult.rows[0].id]
    );

    // Invalidate all user sessions (force re-login)
    await db.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [user.id]
    );

    return {
      success: true,
      message: 'Password reset successfully. Please log in with your new password.'
    };
  }

  static async verifyResetToken(email: string, token: string) {
    const trimmedEmail = email.trim().toLowerCase();

    // Find user
    const userResult = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [trimmedEmail]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Invalid token');
    }

    const user = userResult.rows[0];

    // Check if token is valid
    const tokenResult = await db.query(
      `SELECT * FROM hakikisha.otp_codes 
       WHERE user_id = $1 AND code = $2 AND purpose = 'password_reset' 
       AND expires_at > NOW() AND is_used = false
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, token]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or expired token');
    }

    return {
      valid: true,
      userId: user.id
    };
  }
}
