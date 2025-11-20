const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { PointsService, POINTS } = require('../services/pointsService');
const AuthService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

const generateJWTToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
};

// Helper function to generate OTP (fallback if AuthService fails)
// Helper function to generate plain OTP (6 digits)
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let OTP = '';
  for (let i = 0; i < length; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
};

// Safe OTP generation function - use plain OTP for password reset
const safeGenerateOTP = () => {
  try {
    // Use the plain OTP generator for password reset
    return generateOTP(6);
  } catch (error) {
    console.log('OTP generation failed, using fallback:', error.message);
    return generateOTP(6);
  }
};

// Helper function to create user session
const createUserSession = async (user, token, refreshToken) => {
  try {
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await db.query(
      `INSERT INTO hakikisha.user_sessions (id, user_id, token, refresh_token, expires_at, created_at, last_accessed)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         token = EXCLUDED.token, 
         refresh_token = EXCLUDED.refresh_token, 
         expires_at = EXCLUDED.expires_at, 
         last_accessed = NOW(),
         is_active = true`,
      [sessionId, user.id, token, refreshToken, expiresAt]
    );
    
    return sessionId;
  } catch (error) {
    console.error('Error creating user session:', error);
    throw error;
  }
};

const register = async (req, res) => {
  try {
    console.log('Register Request Received');
    // TRIM all string inputs to handle spaces
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const username = req.body.username ? req.body.username.trim() : '';
    const password = req.body.password || '';
    const phone = req.body.phone ? req.body.phone.trim() : null;
    const role = req.body.role || 'user';

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Strict email validation with multiple checks
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format. Please provide a valid email address.',
        code: 'VALIDATION_ERROR'
      });
    }

    // Additional check: email must have valid domain
    const emailParts = email.split('@');
    if (emailParts.length !== 2 || emailParts[1].split('.').length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email domain. Please use a valid email address.',
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

    // Username is required
    if (!username || username.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Username is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate username format (alphanumeric and underscore only, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores',
        code: 'VALIDATION_ERROR'
      });
    }

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

    const password_hash = await AuthService.hashPassword(password);
    const userId = uuidv4();

    const registrationStatus = role === 'fact_checker' ? 'pending' : 'approved';
    // Users start as unverified and must verify email
    const isVerified = false;
    const twoFactorEnabled = false; // Changed: 2FA is now optional for all users

    const result = await db.query(
      `INSERT INTO hakikisha.users (id, email, username, password_hash, phone, role, registration_status, is_verified, two_factor_enabled, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', NOW(), NOW())
       RETURNING id, email, username, role, registration_status, is_verified, two_factor_enabled, created_at`,
      [userId, email, username, password_hash, phone || null, role, registrationStatus, isVerified, twoFactorEnabled]
    );

    const user = result.rows[0];

    // Generate and send email verification OTP for all users
    try {
      const otp = safeGenerateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await db.query(
        `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, otp, 'email_verification', expiresAt]
      );

      // Send verification email
      await emailService.sendEmailVerificationOTP(user.email, otp, user.username);
      logger.info(`Email verification OTP sent to: ${user.email}`);
    } catch (otpError) {
      logger.error('Failed to send verification email:', otpError);
      // Continue registration even if email fails - user can request resend
    }

    // Initialize user points (will be fully awarded after email verification)
    try {
      await PointsService.initializeUserPoints(user.id);
      console.log('User points initialized for new user');
    } catch (pointsError) {
      console.log('Points initialization failed:', pointsError.message);
    }

    logger.info(`New user registered: ${user.email} with ID: ${user.id}`);

    res.status(201).json({
      success: true,
      message: role === 'fact_checker' 
        ? 'Registration submitted for approval. Please verify your email to continue.'
        : 'Registration successful! Please check your email to verify your account before logging in.',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        registration_status: user.registration_status,
        is_verified: user.is_verified,
        two_factor_enabled: user.two_factor_enabled
      },
      requiresEmailVerification: !user.is_verified
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
    console.log('Login attempt:', { 
      email: req.body.email, 
      identifier: req.body.identifier,
      hasPassword: !!req.body.password 
    });
    
    // TRIM input to handle spaces and normalize email to lowercase
    // Accept both 'email' and 'identifier' fields for backward compatibility
    const emailOrUsername = req.body.identifier 
      ? req.body.identifier.trim().toLowerCase() 
      : (req.body.email ? req.body.email.trim().toLowerCase() : '');
    const password = req.body.password || '';

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/username and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Support login with either email OR username (case-insensitive for email)
    const userResult = await db.query(
      `SELECT id, email, username, password_hash, role, is_verified, registration_status, 
              two_factor_enabled, status, login_count, last_login
       FROM hakikisha.users 
       WHERE LOWER(email) = $1 OR username = $2`,
      [emailOrUsername, emailOrUsername]
    );

    if (userResult.rows.length === 0) {
      logger.warn(`Failed login attempt for non-existent email/username: ${emailOrUsername}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password',
        code: 'AUTH_INVALID'
      });
    }

    const user = userResult.rows[0];

    // Check if account is suspended, inactive, or deactivated
    if (user.status !== 'active') {
      logger.warn(`Login attempt for suspended/inactive account: ${user.email}`);
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended or deactivated. Please contact support for assistance.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    const isValid = await AuthService.comparePassword(password, user.password_hash);
    if (!isValid) {
      logger.warn(`Failed login attempt for user: ${user.email} - Invalid password`);
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        code: 'AUTH_INVALID'
      });
    }

    // ENFORCE EMAIL VERIFICATION FOR ALL USERS BEFORE FIRST LOGIN
    if (!user.is_verified) {
      // Check if there's a pending verification OTP
      const pendingOTP = await db.query(
        `SELECT * FROM hakikisha.otp_codes 
         WHERE user_id = $1 AND type = 'email_verification' 
         AND expires_at > NOW() AND used = false
         ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );

      let message = 'Please verify your email address before logging in.';
      
      if (pendingOTP.rows.length === 0) {
        // No active OTP, generate and send a new one
        const otp = safeGenerateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await db.query(
          `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
           VALUES ($1, $2, $3, $4)`,
          [user.id, otp, 'email_verification', expiresAt]
        );

        await emailService.sendEmailVerificationOTP(user.email, otp, user.username);
        message += ' A new verification code has been sent to your email.';
      } else {
        message += ' Check your email for the verification code.';
      }

      return res.status(403).json({
        success: false,
        error: message,
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
        userId: user.id
      });
    }

    if (user.registration_status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending approval. You will be notified once approved.',
        code: 'ACCOUNT_PENDING'
      });
    }

    // FIXED: Only enforce 2FA if user has explicitly enabled it
    if (user.two_factor_enabled) {
      const otp = safeGenerateOTP();
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

    // Update login stats
    await db.query(
      'UPDATE hakikisha.users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Award points for daily login
    try {
      const pointsResult = await PointsService.awardPointsForDailyLogin(user.id);
      console.log('Daily login points awarded:', pointsResult.pointsAwarded, 'Streak:', pointsResult.newStreak);
    } catch (pointsError) {
      console.log('Could not award login points:', pointsError.message);
    }

    // Generate tokens and create session
    const token = generateJWTToken(user);
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // Create user session
    await createUserSession(user, token, refreshToken);

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
        registration_status: user.registration_status,
        two_factor_enabled: user.two_factor_enabled
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
      'SELECT id, email, username, role, is_verified, registration_status, two_factor_enabled FROM hakikisha.users WHERE id = $1',
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

    // Check if email is verified before allowing 2FA login
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
        userId: user.id
      });
    }

    // Update login stats
    await db.query(
      'UPDATE hakikisha.users SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1, updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Award points for login
    try {
      const pointsResult = await PointsService.awardPointsForDailyLogin(user.id);
      console.log('2FA login points awarded:', pointsResult.pointsAwarded, 'Streak:', pointsResult.newStreak);
    } catch (pointsError) {
      console.log('Could not award 2FA login points:', pointsError.message);
    }

    // Generate tokens and create session
    const token = generateJWTToken(user);
    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // Create user session
    await createUserSession(user, token, refreshToken);

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
        registration_status: user.registration_status,
        two_factor_enabled: user.two_factor_enabled
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
    // TRIM and normalize email
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

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
    
    // FIX: Generate plain text OTP (not hashed)
    const resetCode = generateOTP(6); // Use the plain OTP generator
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    console.log('Generated reset code:', resetCode); // Log the actual code for debugging

    // Delete old reset codes
    await db.query(
      'DELETE FROM hakikisha.otp_codes WHERE user_id = $1 AND type = $2',
      [user.id, 'password_reset']
    );

    // FIX: Store the plain text OTP, not hashed
    await db.query(
      'INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, resetCode, 'password_reset', expiresAt]
    );

    try {
      await emailService.sendPasswordResetCode(user.email, resetCode, user.username);
      logger.info(`Password reset code sent to user: ${user.email}, code: ${resetCode}`);
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
    console.log('Reset Password Request - Body:', req.body);
    
    // TRIM and validate inputs
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';
    const token = req.body.token ? req.body.token.trim() : ''; // This is the 6-digit code
    const newPassword = req.body.newPassword || '';

    console.log('Reset password parameters:', { email, token, newPassword });

    // Validate required fields
    if (!email || !token || !newPassword) {
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

    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({
        success: false,
        error: 'Reset code must be 6 digits',
        code: 'VALIDATION_ERROR'
      });
    }

    // Find user by email
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

    // FIX: Find valid OTP by comparing plain text codes
    const otpResult = await db.query(
      'SELECT * FROM hakikisha.otp_codes WHERE user_id = $1 AND code = $2 AND type = $3 AND expires_at > NOW() AND used = false',
      [userId, token, 'password_reset'] // Compare plain text token with stored plain text code
    );

    console.log('OTP verification result:', { 
      found: otpResult.rows.length > 0,
      userId, 
      token,
      type: 'password_reset'
    });

    if (otpResult.rows.length === 0) {
      // Check if code exists but is expired
      const expiredResult = await db.query(
        'SELECT * FROM hakikisha.otp_codes WHERE user_id = $1 AND code = $2 AND type = $3 AND used = false',
        [userId, token, 'password_reset']
      );

      if (expiredResult.rows.length > 0) {
        return res.status(401).json({
          success: false,
          error: 'Reset code has expired. Please request a new one.',
          code: 'AUTH_EXPIRED'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid reset code',
        code: 'AUTH_INVALID'
      });
    }

    // Hash new password
    const newPasswordHash = await AuthService.hashPassword(newPassword);

    // Update user password
    await db.query(
      'UPDATE hakikisha.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Mark OTP as used
    await db.query(
      'UPDATE hakikisha.otp_codes SET used = true, used_at = NOW() WHERE id = $1',
      [otpResult.rows[0].id]
    );

    // Clear all user sessions after password reset for security
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
      'SELECT user_id FROM hakikisha.user_sessions WHERE refresh_token = $1 AND expires_at > NOW() AND is_active = true',
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
      'SELECT id, email, role, status, is_verified FROM hakikisha.users WHERE id = $1',
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

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address to continue.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
        userId: user.id
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
        'UPDATE hakikisha.user_sessions SET is_active = false, logout_time = NOW() WHERE user_id = $1 AND token = $2',
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
      'UPDATE hakikisha.user_sessions SET is_active = false, logout_time = NOW() WHERE user_id = $1',
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

// Verify Email (for regular users after registration) - FIXED VERSION
const verifyEmail = async (req, res) => {
  try {
    console.log('Verify Email Request');
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'User ID and verification code are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Verification code must be 6 digits',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check OTP for email verification
    const result = await db.query(
      `SELECT * FROM hakikisha.otp_codes 
       WHERE user_id = $1 AND code = $2 AND type = 'email_verification' 
       AND expires_at > NOW() AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [userId, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification code',
        code: 'INVALID_CODE'
      });
    }

    // Mark OTP as used
    await db.query(
      'UPDATE hakikisha.otp_codes SET used = true, used_at = NOW() WHERE id = $1',
      [result.rows[0].id]
    );

    // Mark user as verified
    await db.query(
      'UPDATE hakikisha.users SET is_verified = true, updated_at = NOW() WHERE id = $1',
      [userId]
    );

    // Award registration points for users after email verification
    try {
      const userResult = await db.query('SELECT role FROM hakikisha.users WHERE id = $1', [userId]);
      if (userResult.rows.length > 0 && userResult.rows[0].role === 'user') {
        await PointsService.awardPoints(
          userId,
          POINTS.PROFILE_COMPLETION,
          'PROFILE_COMPLETION',
          'Completed email verification'
        );
      }
    } catch (pointsError) {
      logger.warn('Failed to award points after email verification:', pointsError);
    }

    logger.info(`Email verified successfully for user: ${userId}`);

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    logger.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

