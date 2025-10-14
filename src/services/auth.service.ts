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
    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    // Create user
    const result = await db.query(
      `INSERT INTO users (id, email, password_hash, phone, role, registration_status, is_verified, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, email, role, is_verified, registration_status, created_at`,
      [id, email, password_hash, phone || null, role, 'pending', false]
    );

    return result.rows[0];
  }

  static async login(email: string, password: string) {
    // Find user
    const userResult = await db.query(
      'SELECT id, email, password_hash, role, is_verified, registration_status FROM users WHERE email = $1',
      [email]
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

    // Check registration status
    if (user.registration_status !== 'approved') {
      throw new Error('Account pending approval');
    }

    // Send 2FA for admin and fact_checker
    if (user.role === 'admin' || user.role === 'fact_checker') {
      const twoFactorCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.query(
        'INSERT INTO two_factor_codes (user_id, code, expires_at) VALUES ($1, $2, $3)',
        [user.id, twoFactorCode, expiresAt]
      );

      const emailService = require('./emailService');
      await emailService.send2FACode(user.email, twoFactorCode);

      return {
        requires2FA: true,
        userId: user.id,
        message: '2FA code sent to your email'
      };
    }

    // Regular user login (no 2FA)
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
    const result = await db.query(
      'SELECT * FROM two_factor_codes WHERE user_id = $1 AND code = $2 AND expires_at > NOW() AND used = false',
      [userId, code]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired 2FA code');
    }

    await db.query(
      'UPDATE two_factor_codes SET used = true WHERE id = $1',
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
}
