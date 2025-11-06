require('dotenv').config();

console.log('Starting Hakikisha Server...');
console.log('Environment:', process.env.NODE_ENV);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const startServer = async () => {
  try {
    let dbInitialized = false;
    let tablesInitialized = false;
    let adminCreated = false;
    let redisInitialized = false;

    // Initialize Redis for caching
    console.log('Initializing Redis cache...');
    try {
      const { initRedis } = require('./src/config/redis');
      await initRedis();
      redisInitialized = true;
      console.log('Redis initialized successfully');
    } catch (redisError) {
      console.log('Redis not available, using in-memory cache:', redisError.message);
    }

    console.log('Initializing database connection...');
    
    try {
      const db = require('./src/config/database');
      const DatabaseInitializer = require('./src/config/database-init');
      
      console.log('Database modules loaded successfully');
      
      const isConnected = await db.query('SELECT 1').then(() => true).catch(() => false);
      if (!isConnected) {
        throw new Error('Cannot connect to database');
      }
      dbInitialized = true;

      console.log('Starting database initialization...');
      await DatabaseInitializer.initializeCompleteDatabase();
      tablesInitialized = true;
      adminCreated = true;
      
      console.log('Database setup completed successfully!');
      
    } catch (dbError) {
      console.error('Database setup error:', dbError.message);
      console.log('Starting server with limited functionality...');
    }

    const app = express();
    app.set('trust proxy', 1);
    
    app.use(cors({
      origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'capacitor://localhost',
          'http://localhost',
          'ionic://localhost',
          'http://localhost:8100',
          'http://localhost:3000',
          'http://localhost:5173',
          'https://e2280cef-9c3e-485b-aca5-a7c342a041ca.lovableproject.com',
          'https://hakikisha-backend.onrender.com'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
          callback(null, true);
        } else {
          if (process.env.NODE_ENV === 'production') {
            callback(new Error(`CORS blocked for origin: ${origin}`), false);
          } else {
            callback(null, true);
          }
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Info'],
      exposedHeaders: ['Content-Range', 'X-Content-Range']
    }));

    app.options('*', cors());
    
    app.use(helmet());
    app.use(morgan('combined'));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory');
    }

    app.use('/uploads', express.static(uploadsDir));
    console.log('Serving static files from uploads directory');

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      }
    });
    app.use(limiter);

    // Performance middleware
    const { 
      requestTimer, 
      connectionPoolMonitor, 
      memoryMonitor,
      requestId 
    } = require('./src/middleware/performanceMiddleware');
    
    app.use(requestId);
    app.use(requestTimer);
    app.use(connectionPoolMonitor);
    app.use(memoryMonitor);

    // Health check
    app.get('/health', (req, res) => {
      const db = require('./src/config/database');
      const { isAvailable } = require('./src/config/redis');
      
      res.json({
        status: 'ok',
        service: 'hakikisha-backend',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        redis: isAvailable() ? 'connected' : 'disconnected',
        tables: tablesInitialized ? 'initialized' : 'not initialized',
        admin: adminCreated ? 'created' : 'not created',
        uploads: fs.existsSync(uploadsDir) ? 'available' : 'unavailable',
        port: process.env.PORT || 10000,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Debug routes
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
        const verdicts = await db.query('SELECT COUNT(*) as count FROM hakikisha.verdicts');
        const notificationSettings = await db.query('SELECT COUNT(*) as count FROM hakikisha.user_notification_settings');
        
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
            verdicts: verdicts.rows[0].count,
            notification_settings: notificationSettings.rows[0].count
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

    console.log('Loading API routes...');
    
    // Load all routes with proper error handling
    const routes = [
      { path: '/api/v1/auth', file: './src/routes/authRoutes' },
      { path: '/api/v1/user', file: './src/routes/userRoutes' },
      { path: '/api/v1/admin', file: './src/routes/adminRoutes' },
      { path: '/api/v1/claims', file: './src/routes/claimRoutes' },
      { path: '/api/v1/blogs', file: './src/routes/blogRoutes' },
      { path: '/api/v1/fact-checker', file: './src/routes/factCheckerRoutes' },
      { path: '/api/v1/dashboard', file: './src/routes/dashboardRoutes' },
      { path: '/api/v1/ai', file: './src/routes/poeAIRoutes' },
      { path: '/api/v1/notifications', file: './src/routes/notificationRoutes' }, // FIXED: This was missing
      { path: '/api/v1/points', file: './src/routes/pointsRoutes' }
    ];

    for (const route of routes) {
      try {
        const routeModule = require(route.file);
        app.use(route.path, routeModule);
        console.log(` ✅ ${route.path} routes loaded`);
        
        // Log available endpoints for notifications
        if (route.path === '/api/v1/notifications') {
          console.log('   Available notification endpoints:');
          console.log('     GET  /api/v1/notifications/unread-verdicts');
          console.log('     GET  /api/v1/notifications/unread-verdicts/count');
          console.log('     POST /api/v1/notifications/verdicts/:verdictId/read');
          console.log('     POST /api/v1/notifications/verdicts/read-all');
          console.log('     GET  /api/v1/notifications/health');
          console.log('     GET  /api/v1/notifications');
        }
      } catch (error) {
        console.error(` ❌ Failed to load ${route.path} routes:`, error.message);
        
        // Create a fallback route for notifications
        if (route.path === '/api/v1/notifications') {
          console.log('Creating fallback notification routes...');
          const { authMiddleware } = require('./src/middleware/authMiddleware');
          
          app.use('/api/v1/notifications', authMiddleware, (req, res, next) => {
            console.log(`Fallback notification route: ${req.method} ${req.originalUrl}`);
            
            if (req.path === '/unread-verdicts' && req.method === 'GET') {
              return res.json({
                success: true,
                verdicts: [],
                count: 0,
                message: 'Notification system is being initialized'
              });
            }
            
            if (req.path === '/health' && req.method === 'GET') {
              return res.json({
                success: true,
                status: 'initializing',
                message: 'Notification system is starting up'
              });
            }
            
            next();
          });
        }
      }
    }

    // Test endpoints
    app.get('/api/test', (req, res) => {
      res.json({
        message: 'Hakikisha API is working!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: dbInitialized ? 'connected' : 'disconnected',
        uploads: fs.existsSync(uploadsDir) ? 'available' : 'unavailable'
      });
    });

    // Routes debug endpoint
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
        uploads: fs.existsSync(uploadsDir) ? 'available' : 'unavailable',
        endpoints: {
          health: '/health',
          debug: '/api/debug/db',
          debug_routes: '/api/debug/routes',
          test: '/api/test',
          auth: '/api/v1/auth',
          user: '/api/v1/user',
          claims: '/api/v1/claims',
          blogs: '/api/v1/blogs',
          admin: '/api/v1/admin',
          fact_checker: '/api/v1/fact-checker',
          dashboard: '/api/v1/dashboard',
          ai: '/api/v1/ai',
          notifications: '/api/v1/notifications',
          points: '/api/v1/points'
        }
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      console.log(` Route not found: ${req.method} ${req.originalUrl}`);
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
          '/api/v1/user/*',
          '/api/v1/claims/*',
          '/api/v1/blogs/*',
          '/api/v1/admin/*',
          '/api/v1/fact-checker/*',
          '/api/v1/dashboard/*',
          '/api/v1/ai/*',
          '/api/v1/notifications/*',
          '/api/v1/points/*'
        ]
      });
    });

    // Error handler
    app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'File size must be less than 5MB'
        });
      }
      
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        path: req.originalUrl
      });
    });

    const PORT = process.env.PORT || 10000;
    
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
      console.log('Notification Endpoints:');
      console.log('   GET  /api/v1/notifications/unread-verdicts');
      console.log('   GET  /api/v1/notifications/unread-verdicts/count');
      console.log('   POST /api/v1/notifications/verdicts/:id/read');
      console.log('   POST /api/v1/notifications/verdicts/read-all');
      console.log('   GET  /api/v1/notifications/health');
      console.log('');
      console.log('Debug Endpoints:');
      console.log('   Health: http://localhost:' + PORT + '/health');
      console.log('   DB Debug: http://localhost:' + PORT + '/api/debug/db');
      console.log('   Routes Debug: http://localhost:' + PORT + '/api/debug/routes');
      console.log('   API Test: http://localhost:' + PORT + '/api/test');
      console.log('');
    });

  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();