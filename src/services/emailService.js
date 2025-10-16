const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Use App Password for Gmail
      }
    });
  }

  // Send 2FA OTP Code
  async send2FACode(email, code, username = 'User') {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Hakikisha" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Hakikisha Two-Factor Authentication Code',
      html: `
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
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`2FA code sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending 2FA code:', error);
      throw new Error('Failed to send 2FA code');
    }
  }

  // Send Password Reset Email
  async sendPasswordResetEmail(email, resetToken, username = 'User') {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Hakikisha" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Hakikisha Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f6f9fc; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #0A864D; font-size: 24px; font-weight: bold; }
            .button { background: #0A864D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d; font-size: 14px; }
            .warning { background: #fff3cd; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; border: 1px solid #ffeaa7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">HAKIKISHA</div>
              <h2 style="color: #333; margin-bottom: 5px;">Password Reset Request</h2>
            </div>
            
            <p>Hello <strong>${username}</strong>,</p>
            
            <p>We received a request to reset your password for your Hakikisha account. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 12px; border-radius: 4px;">
              ${resetLink}
            </p>
            
            <div class="warning">
              <strong>Important:</strong> This link will expire in <strong>1 hour</strong>. 
              If you didn't request a password reset, please ignore this email.
            </div>
            
            <div class="footer">
              <p>This is an automated message from Hakikisha Fact-Checking Platform.</p>
              <p>© ${new Date().getFullYear()} Hakikisha. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send Admin Security Alert
  async sendAdminSecurityAlert(email, alertType, details) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Hakikisha Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Security Alert: ${alertType}`,
      html: `
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
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Security alert sent to admin: ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending security alert:', error);
      throw error;
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connected successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }

  // Generate OTP Code
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = new EmailService();