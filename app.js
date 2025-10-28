require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

// Fix for rate limiting on Render - trust proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// CORS Configuration for 5M users on AWS with mobile app support
const allowedOrigins = [
  'capacitor://localhost',
  'http://localhost',
  'ionic://localhost',
  'http://localhost:8100',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com',
  'https://hakikisha-backend.onrender.com',
  ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
].filter(Boolean);

console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin) || 
          origin.startsWith('capacitor://') || 
          origin.startsWith('ionic://') ||
          origin.includes('localhost')) {
        callback(null, true);
      } else {
        // In production, be more restrictive but still log for debugging
        console.log('🌐 CORS blocked origin:', origin);
        if (process.env.NODE_ENV === 'production') {
          // In production, we can be more strict, but for now allow all for testing
          callback(null, true);
        } else {
          callback(null, true); // Allow all in development
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'X-Client-Info',
      'X-API-Key',
      'Accept',
      'Origin'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Total-Count']
  })
);

// Handle preflight requests globally
app.options('*', cors());

// Rate Limiting - More generous limits for fact-checking platform
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // Increased to 1000 requests per window
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and certain endpoints
    return req.url === '/health' || req.url === '/';
  }
});
app.use(limiter);

// Compression
app.use(compression());

// Body Parsing with increased limits for media uploads
app.use(express.json({ 
  limit: '50mb', // Increased for base64 images and large payloads
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  parameterLimit: 100000 // Increased parameter limit
}));

// Enhanced Logging
app.use(morgan('combined', {
  skip: (req, res) => {
    // Skip logging for health checks to reduce noise
    return req.url === '/health' || req.url === '/';
  },
  stream: {
    write: (message) => {
      console.log(message.trim());
    }
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  console.log(`   📍 Origin: ${req.get('origin') || 'No origin'}`);
  console.log(`   👤 User-Agent: ${req.get('User-Agent')?.substring(0, 50)}...`);
  next();
});

// Default Root Route (for Render health checks)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    service: 'hakikisha-backend',
    message: 'Welcome to Hakikisha Fact-Checking Platform API!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    features: [
      'AI-Powered Fact Checking',
      'Human Verification System',
      'Points & Rewards',
      'Blog Publishing',
      'Admin Dashboard',
      'Mobile App Support'
    ],
    endpoints: {
      documentation: '/api/v1',
      health: '/health',
      auth: '/api/v1/auth',
      claims: '/api/v1/claims',
      fact_checker: '/api/v1/fact-checker',
      admin: '/api/v1/admin'
    }
  });
});

// Health Check - Enhanced for monitoring
app.get('/health', async (req, res) => {
  const healthCheck = {
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    service: 'hakikisha-backend',
    version: '2.0.0'
  };

  // Add database health check
  try {
    const db = require('./config/database');
    const dbResult = await db.query('SELECT NOW() as current_time');
    healthCheck.database = {
      status: 'connected',
      current_time: dbResult.rows[0].current_time
    };
  } catch (dbError) {
    healthCheck.database = {
      status: 'disconnected',
      error: dbError.message
    };
    healthCheck.status = 'DEGRADED';
  }

  res.status(200).json(healthCheck);
});

// API Information Endpoint
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hakikisha Fact-Checking API v1',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: {
        login: 'POST /api/v1/auth/login',
        register: 'POST /api/v1/auth/register',
        verify: 'POST /api/v1/auth/verify',
        forgot_password: 'POST /api/v1/auth/forgot-password',
        reset_password: 'POST /api/v1/auth/reset-password'
      },
      claims: {
        submit: 'POST /api/v1/claims/submit',
        my_claims: 'GET /api/v1/claims/my-claims',
        details: 'GET /api/v1/claims/:id',
        trending: 'GET /api/v1/claims/trending',
        search: 'GET /api/v1/claims/search'
      },
      fact_checker: {
        dashboard: 'GET /api/v1/fact-checker/dashboard',
        pending_claims: 'GET /api/v1/fact-checker/claims/pending',
        submit_verdict: 'POST /api/v1/fact-checker/claims/:claimId/verdict',
        stats: 'GET /api/v1/fact-checker/stats',
        ai_suggestions: 'GET /api/v1/fact-checker/ai-suggestions'
      },
      admin: {
        dashboard: 'GET /api/v1/admin/dashboard',
        users: 'GET /api/v1/admin/users',
        claims: 'GET /api/v1/admin/claims',
        activities: 'GET /api/v1/admin/activities'
      },
      blogs: {
        list: 'GET /api/v1/blogs',
        create: 'POST /api/v1/blogs',
        details: 'GET /api/v1/blogs/:id'
      },
      ai: {
        process_claim: 'POST /api/v1/ai/process/:claimId',
        generate_blog: 'POST /api/v1/ai/generate-blog'
      },
      points: {
        leaderboard: 'GET /api/v1/points/leaderboard',
        history: 'GET /api/v1/points/history'
      }
    },
    verdict_types: {
      true: '✅ Claim is accurate and supported by evidence',
      false: '❌ Claim is inaccurate and contradicted by evidence',
      misleading: '⚠️ Claim contains truth but presented misleadingly',
      needs_context: '📋 Claim requires additional context',
      unverifiable: '❓ Not enough evidence to verify'
    }
  });
});

