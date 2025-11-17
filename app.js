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
  })
);

// CORS Configuration for 5M users on AWS with mobile app support
const allowedOrigins = [
  'capacitor://localhost',
  'http://localhost',
  'ionic://localhost',
  'http://localhost:8100',
  'https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com',
  'https://hakikisha-backend.onrender.com',
  ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
].filter(Boolean);

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
        callback(null, true);
      } else {
        // In production, be more restrictive
        if (process.env.NODE_ENV === 'production') {
          callback(new Error(`CORS blocked for origin: ${origin}`), false);
        } else {
          callback(null, true); // Allow all in development
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Info'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  })
);

// Handle preflight requests
app.options('*', cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Compression
app.use(compression());

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Default Root Route (Render health checks)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'hakikisha-backend',
    message: 'Welcome to Hakikisha Backend!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    service: 'hakikisha-backend'
  });
});

// Debug Routes
app.get('/api/debug/env', (req, res) => {
  res.json({
    server: 'Hakikisha Backend',
    status: 'running',
    environment: process.env.NODE_ENV,
    database: {
      host: process.env.DB_HOST ? 'set' : 'not set',
      user: process.env.DB_USER ? 'set' : 'not set',
      name: process.env.DB_NAME ? 'set' : 'not set',
      schema: process.env.DB_SCHEMA || 'hakikisha'
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/debug/db', async (req, res) => {
  try {
    const db = require('./config/database'); // ✅ Fixed path - use ./config instead of ./src/config
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
      'SELECT email, role FROM hakikisha.users WHERE email = $1', 
      ['crecocommunication@gmail.com']
    );

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
      message: '✅ Database connected successfully',
    });
  } catch (error) {
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
    message: 'HAKIKISHA API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    admin: {
      email: 'crecocommunication@gmail.com',
      note: 'Default admin user is automatically created on server start'
    }
  });
});

// API Routes (v1)
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const claimRoutes = require('./src/routes/claimRoutes');
const blogRoutes = require('./src/routes/blogRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const factCheckerRoutes = require('./src/routes/factCheckerRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const pointsRoutes = require('./src/routes/pointsRoutes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/claims', claimRoutes);
app.use('/api/v1/blogs', blogRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/fact-checker', factCheckerRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/points', pointsRoutes);

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

module.exports = app;