const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

class AuthConfig {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN;
    this.saltRounds = 12;
  }

  generateToken(payload, options = {}) {
    const tokenOptions = {
      expiresIn: this.jwtExpiresIn,
      ...options
    };

    return jwt.sign(payload, this.jwtSecret, tokenOptions);
  }

  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      logger.error('Token verification failed:', error);
      throw new Error('Invalid token');
    }
  }

  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshSecret);
    } catch (error) {
      logger.error('Refresh token verification failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password processing error');
    }
  }

  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password comparison failed:', error);
      throw new Error('Password verification error');
    }
  }

  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!hasUpperCase) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!hasLowerCase) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!hasNumbers) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!hasSpecialChar) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true, message: 'Password is strong' };
  }

  generateRandomToken(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    
    for (let i = 0; i < length; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return token;
  }

  decodeTokenWithoutVerification(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      logger.error('Token decoding failed:', error);
      return null;
    }
  }

  getTokenExpiration(token) {
    const decoded = this.decodeTokenWithoutVerification(token);
    return decoded ? new Date(decoded.exp * 1000) : null;
  }

  isTokenExpired(token) {
    const expiration = this.getTokenExpiration(token);
    return expiration ? expiration < new Date() : true;
  }
}

module.exports = new AuthConfig();