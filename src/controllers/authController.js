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

    // Log the incoming request for debugging
    console.log('📝 Registration attempt:', { email, username, phone, role });

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, username, and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid phone number format',
          code: 'VALIDATION_ERROR'
        });
      }

      // Check if phone already exists
      const existingUserByPhone = await db.query(
        'SELECT id FROM hakikisha.users WHERE phone = $1',
        [phone]
      );

      if (existingUserByPhone.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Phone number already registered',
          code: 'PHONE_EXISTS'
        });
      }
    }

    // Check if user already exists with email
    const existingUserByEmail = await db.query(
      'SELECT id FROM hakikisha.users WHERE email = $1',
      [email]
    );

    if (existingUserByEmail.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
        code: 'EMAIL_EXISTS'
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
        error: 'Username already taken',
        code: 'USERNAME_EXISTS'
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
       RETURNING id, email, username, phone, role, is_verified, registration_status, status`,
      [uuidv4(), email, username, passwordHash, phone || null, role, isVerified, registrationStatus]
    );

    const newUser = result.rows[0];

    // Generate JWT token
    const token = generateJWTToken(newUser);

    console.log('✅ User registered successfully:', { 
      email: newUser.email, 
      username: newUser.username,
      phone: newUser.phone 
    });

    res.status(201).json({
      success: true,
      message: role === 'user' 
        ? 'Registration successful' 
        : 'Registration submitted for approval',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          phone: newUser.phone,
          role: newUser.role,
          is_verified: newUser.is_verified,
          registration_status: newUser.registration_status,
          status: newUser.status
        },
        token: token
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint.includes('email')) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered',
          code: 'EMAIL_EXISTS'
        });
      } else if (error.constraint.includes('username')) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken',
          code: 'USERNAME_EXISTS'
        });
      } else if (error.constraint.includes('phone')) {
        return res.status(409).json({
          success: false,
          error: 'Phone number already registered',
          code: 'PHONE_EXISTS'
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      code: 'SERVER_ERROR'
    });
  }
};

const login = async (req, res) => {
  try {
    await ensureAuthDatabaseReady();

    const { identifier, password } = req.body; // identifier can be email, username, or phone

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email/username/phone and password are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Find user by email, username, or phone
    const userResult = await db.query(
      `SELECT id, email, username, password_hash, role, is_verified, phone, 
              two_factor_enabled, registration_status, status
       FROM hakikisha.users 
       WHERE email = $1 OR username = $1 OR phone = $1`,
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username/phone or password',
        code: 'AUTH_INVALID'
      });
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Check registration status
    if (user.registration_status !== 'approved') {
      return res.status(403).json({
        success: false,
        error: 'Your account is pending admin approval',
        code: 'PENDING_APPROVAL'
      });
    }

    // Check if user has password_hash
    if (!user.password_hash) {
      return res.status(500).json({
        success: false,
        error: 'User account configuration error',
        code: 'ACCOUNT_ERROR'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email/username/phone or password',
        code: 'AUTH_INVALID'
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
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role: user.role,
          is_verified: user.is_verified,
          registration_status: user.registration_status,
          two_factor_enabled: user.two_factor_enabled
        }
      }
    };

    if (!requires2FA) {
      response.data.token = token; // Send JWT token
    }

    console.log('✅ Login successful for user:', user.email, `(${user.username})`);

    res.json(response);
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      code: 'SERVER_ERROR'
    });
  }
};

const verify2FA = async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({
        success: false,
        error: 'User ID and 2FA code are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Get user
    const userResult = await db.query(
      'SELECT id, email, username, role, phone FROM hakikisha.users WHERE id = $1',
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

    // In a real implementation, verify the 2FA code here
    // For now, we'll just generate a JWT token
    
    const token = generateJWTToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('❌ 2FA verification error:', error);
    res.status(500).json({
      success: false,
      error: '2FA verification failed',
      code: 'SERVER_ERROR'
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
    console.error('❌ Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      code: 'SERVER_ERROR'
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const userResult = await db.query(
      `SELECT id, email, username, role, is_verified, phone, 
              profile_picture, created_at, last_login, registration_status, status
       FROM hakikisha.users 
       WHERE id = $1`,
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

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('❌ Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information',
      code: 'SERVER_ERROR'
    });
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { email, username, phone } = req.query;

    if (!email && !username && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either email, username, or phone to check',
        code: 'VALIDATION_ERROR'
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
        result.code = 'EMAIL_EXISTS';
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
        result.code = 'USERNAME_EXISTS';
      }
    }

    if (phone && result.available) {
      const existingUser = await db.query(
        'SELECT id FROM hakikisha.users WHERE phone = $1',
        [phone]
      );
      if (existingUser.rows.length > 0) {
        result.available = false;
        result.message = 'Phone number already registered';
        result.code = 'PHONE_EXISTS';
      }
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Check availability error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId, username, phone, profile_picture } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Check if username is being updated and if it's available
    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({
          success: false,
          error: 'Username must be 3-20 characters and can only contain letters, numbers, underscores, and hyphens',
          code: 'VALIDATION_ERROR'
        });
      }

      const existingUser = await db.query(
        'SELECT id FROM hakikisha.users WHERE username = $1 AND id != $2',
        [username, userId]
      );
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Username already taken',
          code: 'USERNAME_EXISTS'
        });
      }
    }

    // Check if phone is being updated and if it's available
    if (phone !== undefined && phone !== null) {
      if (phone) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(phone)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid phone number format',
            code: 'VALIDATION_ERROR'
          });
        }

        const existingUser = await db.query(
          'SELECT id FROM hakikisha.users WHERE phone = $1 AND id != $2',
          [phone, userId]
        );
        if (existingUser.rows.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'Phone number already registered',
            code: 'PHONE_EXISTS'
          });
        }
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
        error: 'No fields to update',
        code: 'VALIDATION_ERROR'
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
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      code: 'SERVER_ERROR'
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