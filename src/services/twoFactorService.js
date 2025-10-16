const db = require('../config/database');
const emailService = require('./emailService');
const logger = require('../utils/logger');

class TwoFactorService {
  // Generate and send OTP for 2FA
  async generateAndSendOTP(userId, userEmail, username = 'User') {
    try {
      // Generate 6-digit OTP
      const otp = emailService.generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await db.query(
        `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, otp, '2fa', expiresAt]
      );

      // Send OTP via email
      await emailService.send2FACode(userEmail, otp, username);

      logger.info(`2FA OTP generated for user: ${userEmail}`);

      return {
        success: true,
        message: '2FA code sent to your email',
        expiresIn: '10 minutes'
      };
    } catch (error) {
      logger.error('Error generating and sending OTP:', error);
      throw new Error('Failed to send 2FA code');
    }
  }

  // Verify OTP code
  async verifyOTP(userId, code) {
    try {
      // Find valid OTP
      const result = await db.query(
        `SELECT * FROM hakikisha.otp_codes 
         WHERE user_id = $1 AND code = $2 AND type = '2fa' 
         AND expires_at > NOW() AND used = false
         ORDER BY created_at DESC LIMIT 1`,
        [userId, code]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired OTP code'
        };
      }

      const otpRecord = result.rows[0];

      // Mark OTP as used
      await db.query(
        'UPDATE hakikisha.otp_codes SET used = true WHERE id = $1',
        [otpRecord.id]
      );

      // Clean up expired OTPs
      await this.cleanupExpiredOTPs();

      logger.info(`2FA OTP verified for user: ${userId}`);

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      logger.error('Error verifying OTP:', error);
      throw new Error('Failed to verify OTP');
    }
  }

  // Enable 2FA for user
  async enable2FA(userId, method = 'email') {
    try {
      // Check if 2FA already enabled
      const existing2FA = await db.query(
        'SELECT * FROM hakikisha.two_factor_auth WHERE user_id = $1 AND method = $2',
        [userId, method]
      );

      if (existing2FA.rows.length > 0) {
        // Update existing record
        await db.query(
          `UPDATE hakikisha.two_factor_auth 
           SET is_enabled = true, updated_at = NOW() 
           WHERE user_id = $1 AND method = $2`,
          [userId, method]
        );
      } else {
        // Create new record
        await db.query(
          `INSERT INTO hakikisha.two_factor_auth (user_id, method, is_enabled)
           VALUES ($1, $2, $3)`,
          [userId, method, true]
        );
      }

      // Update user table
      await db.query(
        'UPDATE hakikisha.users SET two_factor_enabled = true, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      logger.info(`2FA enabled for user: ${userId} with method: ${method}`);

      return {
        success: true,
        message: 'Two-factor authentication enabled successfully'
      };
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  // Disable 2FA for user
  async disable2FA(userId) {
    try {
      // Disable all 2FA methods for user
      await db.query(
        'UPDATE hakikisha.two_factor_auth SET is_enabled = false, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );

      // Update user table
      await db.query(
        'UPDATE hakikisha.users SET two_factor_enabled = false, updated_at = NOW() WHERE id = $1',
        [userId]
      );

      logger.info(`2FA disabled for user: ${userId}`);

      return {
        success: true,
        message: 'Two-factor authentication disabled successfully'
      };
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  // Check if 2FA is required for user (admins always require 2FA)
  async is2FARequired(userId, userRole) {
    try {
      // For now, require 2FA only for admins
      if (userRole === 'admin') {
        const result = await db.query(
          'SELECT two_factor_enabled FROM hakikisha.users WHERE id = $1',
          [userId]
        );
        
        if (result.rows.length > 0) {
          return result.rows[0].two_factor_enabled;
        }
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking 2FA requirement:', error);
      return false;
    }
  }

  // Get 2FA status for user
  async get2FAStatus(userId) {
    try {
      const result = await db.query(
        `SELECT u.two_factor_enabled, tfa.method, tfa.last_used
         FROM hakikisha.users u
         LEFT JOIN hakikisha.two_factor_auth tfa ON u.id = tfa.user_id AND tfa.is_enabled = true
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          enabled: false,
          method: null
        };
      }

      return {
        enabled: result.rows[0].two_factor_enabled,
        method: result.rows[0].method || null,
        lastUsed: result.rows[0].last_used
      };
    } catch (error) {
      logger.error('Error getting 2FA status:', error);
      throw new Error('Failed to get 2FA status');
    }
  }

  // Clean up expired OTPs
  async cleanupExpiredOTPs() {
    try {
      const result = await db.query(
        'DELETE FROM hakikisha.otp_codes WHERE expires_at <= NOW()'
      );
      
      if (result.rowCount > 0) {
        logger.info(`Cleaned up ${result.rowCount} expired OTPs`);
      }
      
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up expired OTPs:', error);
      return 0;
    }
  }

  // Resend OTP
  async resendOTP(userId, userEmail, username = 'User') {
    try {
      // Invalidate any existing OTPs for this user
      await db.query(
        'UPDATE hakikisha.otp_codes SET used = true WHERE user_id = $1 AND type = $2 AND used = false',
        [userId, '2fa']
      );

      // Generate and send new OTP
      return await this.generateAndSendOTP(userId, userEmail, username);
    } catch (error) {
      logger.error('Error resending OTP:', error);
      throw new Error('Failed to resend OTP');
    }
  }
}

module.exports = new TwoFactorService();