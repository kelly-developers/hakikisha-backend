const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const DatabaseInitializer = require('../config/database-init');

// Ensure database is ready before any auth operation
async function ensureAuthDatabaseReady() {
  try {
    await db.query('SELECT id, email, username, password_hash, role FROM hakikisha.users LIMIT 1');
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
      username: user.username,
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

    const { email, username, password, phone, role = 'user' } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, username, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists with email
    const existingUserByEmail = await db.query(
      'SELECT id FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (existingUserByEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Check if username is already taken
    const existingUserByUsername = await db.query(
      'SELECT id FROM hakikisha.users WHERE username = $1',
      [username]
    );

    if (existingUserByUsername.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Username already taken'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Determine registration status based on role
    const registrationStatus = role === 'user' ? 'approved' : 'pending';
    const isVerified = role === 'user'; // Auto-verify regular users

    // Create user
    const result = await db.query(
      `INSERT INTO hakikisha.users 
       (id, email, username, password_hash, phone, role, is_verified, registration_status, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
       RETURNING id, email, username, role, is_verified, registration_status`,
      [uuidv4(), email, username, passwordHash, phone, role, isVerified, registrationStatus]
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = generateJWTToken(newUser);

    res.status(201).json({
      success: true,
      message: role === 'user' 
        ? 'Registration successful' 
        : 'Registration submitted for approval',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        is_verified: newUser.is_verified,
        registration_status: newUser.registration_status
      },
      token: token
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint.includes('email')) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered'
        });
      } else if (error.constraint.includes('username')) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken'
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
};

const login = async (req, res) => {
  try {
    await ensureAuthDatabaseReady();

    const { identifier, password } = req.body; // identifier can be email or username

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/username and password are required'
      });
    }

    // Find user by email or username
    const userResult = await db.query(
      `SELECT id, email, username, password_hash, role, is_verified, phone, 
              two_factor_enabled, registration_status, status
       FROM hakikisha.users 
       WHERE email = $1 OR username = $1`,
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username or password'
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Your account has been suspended. Please contact support.'
      });
    }

    // Check registration status
    if (user.registration_status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval'
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
        error: 'Invalid email/username or password'
      });
    }

    // Update login stats
    await db.query(
      `UPDATE hakikisha.users 
       SET login_count = COALESCE(login_count, 0) + 1, last_login = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Check if 2FA is enabled
    const requires2FA = user.two_factor_enabled;

    // Generate JWT token
    const token = generateJWTToken(user);

    const response = {
      success: true,
      message: requires2FA ? '2FA code required' : 'Login successful',
      requires2FA: requires2FA,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        is_verified: user.is_verified,
        registration_status: user.registration_status,
        two_factor_enabled: user.two_factor_enabled,
        phone: user.phone
      }
    };

    if (!requires2FA) {
      response.token = token; // Send JWT token
    }

    console.log('✅ Login successful for user:', user.email, `(${user.username})`);
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
      'SELECT id, email, username, role FROM hakikisha.users WHERE id = $1',
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
        username: user.username,
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
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const userResult = await db.query(
      `SELECT id, email, username, role, is_verified, phone, 
              profile_picture, created_at, last_login, registration_status
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

const checkAvailability = async (req, res) => {
  try {
    const { email, username } = req.query;

    if (!email && !username) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either email or username to check'
      });
    }

    const result = {
      available: true,
      message: 'Available'
    };

    if (email) {
      const existingUser = await db.query(
        'SELECT id FROM hakikisha.users WHERE email = $1',
        [email]
      );
      if (existingUser.rows.length > 0) {
        result.available = false;
        result.message = 'Email already registered';
      }
    }

    if (username && result.available) {
      const existingUser = await db.query(
        'SELECT id FROM hakikisha.users WHERE username = $1',
        [username]
      );
      if (existingUser.rows.length > 0) {
        result.available = false;
        result.message = 'Username already taken';
      }
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId, username, phone, profile_picture } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if username is being updated and if it's available
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          success: false,
          error: 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens'
        });
      }

      const existingUser = await db.query(
        'SELECT id FROM hakikisha.users WHERE username = $1 AND id != $2',
        [username, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken'
        });
      }
    }

    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (username) {
      updateFields.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }

    if (profile_picture !== undefined) {
      updateFields.push(`profile_picture = $${paramCount}`);
      values.push(profile_picture);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');
    values.push(userId);

    const query = `
      UPDATE hakikisha.users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, username, phone, profile_picture, role, is_verified, registration_status, status, created_at, updated_at
    `;

    const result = await db.query(query, values);
    const updatedUser = result.rows[0];

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

module.exports = {
  register,
  login,
  verify2FA,
  logout,
  getCurrentUser,
  checkAvailability,
  updateProfile,
  ensureAuthDatabaseReady
};