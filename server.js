require('dotenv').config();

console.log('Starting Hakikisha Server...');
console.log('Environment:', process.env.NODE_ENV);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const startServer = async () => {
  try {
    let dbInitialized = false;
    let tablesInitialized = false;
    let adminCreated = false;

    console.log('Initializing database connection...');
    
    try {
      // Try to load database configuration
      const db = require('./src/config/database');
      const DatabaseInitializer = require('./src/config/database-init');
      
      console.log('Database modules loaded successfully');
      
      // Check database connection first
      const isConnected = await db.query('SELECT 1').then(() => true).catch(() => false);
      if (!isConnected) {
        throw new Error('Cannot connect to database');
      }
      dbInitialized = true;

      // Force database initialization
      console.log('Starting database initialization...');
      await DatabaseInitializer.initializeCompleteDatabase();
      tablesInitialized = true;
      adminCreated = true;
      
      console.log('Database setup completed successfully!');
      
    } catch (dbError) {
      console.error('Database setup error:', dbError.message);
      console.log('Starting server with limited functionality...');
    }

    // Create express app with trust proxy for Render
    const app = express();
    app.set('trust proxy', 1);
    
    // Enhanced CORS configuration
    app.use(cors({
      origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'capacitor://localhost',
          'http://localhost',
          'ionic://localhost',
          'http://localhost:8100',
          'http://localhost:3000',
          'https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com',
          'https://hakikisha-backend.onrender.com'
        ];
        
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
    }));

    // Handle preflight requests
    app.options('*', cors());
    
    // Middleware
    app.use(helmet());
    app.use(morgan('combined'));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      }
    });
    app.use(limiter);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'hakikisha-backend',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        tables: tablesInitialized ? 'initialized' : 'not initialized',
        admin: adminCreated ? 'created' : 'not created',
        port: process.env.PORT || 10000,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Database debug endpoint
    app.get('/api/debug/db', async (req, res) => {
      try {
        const db = require('./src/config/database');
        const result = await db.query(
          'SELECT current_schema(), version(), current_database()'
        );
        
        const tables = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'hakikisha' 
          ORDER BY table_name
        `);
        
        const users = await db.query('SELECT COUNT(*) as count FROM hakikisha.users');
        const claims = await db.query('SELECT COUNT(*) as count FROM hakikisha.claims');
        const trending = await db.query('SELECT COUNT(*) as count FROM hakikisha.claims WHERE is_trending = true');
        const admin = await db.query('SELECT email, role FROM hakikisha.users WHERE email = $1', ['kellynyachiro@gmail.com']);
        
        res.json({
          success: true,
          database: {
            status: 'connected',
            name: result.rows[0].current_database,
            schema: result.rows[0].current_schema,
            version: result.rows[0].version
          },
          tables: {
            count: tables.rows.length,
            list: tables.rows.map(t => t.table_name)
          },
          stats: {
            users: users.rows[0].count,
            claims: claims.rows[0].count,
            trending_claims: trending.rows[0].count
          },
          admin: {
            exists: admin.rows.length > 0,
            user: admin.rows[0] || null
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          database: {
            status: 'disconnected'
          }
        });
      }
    });

    // API routes
    console.log('Loading API routes...');
    
    // Auth routes
    app.use('/api/v1/auth', require('./src/routes/authRoutes'));
    console.log('✓ Auth routes loaded: /api/v1/auth');
    
    // User routes  
    app.use('/api/v1/users', require('./src/routes/userRoutes'));
    console.log('✓ User routes loaded: /api/v1/users');
    
    // Claims routes
    try {
      app.use('/api/v1/claims', require('./src/routes/claimRoutes'));
      console.log('✓ Claims routes loaded: /api/v1/claims');
    } catch (error) {
      console.error('✗ Claims routes failed to load:', error.message);
    }

    // Test endpoint
    app.get('/api/test', (req, res) => {
      res.json({
        message: 'Hakikisha API is working!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: dbInitialized ? 'connected' : 'disconnected'
      });
    });

    // Debug routes endpoint
    app.get('/api/debug/routes', (req, res) => {
      const routes = [];
      
      function printRoutes(layer, prefix = '') {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods).map(method => method.toUpperCase()).join(', ');
          routes.push({
            path: prefix + layer.route.path,
            methods: methods
          });
        } else if (layer.name === 'router' && layer.handle.stack) {
          const routerPath = layer.regexp.toString().replace(/^\/\^|\\\/\?\(\?=\\\/\|\$\)\/\w\*\$\/?$/g, '') || '';
          layer.handle.stack.forEach(innerLayer => {
            printRoutes(innerLayer, prefix + routerPath);
          });
        }
      }

      app._router.stack.forEach(layer => {
        printRoutes(layer, '');
      });

      res.json({
        message: 'Available API Routes',
        routes: routes.filter(route => route.path.includes('/api/')),
        timestamp: new Date().toISOString()
      });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        message: 'Hakikisha Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        status: 'running',
        database: dbInitialized ? 'connected' : 'disconnected',
        endpoints: {
          health: '/health',
          debug: '/api/debug/db',
          test: '/api/test',
          auth: '/api/v1/auth',
          users: '/api/v1/users',
          claims: '/api/v1/claims'
        }
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: [
          '/health',
          '/api/debug/db',
          '/api/debug/routes',
          '/api/test',
          '/api/v1/auth/*',
          '/api/v1/users/*',
          '/api/v1/claims/*'
        ]
      });
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        path: req.originalUrl
      });
    });

    const PORT = process.env.PORT || 10000;
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('===================================');
      console.log('Hakikisha Server is running!');
      console.log('===================================');
      console.log('Port: ' + PORT);
      console.log('Environment: ' + (process.env.NODE_ENV || 'development'));
      console.log('Database: ' + (dbInitialized ? 'Connected' : 'Not Connected'));
      console.log('Tables: ' + (tablesInitialized ? 'Initialized' : 'Not Initialized'));
      console.log('Admin: ' + (adminCreated ? 'Created' : 'Not Created'));
      console.log('');
      console.log('Endpoints:');
      console.log('   Health: http://localhost:' + PORT + '/health');
      console.log('   DB Debug: http://localhost:' + PORT + '/api/debug/db');
      console.log('   Routes Debug: http://localhost:' + PORT + '/api/debug/routes');
      console.log('   API Test: http://localhost:' + PORT + '/api/test');
      console.log('   Trending Claims: http://localhost:' + PORT + '/api/v1/claims/trending');
      console.log('');
    });

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();