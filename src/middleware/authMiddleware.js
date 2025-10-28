const jwt = require('jsonwebtoken');
const db = require('../config/database');
const Constants = require('./constants');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('🔐 Auth Middleware - Starting authentication check...');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    console.log('Authorization header:', authHeader || 'Not provided');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found in Authorization header');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    console.log('Token extracted:', token ? `${token.substring(0, 30)}...` : 'Empty token');

    if (!token) {
      console.log('❌ Empty token after extraction');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
        code: 'EMPTY_TOKEN'
      });
    }

    // Verify JWT token - USE YOUR ACTUAL JWT SECRET FROM RENDER
    console.log('Verifying JWT token...');
    const JWT_SECRET = process.env.JWT_SECRET || '9ce6aa78491314d5b0e382628f1ca04eab3280570f8b5ca2707323e527ba82ec1787437a328dfad23d12816600a291121365058450664866088cb27d5f232f37';
    
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ JWT token decoded successfully');
    console.log('Decoded token data:', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      iat: decoded.iat,
      exp: decoded.exp
    });

    // Check if user exists in database and is active
    console.log('Checking user in database...');
    const userResult = await db.query(
      `SELECT id, email, username, role, is_verified, registration_status, status, profile_picture
       FROM hakikisha.users 
       WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database for ID:', decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'User account not found.',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];
    console.log('User found in database:', {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      is_verified: user.is_verified,
      registration_status: user.registration_status,
      status: user.status
    });

    // Check if user account is active
    if (user.status !== 'active') {
      console.log('❌ User account is not active:', user.status);
      return res.status(401).json({
        success: false,
        error: 'Account is suspended or inactive. Please contact administrator.',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Check if user is verified and approved
    if (!user.is_verified) {
      console.log('❌ User not verified');
      return res.status(401).json({
        success: false,
        error: 'Account not verified. Please verify your email.',
        code: 'ACCOUNT_NOT_VERIFIED'
      });
    }

    if (user.registration_status !== 'approved') {
      console.log('❌ User registration not approved:', user.registration_status);
      return res.status(401).json({
        success: false,
        error: 'Account not approved. Please contact administrator.',
        code: 'ACCOUNT_PENDING_APPROVAL'
      });
    }

    // Attach complete user information to request
    req.user = {
      userId: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      is_verified: user.is_verified,
      registration_status: user.registration_status,
      status: user.status,
      profile_picture: user.profile_picture
    };

    console.log('✅ Authentication successful for user:', user.email);
    console.log('User attached to request:', {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role
    });
    
    next();
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error.name, error.message);
    
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ JWT Error - Invalid token signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid token signature.',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('❌ JWT Error - Token expired at:', error.expiredAt);
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.name === 'SyntaxError') {
      console.log('❌ JWT Error - Malformed token');
      return res.status(401).json({
        success: false,
        error: 'Malformed token.',
        code: 'MALFORMED_TOKEN'
      });
    }

    // Handle database errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('❌ Database connection error');
      return res.status(503).json({
        success: false,
        error: 'Database unavailable. Please try again later.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // Generic error
    console.error('❌ Unexpected authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to server error.',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    console.log('🔐 Role Check - Required roles:', roles);
    console.log('User role:', req.user?.role);
    
    if (!req.user) {
      console.log('❌ No user object found for role check');
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log('❌ Insufficient permissions. User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({
        success: false,
        error: `Insufficient permissions. Required role: ${roles.join(' or ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredRoles: roles
      });
    }

    console.log('✅ Role check passed for user:', req.user.email);
    next();
  };
};

// Enhanced optional auth middleware that doesn't fail but adds user if available
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const JWT_SECRET = process.env.JWT_SECRET || '9ce6aa78491314d5b0e382628f1ca04eab3280570f8b5ca2707323e527ba82ec1787437a328dfad23d12816600a291121365058450664866088cb27d5f232f37';
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const userResult = await db.query(
          `SELECT id, email, username, role, is_verified, registration_status, status
           FROM hakikisha.users 
           WHERE id = $1 AND status = 'active' AND is_verified = true AND registration_status = 'approved'`,
          [decoded.userId]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          req.user = {
            userId: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            is_verified: user.is_verified,
            registration_status: user.registration_status,
            status: user.status
          };
          console.log('✅ Optional auth - User authenticated:', req.user.email);
        } else {
          console.log('ℹ️ Optional auth - User not found or not active/verified');
        }
      } catch (tokenError) {
        console.log('ℹ️ Optional auth - Invalid token, continuing anonymously:', tokenError.message);
      }
    } else {
      console.log('ℹ️ Optional auth - No token provided, continuing anonymously');
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    console.log('ℹ️ Optional auth - Error, continuing anonymously:', error.message);
    next();
  }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
  console.log('🔐 Admin Check - Checking admin privileges');
  
  if (!req.user) {
    console.log('❌ No user object found for admin check');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    console.log('❌ Admin access required. User role:', req.user.role);
    return res.status(403).json({
      success: false,
      error: 'Administrator access required',
      code: 'ADMIN_ACCESS_REQUIRED',
      userRole: req.user.role
    });
  }

  console.log('✅ Admin check passed for user:', req.user.email);
  next();
};

// Fact-checker only middleware (includes admin)
const requireFactChecker = (req, res, next) => {
  console.log('🔐 Fact-Checker Check - Checking fact-checker privileges');
  
  if (!req.user) {
    console.log('❌ No user object found for fact-checker check');
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!['fact_checker', 'admin'].includes(req.user.role)) {
    console.log('❌ Fact-checker access required. User role:', req.user.role);
    return res.status(403).json({
      success: false,
      error: 'Fact-checker access required',
      code: 'FACT_CHECKER_ACCESS_REQUIRED',
      userRole: req.user.role
    });
  }

  console.log('✅ Fact-checker check passed for user:', req.user.email);
  next();
};

module.exports = {
  authMiddleware,
  requireRole,
  optionalAuth,
  requireAdmin,
  requireFactChecker
};