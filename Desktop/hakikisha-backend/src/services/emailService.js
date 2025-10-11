const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // FIX: Use createTransport (not createTransporter)
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendVerificationEmail(email, userId, verificationToken) {
    const verificationLink = `${process.env.SERVER_URL}/api/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Hakikisha Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to Hakikisha!</h2>
          <p>Thank you for registering. Please verify your email address to start using our fact-checking platform.</p>
          <a href="${verificationLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email Address
          </a>
          <p>If the button doesn't work, copy and paste this link in your browser:</p>
          <p>${verificationLink}</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending verification email:', error);
      throw error;
    }
  }

  async sendVerdictNotification(email, claimTitle, verdict) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `Your Claim Has Been Verified - ${verdict}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Claim Verification Complete</h2>
          <p>Your claim "<strong>${claimTitle}</strong>" has been verified by our fact-checking team.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 4px; margin: 16px 0;">
            <h3 style="margin: 0; color: ${this.getVerdictColor(verdict)};">Verdict: ${verdict.toUpperCase()}</h3>
          </div>
          <p>View the detailed analysis and evidence on the Hakikisha platform.</p>
          <a href="${process.env.SERVER_URL}/claims" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Verdict
          </a>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verdict notification sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending verdict notification:', error);
      throw error;
    }
  }

  async sendAdminAlert(subject, message) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.ADMIN_ALERT_EMAIL || process.env.EMAIL_USER,
      subject: `Admin Alert: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h3 style="color: #dc2626;">Admin Alert</h3>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Admin alert sent: ${subject}`);
      return true;
    } catch (error) {
      logger.error('Error sending admin alert:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    const resetLink = `${process.env.SERVER_URL}/api/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Reset Your Hakikisha Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to create a new password.</p>
          <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
          <p>If you didn't request this, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to: ${email}`);
      return true;
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  getVerdictColor(verdict) {
    const colors = {
      'true': '#10b981',
      'false': '#ef4444',
      'misleading': '#f59e0b',
      'satire': '#8b5cf6',
      'needs_context': '#6b7280'
    };
    return colors[verdict] || '#6b7280';
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
}

module.exports = new EmailService();