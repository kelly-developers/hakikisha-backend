import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

// Routes
import authRoutes from './src/routes/auth.routes';
import claimRoutes from './src/routes/claim.routes';
import searchRoutes from './src/routes/search.routes';
import verdictRoutes from './src/routes/verdict.routes';

const app = express();

// Fix for rate limiting on Render - trust proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration - Allow mobile app (Capacitor) and web requests
const allowedOrigins = [
  'capacitor://localhost',
  'http://localhost',
  'ionic://localhost',
  'http://localhost:3000',
  'http://localhost:8080',
  'https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com',
  'https://hakikisha-backend.onrender.com',
  ...(process.env.ALLOWED_ORIGINS?.split(',') || [])
].map(origin => origin.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Allow if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow all origins in development mode
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Client-Info'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Compression
app.use(compression());

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Default Root Route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'hakikisha-backend',
    message: 'Welcome to Hakikisha Backend!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    service: 'hakikisha-backend'
  });
});

// Database Status Endpoint
app.get('/api/debug/db', async (req: Request, res: Response) => {
  try {
    const db = require('../config/database'); // ✅ Fixed path for TypeScript
    const result = await db.query('SELECT version(), current_database(), current_schema()');
    
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
      ['kellynyachiro@gmail.com']
    );
    
    res.json({
      database: {
        version: result.rows[0].version,
        name: result.rows[0].current_database,
        schema: result.rows[0].current_schema,
        status: 'connected'
      },
      tables: {
        count: tables.rows.length,
        list: tables.rows.map((t: any) => t.table_name)
      },
      admin: {
        exists: adminCheck.rows.length > 0,
        user: adminCheck.rows[0] || null
      }
    });
  } catch (error: any) {
    res.status(500).json({
      database: {
        status: 'disconnected',
        error: error.message
      }
    });
  }
});

// Environment Debug Endpoint
app.get('/api/debug/env', (req: Request, res: Response) => {
  res.json({
    environment: {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      db_host: process.env.DB_HOST ? 'set' : 'not set',
      db_user: process.env.DB_USER ? 'set' : 'not set',
      db_name: process.env.DB_NAME ? 'set' : 'not set',
      db_schema: process.env.DB_SCHEMA || 'hakikisha'
    },
    service: 'hakikisha-backend',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/verdicts', verdictRoutes);

// Test Route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ 
    success: true,
    message: 'HAKIKISHA API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    admin: {
      email: 'kellynyachiro@gmail.com',
      note: 'Default admin user is automatically created on server start'
    }
  });
});

// 404 Handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

export default app;