
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

// CORS Configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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

// Test Routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Auth Routes (Temporary)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role = 'user' } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = require('./src/config/database'); // ✅ match server.js

    // Check if user already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [
      email,
    ]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user (in production, hash the password!)
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, registration_status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, role, registration_status`,
      [email, password, role, 'approved']
    );

    res.status(201).json({
      message: 'User registered successfully!',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'Login endpoint - working!' });
});

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
