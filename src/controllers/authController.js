const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const DatabaseInitializer = require('../config/database-init');

// Ensure database is ready before any auth operation
async function ensureAuthDatabaseReady() {
  try {
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

// Generate JWT token
const generateJWTToken = (user) => {
  const secret = process.env.JWT_SECRET || '9ce6aa78491314d5b0e382628f1ca04eab3280570f8b5ca2707323e527ba82ec1787437a328dfad23d12816600a291121365058450664866088cb27d5f232f37';
  
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    secret,
    {
      expiresIn: '24h'
    }
  );
};

const register = async (req, res) => {
  try {
    await ensureAuthDatabaseReady();

    const { email, password, phone, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
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
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine registration status based on role
    // FIX: Regular users are auto-approved, fact_checkers need approval
    const registrationStatus = role === 'user' ? 'approved' : 'pending';

    // Create user
    const result = await db.query(
      `INSERT INTO hakikisha.users 
       (id, email, password_hash, phone, role, registration_status, is_verified, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
       RETURNING id, email, role, is_verified, registration_status`,
      [uuidv4(), email, passwordHash, phone, role, registrationStatus, registrationStatus === 'approved']
    );

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: role === 'user' 
        ? 'Registration successful' 
        : 'Registration submitted for approval',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        registration_status: newUser.registration_status,
        is_verified: newUser.is_verified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    await ensureAuthDatabaseReady();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user with password_hash
    const userResult = await db.query(
      `SELECT id, email, password_hash, role, is_verified, phone, 
              two_factor_enabled, registration_status, status
       FROM hakikisha.users 
       WHERE email = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // FIX: Check if user account is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended or deactivated'
      });
    }

    // FIX: Check registration status - only block if pending
    if (user.registration_status === 'pending') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval. Please wait for approval or contact administrator.'
      });
    }

    // FIX: Also check if registration is rejected
    if (user.registration_status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: 'Your account registration has been rejected. Please contact administrator.'
      });
    }

    // Check if user has password_hash
    if (!user.password_hash) {
      return res.status(500).json({
        success: false,
        error: 'User account configuration error'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Update login stats
    await db.query(
      `UPDATE hakikisha.users 
       SET login_count = login_count + 1, last_login = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Generate JWT token (NOT session token)
    const token = generateJWTToken(user);

    // Check if 2FA is enabled
    const requires2FA = user.two_factor_enabled;

    const response = {
      success: true,
      message: requires2FA ? '2FA code required' : 'Login successful',
      requires2FA: requires2FA,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status,
        two_factor_enabled: user.two_factor_enabled
      }
    };

    if (!requires2FA) {
      response.token = token; // Send JWT token
    }

    console.log('✅ Login successful for user:', user.email);
    console.log('🔐 JWT Token generated:', token.substring(0, 50) + '...');

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'User ID and 2FA code are required'
      });
    }

    // Get user
    const userResult = await db.query(
      'SELECT id, email, role FROM hakikisha.users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // In a real implementation, verify the 2FA code here
    // For now, we'll just generate a JWT token
    
    const token = generateJWTToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: '2FA verification failed'
    });
  }
};

const logout = async (req, res) => {
  try {
    // With JWT, we don't need to maintain server-side sessions
    // Client just discards the token
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
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
              profile_picture, created_at, last_login, registration_status, status
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
      error: 'Failed to get user information'
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