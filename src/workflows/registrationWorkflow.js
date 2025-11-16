const emailService = require('../services/emailService');
const authService = require('../services/authService');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Registration Workflow
 * Handles user registration flow including email verification
 */
class RegistrationWorkflow {
  /**
   * Generate and send verification code
   */
  static async sendVerificationCode(userId, email) {
    try {
      // Generate OTP
      const code = authService.generateOTP(6);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await db.query(
        `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, code, 'email_verification', expiresAt]
      );

      // Send email with OTP
      await emailService.sendVerificationEmail(email, code);

      logger.info('Verification code sent', { userId, email });
      return { success: true };
    } catch (error) {
      logger.error('Failed to send verification code:', error);
      throw error;
    }
  }

  /**
   * Verify email with OTP code
   */
  static async verifyEmail(userId, code) {
    try {
      // Find valid OTP
      const result = await db.query(
        `SELECT id, code, expires_at, used_at
         FROM hakikisha.otp_codes
         WHERE user_id = $1 
           AND type = 'email_verification'
           AND code = $2
           AND expires_at > NOW()
           AND used_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, code]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired verification code'
        };
      }

      // Mark OTP as used
      await db.query(
        `UPDATE hakikisha.otp_codes
         SET used_at = NOW()
         WHERE id = $1`,
        [result.rows[0].id]
      );

      // Mark user as verified
      await db.query(
        `UPDATE hakikisha.users
         SET is_verified = true, email_verified_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      logger.info('Email verified successfully', { userId });
      return { success: true };
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Resend verification code
   */
  static async resendVerificationCode(userId, email) {
    try {
      // Mark all previous unused codes as used
      await db.query(
        `UPDATE hakikisha.otp_codes
         SET used_at = NOW()
         WHERE user_id = $1 
           AND type = 'email_verification'
           AND used_at IS NULL`,
        [userId]
      );

      // Send new code
      return await this.sendVerificationCode(userId, email);
    } catch (error) {
      logger.error('Failed to resend verification code:', error);
      throw error;
    }
  }
}

module.exports = RegistrationWorkflow;
