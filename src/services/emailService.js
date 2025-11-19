const { Resend } = require('resend');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Initialize Resend with API key from environment
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      logger.warn('RESEND_API_KEY not found in environment variables. Email functionality will not work.');
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
    
    this.fromEmail = process.env.EMAIL_FROM || 'Hakikisha <onboarding@resend.dev>';
  }

  // Send 2FA OTP Code
  async send2FACode(email, code, username = 'User') {
    if (!this.resend) {
      throw new Error('Email service not configured: RESEND_API_KEY missing');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #0A864D; font-size: 24px; font-weight: bold; }
          .code { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; border: 2px dashed #dee2e6; }
          .code-number { font-size: 32px; font-weight: bold; color: #0A864D; letter-spacing: 8px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px; }
          .warning { background: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; border: 1px solid #ffeaa7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HAKIKISHA</div>
            <h2 style="color: #333; margin-bottom: 5px;">Two-Factor Authentication</h2>
            <p style="color: #666; margin: 0;">Secure Login Verification</p>
          </div>
          
          <p>Hello <strong>${username}</strong>,</p>
          
          <p>Your verification code for Hakikisha login is:</p>
          
          <div class="code">
            <div class="code-number">${code}</div>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>. 
            Do not share this code with anyone.
          </div>
          
          <p>If you didn't request this code, please ignore this email and review your account security.</p>
          
          <div class="footer">
            <p>This is an automated message from Hakikisha Fact-Checking Platform.</p>
            <p>© ${new Date().getFullYear()} Hakikisha. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Your Hakikisha Two-Factor Authentication Code',
        html: html,
      });

      if (error) {
        logger.error('Error sending 2FA code via Resend:', error);
        throw new Error(`Failed to send 2FA code: ${error.message}`);
      }

      logger.info(`2FA code sent to: ${email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      logger.error('Error sending 2FA code:', error);
      throw new Error(`Failed to send 2FA code: ${error.message}`);
    }
  }

  // Send Password Reset OTP Code
  async sendPasswordResetCode(email, code, username = 'User') {
    if (!this.resend) {
      throw new Error('Email service not configured: RESEND_API_KEY missing');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #0A864D; font-size: 24px; font-weight: bold; }
          .code { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; border: 2px dashed #dee2e6; }
          .code-number { font-size: 32px; font-weight: bold; color: #0A864D; letter-spacing: 8px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px; }
          .warning { background: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; border: 1px solid #ffeaa7; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HAKIKISHA</div>
            <h2 style="color: #333; margin-bottom: 5px;">Password Reset Request</h2>
            <p style="color: #666; margin: 0;">Reset Your Password</p>
          </div>
          
          <p>Hello <strong>${username}</strong>,</p>
          
          <p>We received a request to reset your password for your Hakikisha account. Use the verification code below to reset your password:</p>
          
          <div class="code">
            <div class="code-number">${code}</div>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This code will expire in <strong>15 minutes</strong>. 
            Do not share this code with anyone. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </div>
          
          <div class="footer">
            <p>This is an automated message from Hakikisha Fact-Checking Platform.</p>
            <p>© ${new Date().getFullYear()} Hakikisha. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Reset Your Hakikisha Password',
        html: html,
      });

      if (error) {
        logger.error('Error sending password reset code via Resend:', error);
        throw new Error(`Failed to send password reset code: ${error.message}`);
      }

      logger.info(`Password reset code sent to: ${email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      logger.error('Error sending password reset code:', error);
      throw new Error(`Failed to send password reset code: ${error.message}`);
    }
  }

  // Send Admin Security Alert
  async sendAdminSecurityAlert(email, alertType, details) {
    if (!this.resend) {
      throw new Error('Email service not configured: RESEND_API_KEY missing');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #0A864D; font-size: 24px; font-weight: bold; }
          .alert { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #f5c6cb; }
          .info { background: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #bee5eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HAKIKISHA SECURITY</div>
            <h2 style="color: #dc3545; margin-bottom: 5px;">Security Alert</h2>
          </div>
          
          <div class="alert">
            <strong>Alert Type:</strong> ${alertType}<br>
            <strong>Time:</strong> ${new Date().toLocaleString()}
          </div>
          
          <div class="info">
            <strong>Details:</strong><br>
            ${details}
          </div>
          
          <p>If this activity wasn't authorized by you, please take immediate action to secure your account.</p>
          
          <p><strong>Recommended actions:</strong></p>
          <ul>
            <li>Change your password immediately</li>
            <li>Review your recent account activity</li>
            <li>Enable two-factor authentication if not already enabled</li>
            <li>Contact support if you notice any suspicious activity</li>
          </ul>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px;">
            <p>This is an automated security alert from Hakikisha.</p>
            <p>© ${new Date().getFullYear()} Hakikisha Security Team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `Security Alert: ${alertType}`,
        html: html,
      });

      if (error) {
        logger.error('Error sending security alert via Resend:', error);
        throw error;
      }

      logger.info(`Security alert sent to admin: ${email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      logger.error('Error sending security alert:', error);
      throw error;
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      if (!this.resend || !process.env.RESEND_API_KEY) {
        logger.error('Resend API key not configured');
        return false;
      }
      
      // Try to send a test email to verify the connection
      const { error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: ['test@example.com'],
        subject: 'Hakikisha Email Service Test',
        html: '<p>This is a test email to verify email service configuration.</p>',
      });

      if (error) {
        logger.error('Resend email service test failed:', error);
        return false;
      }

      logger.info('Resend email service configured and tested successfully');
      return true;
    } catch (error) {
      logger.error('Resend email service configuration failed:', error);
      return false;
    }
  }

  // Send Email Verification OTP
  async sendEmailVerificationOTP(email, code, username = 'User') {
    if (!this.resend) {
      throw new Error('Email service not configured: RESEND_API_KEY missing');
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #0A864D; font-size: 24px; font-weight: bold; }
          .code { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0; border: 2px dashed #dee2e6; }
          .code-number { font-size: 32px; font-weight: bold; color: #0A864D; letter-spacing: 8px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px; }
          .warning { background: #d1ecf1; color: #0c5460; padding: 12px; border-radius: 4px; margin: 15px 0; border: 1px solid #bee5eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">HAKIKISHA</div>
            <h2 style="color: #333; margin-bottom: 5px;">Email Verification</h2>
            <p style="color: #666; margin: 0;">Welcome to Hakikisha!</p>
          </div>
          
          <p>Hello <strong>${username}</strong>,</p>
          
          <p>Thank you for registering with Hakikisha. To complete your registration, please verify your email address using the code below:</p>
          
          <div class="code">
            <div class="code-number">${code}</div>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This verification code will expire in <strong>10 minutes</strong>. 
            Do not share this code with anyone.
          </div>
          
          <p>If you didn't create an account with Hakikisha, please ignore this email.</p>
          
          <div class="footer">
            <p>This is an automated message from Hakikisha Fact-Checking Platform.</p>
            <p>© ${new Date().getFullYear()} Hakikisha. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Verify Your Email - Hakikisha',
        html: html,
      });

      if (error) {
        logger.error('Error sending email verification code via Resend:', error);
        throw new Error(`Failed to send email verification code: ${error.message}`);
      }

      logger.info(`Email verification code sent to: ${email} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      logger.error('Error sending email verification code:', error);
      throw new Error(`Failed to send email verification code: ${error.message}`);
    }
  }

  // Generate OTP Code
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Alias method for backward compatibility
  async sendPasswordResetEmail(email, code, username = 'User') {
    return this.sendPasswordResetCode(email, code, username);
  }
}

module.exports = new EmailService();