// Resend Email Verification Code - FIXED VERSION
const resendVerificationCode = async (req, res) => {
  try {
    console.log('Resend Verification Code Request');
    const email = req.body.email ? req.body.email.trim().toLowerCase() : '';

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Find user by email
    const userResult = await db.query(
      'SELECT id, email, username, is_verified FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Invalidate old OTPs
    await db.query(
      `UPDATE hakikisha.otp_codes SET used = true 
       WHERE user_id = $1 AND type = 'email_verification' AND used = false`,
      [user.id]
    );

    // Generate new OTP
    const otp = safeGenerateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, otp, 'email_verification', expiresAt]
    );

    await emailService.sendEmailVerificationOTP(user.email, otp, user.username);
    logger.info(`Verification code resent to user: ${user.email}`);

    res.json({
      success: true,
      message: 'Verification code sent to your email',
      userId: user.id // Return userId for client reference
    });
  } catch (error) {
    console.error('Resend verification code error:', error);
    logger.error('Resend verification code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification code. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

// Resend 2FA Code - FIXED VERSION
const resend2FACode = async (req, res) => {
  try {
    console.log('Resend 2FA Code Request');
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        error: 'User ID and email are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify user exists
    const userResult = await db.query(
      'SELECT id, email, username, role FROM hakikisha.users WHERE id = $1 AND email = $2',
      [userId, email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    // Invalidate old 2FA codes
    await db.query(
      `UPDATE hakikisha.otp_codes SET used = true 
       WHERE user_id = $1 AND type = '2fa' AND used = false`,
      [user.id]
    );

    // Generate new 2FA code
    const twoFactorCode = safeGenerateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(
      `INSERT INTO hakikisha.otp_codes (user_id, code, type, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [user.id, twoFactorCode, '2fa', expiresAt]
    );

    await emailService.send2FACode(user.email, twoFactorCode, user.username);
    logger.info(`2FA code resent to user: ${user.email}`);

    res.json({
      success: true,
      message: '2FA code resent to your email'
    });
  } catch (error) {
    console.error('Resend 2FA code error:', error);
    logger.error('Resend 2FA code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend 2FA code. Please try again.',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  register,
  login,
  verify2FA,
  verifyEmail,
  resendVerificationCode,
  resend2FACode,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  logoutAllDevices,
  getCurrentUser,
  checkAuth
};