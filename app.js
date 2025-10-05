require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

// Enhanced CORS Configuration for Mobile Apps
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:8081',
    'exp://localhost:19000',
    'http://localhost:19006',
    'https://hakikisha-backend.onrender.com',
    '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Key'
  ],
  exposedHeaders: ['Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Handle preflight requests
app.options('*', cors());

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Compression
app.use(compression());

// Body Parsing with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced Logging
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Health Check - Enhanced
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    server: 'Hakikisha Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'production',
    node_version: process.version,
    platform: process.platform
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 HAKIKISHA Backend Server is Running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      test: '/api/test',
      auth: '/api/auth',
      debug: '/api/debug'
    }
  });
});

// Debug Routes
app.get('/api/debug/env', (req, res) => {
  // Don't expose sensitive information in production
  const safeEnv = {
    server: 'Hakikisha Backend',
    status: 'running',
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    database: {
      host: process.env.DB_HOST ? '***' : 'not set',
      user: process.env.DB_USER ? '***' : 'not set',
      name: process.env.DB_NAME ? '***' : 'not set',
      schema: process.env.DB_SCHEMA,
      hasConfig: !!(process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(safeEnv);
});

app.get('/api/debug/db', async (req, res) => {
  try {
    const db = require('./config/database');
    const result = await db.query('SELECT current_schema(), version(), current_database()');
    
    res.json({
      success: true,
      database: result.rows[0].current_database,
      schema: result.rows[0].current_schema,
      version: result.rows[0].version,
      message: '✅ Database connected successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Test Routes
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: '✅ HAKIKISHA API is working perfectly!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    server: 'Render - hakikisha-backend.onrender.com'
  });
});

// Enhanced Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    const { email, password, name, phone, role = 'user' } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const db = require('./config/database');
    
    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email already exists' 
      });
    }

    // Create user (in production, you should hash the password!)
    // For now, we'll store it directly (NOT RECOMMENDED FOR PRODUCTION)
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, phone, role, registration_status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id, email, name, phone, role, registration_status, created_at`,
      [email, password, name || null, phone || null, role, 'approved']
    );

    console.log('User registered successfully:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      user: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        phone: result.rows[0].phone,
        role: result.rows[0].role,
        registration_status: result.rows[0].registration_status
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error during registration',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }

    const db = require('./config/database');
    
    // Find user
    const user = await db.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // In production, use bcrypt to compare hashed passwords
    // For now, we're comparing plain text (NOT SECURE - FIX THIS IN PRODUCTION)
    if (user.rows[0].password_hash !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate a simple token (in production, use JWT)
    const token = `hakikisha_${user.rows[0].id}_${Date.now()}`;

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: user.rows[0].id,
        email: user.rows[0].email,
        name: user.rows[0].name,
        role: user.rows[0].role
      },
      token: token,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

// Additional test endpoints
app.get('/api/connection-test', (req, res) => {
  res.json({
    success: true,
    message: '✅ Connection test successful!',
    server: 'Hakikisha Backend on Render',
    url: 'https://hakikisha-backend.onrender.com',
    timestamp: new Date().toISOString(),
    clientIP: req.ip,
    headers: req.headers
  });
});

// 404 Handler - Enhanced
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/test',
      'GET /api/debug/env',
      'GET /api/debug/db',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/connection-test'
    ],
    timestamp: new Date().toISOString()
  });
});

// Enhanced Error Handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;