// Debug Routes
app.get('/api/debug/env', (req, res) => {
  // Don't expose all environment variables for security
  res.json({
    success: true,
    server: 'Hakikisha Backend',
    status: 'running',
    environment: process.env.NODE_ENV,
    database: {
      host: process.env.DB_HOST ? 'set' : 'not set',
      user: process.env.DB_USER ? 'set' : 'not set',
      name: process.env.DB_NAME ? 'set' : 'not set',
      schema: process.env.DB_SCHEMA || 'hakikisha',
      connected: !!process.env.DB_HOST
    },
    features: {
      ai_enabled: !!process.env.OPENAI_API_KEY || !!process.env.POE_API_KEY,
      email_enabled: !!process.env.SENDGRID_API_KEY,
      file_upload: true
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/debug/db', async (req, res) => {
  try {
    const db = require('./config/database');
    const result = await db.query(
      'SELECT current_schema(), version(), current_database()'
    );

    // Check if tables exist
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'hakikisha' 
      ORDER BY table_name
    `);

    // Check if admin user exists
    const adminCheck = await db.query(
      'SELECT email, role, username FROM hakikisha.users WHERE email = $1', 
      ['kellynyachiro@gmail.com']
    );

    // Check verdicts table structure
    const verdictsColumns = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'hakikisha' AND table_name = 'verdicts'
      ORDER BY ordinal_position
    `);

    res.json({
      success: true,
      database: {
        name: result?.rows?.[0]?.current_database || null,
        schema: result?.rows?.[0]?.current_schema || null,
        version: result?.rows?.[0]?.version || null,
        status: 'connected'
      },
      tables: {
        count: tables.rows.length,
        list: tables.rows.map(t => t.table_name)
      },
      admin: {
        exists: adminCheck.rows.length > 0,
        user: adminCheck.rows[0] || null
      },
      verdicts_schema: {
        columns: verdictsColumns.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES'
        }))
      },
      message: '✅ Database connected successfully',
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Database connection failed',
    });
  }
});

// Test Route
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'HAKIKISHA API v2 is running! 🚀',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: [
      'Enhanced Verdict System',
      'AI-Powered Fact Checking',
      'Points & Gamification',
      'Admin Dashboard',
      'Fact-Checker Portal',
      'Blog Publishing'
    ],
    admin: {
      email: 'kellynyachiro@gmail.com',
      note: 'Default admin user is automatically created on server start'
    },
    verdicts: {
      supported_types: ['true', 'false', 'misleading', 'needs_context', 'unverifiable'],
      display: {
        true: { label: 'True', color: 'green', icon: '✓' },
        false: { label: 'False', color: 'red', icon: '✗' },
        misleading: { label: 'Misleading', color: 'orange', icon: '⚠' },
        needs_context: { label: 'Needs Context', color: 'yellow', icon: '📋' },
        unverifiable: { label: 'Unverifiable', color: 'gray', icon: '?' }
      }
    }
  });
});

// API Routes (v1) - Updated with new routes
console.log('🔄 Loading API routes...');

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const claimRoutes = require('./src/routes/claimRoutes');
const blogRoutes = require('./src/routes/blogRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const factCheckerRoutes = require('./src/routes/factCheckerRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const pointsRoutes = require('./src/routes/pointsRoutes');

// Mount routes with logging
app.use('/api/v1/auth', (req, res, next) => {
  console.log('🔐 Auth routes accessed');
  next();
}, authRoutes);

app.use('/api/v1/user', (req, res, next) => {
  console.log('👤 User routes accessed');
  next();
}, userRoutes);

app.use('/api/v1/claims', (req, res, next) => {
  console.log('📝 Claims routes accessed');
  next();
}, claimRoutes);

app.use('/api/v1/blogs', (req, res, next) => {
  console.log('📰 Blog routes accessed');
  next();
}, blogRoutes);

app.use('/api/v1/admin', (req, res, next) => {
  console.log('⚙️ Admin routes accessed');
  next();
}, adminRoutes);

app.use('/api/v1/fact-checker', (req, res, next) => {
  console.log('🔍 Fact-checker routes accessed');
  next();
}, factCheckerRoutes);

app.use('/api/v1/ai', (req, res, next) => {
  console.log('🤖 AI routes accessed');
  next();
}, aiRoutes);

app.use('/api/v1/points', (req, res, next) => {
  console.log('🏆 Points routes accessed');
  next();
}, pointsRoutes);

console.log('✅ All API routes loaded successfully');

// 404 Handler - Enhanced
app.use('*', (req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggested_endpoints: [
      '/api/v1/auth/login',
      '/api/v1/claims/submit',
      '/api/v1/claims/my-claims',
      '/api/v1/fact-checker/dashboard',
      '/api/v1/admin/dashboard',
      '/health'
    ],
    documentation: '/api/v1'
  });
});

// Global Error Handler - Enhanced
app.use((err, req, res, next) => {
  console.error('💥 Global Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.email || 'anonymous'
  });

  // JWT authentication errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication token expired',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      code: 'DUPLICATE_RESOURCE',
      details: err.detail
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      success: false,
      error: 'Invalid reference - related resource not found',
      code: 'INVALID_REFERENCE'
    });
  }

  if (err.code === '23502') { // Not null violation
    return res.status(400).json({
      success: false,
      error: 'Required field missing',
      code: 'MISSING_REQUIRED_FIELD'
    });
  }

  // Rate limiting errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    }),
    timestamp: new Date().toISOString()
  });
});

// Server startup message
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 HAKIKISHA FACT-CHECKING PLATFORM API v2.0.0');
  console.log('='.repeat(60));
  console.log(`📍 Server running on port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api/v1`);
  console.log(`❤️ Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Documentation: http://localhost:${PORT}/api/v1`);
  console.log('='.repeat(60));
  console.log('✅ Backend server started successfully!');
  console.log('🎯 Supported verdict types: true, false, misleading, needs_context, unverifiable');
  console.log('👥 User roles: user, fact_checker, admin');
  console.log('🤖 AI Integration: Enabled');
  console.log('🏆 Points System: Enabled');
  console.log('='.repeat(60) + '\n');
});

module.exports = app;