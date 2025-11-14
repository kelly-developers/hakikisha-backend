const jwt = require('jsonwebtoken');
const db = require('../config/database');

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
        error: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    console.log('Token extracted:', token ? `${token.substring(0, 30)}...` : 'Empty token');

    if (!token) {
      console.log('❌ Empty token after extraction');
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
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
      `SELECT id, email, role, is_verified, registration_status 
       FROM hakikisha.users 
       WHERE id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database for ID:', decoded.userId);
      return res.status(401).json({
        success: false,
        error: 'User account not found.'
      });
    }

    const user = userResult.rows[0];
    console.log('User found in database:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      registration_status: user.registration_status
    });

    // ENFORCE EMAIL VERIFICATION - Users must verify email before accessing protected routes
    if (!user.is_verified) {
      console.log('❌ User not verified - blocking access to protected route');
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address to access this resource.',
        code: 'EMAIL_NOT_VERIFIED',
        requiresEmailVerification: true,
        userId: user.id
      });
    }

    // Check if user is approved
    if (user.registration_status !== 'approved') {
      console.log('❌ User registration not approved:', user.registration_status);
      return res.status(401).json({
        success: false,
        error: 'Account not approved. Please contact administrator.'
      });
    }

    // Attach complete user information to request
    req.user = {
      userId: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      registration_status: user.registration_status
    };

    console.log('✅ Authentication successful for user:', user.email);
    console.log('User attached to request:', req.user);
    
    next();
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error.name, error.message);
    
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ JWT Error - Invalid token signature');
      return res.status(401).json({
        success: false,
        error: 'Invalid token signature.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.log('❌ JWT Error - Token expired at:', error.expiredAt);
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.'
      });
    }

    if (error.name === 'SyntaxError') {
      console.log('❌ JWT Error - Malformed token');
      return res.status(401).json({
        success: false,
        error: 'Malformed token.'
      });
    }

    // Handle database errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('❌ Database connection error');
      return res.status(503).json({
        success: false,
        error: 'Database unavailable. Please try again later.'
      });
    }

    // Generic error
    console.error('❌ Unexpected authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed due to server error.'
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
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log('❌ Insufficient permissions. User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Required roles: ' + roles.join(', ')
      });
    }

    console.log('✅ Role check passed for user:', req.user.email);
    next();
  };
};

// Optional: Create a soft auth middleware that doesn't fail but adds user if available
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const JWT_SECRET = process.env.JWT_SECRET || '9ce6aa78491314d5b0e382628f1ca04eab3280570f8b5ca2707323e527ba82ec1787437a328dfad23d12816600a291121365058450664866088cb27d5f232f37';
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const userResult = await db.query(
        `SELECT id, email, role, is_verified, registration_status 
         FROM hakikisha.users 
         WHERE id = $1 AND is_verified = true AND registration_status = 'approved'`,
        [decoded.userId]
      );

      if (userResult.rows.length > 0) {
        req.user = {
          userId: userResult.rows[0].id,
          email: userResult.rows[0].email,
          role: userResult.rows[0].role
        };
        console.log('✅ Optional auth - User authenticated:', req.user.email);
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    console.log('ℹ️ Optional auth - No valid token, continuing anonymously');
    next();
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  optionalAuth
};