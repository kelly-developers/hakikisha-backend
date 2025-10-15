const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const DatabaseInitializer = require('../config/database-init');

// Ensure database is ready before any auth operation
async function ensureAuthDatabaseReady() {
  try {
    // Quick check if users table has required structure
    await db.query('SELECT id, email, password_hash, role FROM hakikisha.users LIMIT 1');
  } catch (error) {
    if (error.code === '42703' || error.code === '42P01') {
      console.log('🔄 Auth database needs initialization...');
      await DatabaseInitializer.initializeCompleteDatabase();
    } else {
      throw error;
    }
  }
}

const register = async (req, res) => {
  try {
    // Ensure database is ready
    await ensureAuthDatabaseReady();

    const { email, password, phone, role = 'user' } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User exists',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine registration status based on role
    const registrationStatus = role === 'user' ? 'approved' : 'pending';

    // Create user
    const result = await db.query(
      `INSERT INTO hakikisha.users 
       (id, email, password_hash, phone, role, registration_status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
       RETURNING id, email, role, is_verified, registration_status`,
      [uuidv4(), email, passwordHash, phone, role, registrationStatus]
    );

    const newUser = result.rows[0];

    // Create registration request for non-user roles
    if (role !== 'user') {
      await db.query(
        `INSERT INTO hakikisha.registration_requests 
         (id, user_id, request_type, status, submitted_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [uuidv4(), newUser.id, role, 'pending']
      );
    }

    res.status(201).json({
      success: true,
      message: role === 'user' 
        ? 'Registration successful' 
        : 'Registration submitted for approval. You will be notified once reviewed.',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        registration_status: newUser.registration_status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    // Ensure database is ready
    await ensureAuthDatabaseReady();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Find user with password_hash
    const userResult = await db.query(
      `SELECT id, email, password_hash, role, is_verified, phone, 
              two_factor_enabled, two_factor_secret, login_count, last_login,
              registration_status
       FROM hakikisha.users 
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Check registration status
    if (user.registration_status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Account pending approval',
        message: 'Your account is pending admin approval'
      });
    }

    // Check if user has password_hash
    if (!user.password_hash) {
      return res.status(500).json({
        success: false,
        error: 'Account error',
        message: 'User account configuration error. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Update login stats
    await db.query(
      `UPDATE hakikisha.users 
       SET login_count = login_count + 1, last_login = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Generate session token
    const sessionToken = uuidv4();

    // Create session
    await db.query(
      `INSERT INTO hakikisha.user_sessions 
       (id, user_id, session_token, login_time, last_activity, expires_at, is_active)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW() + INTERVAL '7 days', true)`,
      [uuidv4(), user.id, sessionToken]
    );

    // Check if 2FA is enabled
    const requires2FA = user.two_factor_enabled;

    const response = {
      success: true,
      message: requires2FA ? '2FA code required' : 'Login successful',
      requires2FA,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        two_factor_enabled: user.two_factor_enabled
      }
    };

    if (!requires2FA) {
      response.session_token = sessionToken;
    }

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message
    });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'User ID and 2FA code are required'
      });
    }

    // In a real implementation, you would verify the 2FA code here
    // For now, we'll just generate a session token
    
    const sessionToken = uuidv4();

    // Create session
    await db.query(
      `INSERT INTO hakikisha.user_sessions 
       (id, user_id, session_token, login_time, last_activity, expires_at, is_active)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW() + INTERVAL '7 days', true)`,
      [uuidv4(), userId, sessionToken]
    );

    res.json({
      success: true,
      message: 'Login successful',
      session_token: sessionToken
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: '2FA verification failed',
      message: error.message
    });
  }
};

const logout = async (req, res) => {
  try {
    const { session_token } = req.body;

    if (session_token) {
      await db.query(
        `UPDATE hakikisha.user_sessions 
         SET is_active = false, logout_time = NOW() 
         WHERE session_token = $1 AND is_active = true`,
        [session_token]
      );
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      message: error.message
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    // This would typically use middleware to extract user from JWT
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const userResult = await db.query(
      `SELECT id, email, role, is_verified, phone, 
              profile_picture, created_at, last_login
       FROM hakikisha.users 
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  verify2FA,
  logout,
  getCurrentUser,
  ensureAuthDatabaseReady
};