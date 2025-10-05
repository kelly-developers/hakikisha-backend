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

// Enhanced CORS Configuration for Mobile Apps and Render
const corsOptions = {
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
};

app.use(cors(corsOptions));

// Handle preflight requests globally
app.options('*', cors(corsOptions));

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for API server
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
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

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🚀 HAKIKISHA Backend Server is Running!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    server: 'Render - hakikisha-backend.onrender.com',
    endpoints: {
      health: '/health',
      test: '/api/test',
      auth: '/api/auth',
      claims: '/api/claims',
      search: '/api/search',
      verdicts: '/api/verdicts',
      debug: '/api/debug'
    }
  });
});

// Health Check - Enhanced
app.get('/health', (req: Request, res: Response) => {
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

// Connection Test Endpoint
app.get('/api/connection-test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '✅ Connection test successful!',
    server: 'Hakikisha Backend on Render',
    url: 'https://hakikisha-backend.onrender.com',
    timestamp: new Date().toISOString(),
    clientIP: req.ip,
    userAgent: req.get('User-Agent')
  });
});

// Debug Routes
app.get('/api/debug/env', (req: Request, res: Response) => {
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
    cors: {
      enabled: true,
      origins: corsOptions.origin
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(safeEnv);
});

app.get('/api/debug/db', async (req: Request, res: Response) => {
  try {
    // Dynamic import for CommonJS module
    const db = await import('./config/database');
    const result = await db.query('SELECT current_schema(), version(), current_database()');
    
    res.json({
      success: true,
      database: result.rows[0].current_database,
      schema: result.rows[0].current_schema,
      version: result.rows[0].version,
      message: '✅ Database connected successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Database debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Test Route
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ 
    success: true,
    message: '✅ HAKIKISHA API is running perfectly!',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    server: 'Render - hakikisha-backend.onrender.com',
    cors: 'Enabled for all origins'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/verdicts', verdictRoutes);

// Enhanced 404 Handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/test',
      'GET /api/connection-test',
      'GET /api/debug/env',
      'GET /api/debug/db',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/*',
      'GET /api/claims/*',
      'GET /api/search/*',
      'GET /api/verdicts/*'
    ],
    timestamp: new Date().toISOString()
  });
});

// Enhanced Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  
  // Type guard for error with status code
  const isErrorWithStatus = (error: any): error is { status: number; message: string } => {
    return error && typeof error.status === 'number';
  };

  const statusCode = isErrorWithStatus(err) ? err.status : 500;
  
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;