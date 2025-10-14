
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();

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
  ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
];

app.use(
  cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in development, restrict in production
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Info'],
    exposedHeaders: ['Content-Range', 'X-Content-Range']
  })
);

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

// Default Root Route (for Render health checks)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'hakikisha-backend',
    message: 'Welcome to Hakikisha Backend!',
    timestamp: new Date().toISOString(),
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
  });
});

// Debug Routes
app.get('/api/debug/env', (req, res) => {
  res.json({
    server: 'Hakikisha Backend',
    status: 'running',
    environment: process.env.NODE_ENV,
    database: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      name: process.env.DB_NAME,
      schema: process.env.DB_SCHEMA,
      hasConfig: true,
    },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/debug/db', async (req, res) => {
  try {
    const db = require('./src/config/database'); // ✅ match server.js
    const result = await db.query(
      'SELECT current_schema(), version(), current_database()'
    );

    res.json({
      success: true,
      database: result?.rows?.[0]?.current_database || null,
      schema: result?.rows?.[0]?.current_schema || null,
      version: result?.rows?.[0]?.version || null,
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
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

module.exports = app;
