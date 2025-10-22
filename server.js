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

    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'hakikisha-backend',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        tables: tablesInitialized ? 'initialized' : 'not initialized',
        admin: adminCreated ? 'created' : 'not created',
        uploads: fs.existsSync(uploadsDir) ? 'available' : 'unavailable',
        port: process.env.PORT || 10000,
        environment: process.env.NODE_ENV || 'development'
      });
    });

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
        const publicClaims = await db.query('SELECT COUNT(*) as count FROM public.claims');
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
            public_claims: publicClaims.rows[0].count,
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

    // Debug route to test blog routes
    app.get('/api/debug/blog-routes', (req, res) => {
      try {
        const blogRoutes = require('./src/routes/blogRoutes');
        res.json({
          success: true,
          message: 'Blog routes module loaded successfully',
          routes: [
            'GET /api/v1/blogs',
            'GET /api/v1/blogs/trending', 
            'GET /api/v1/blogs/search',
            'GET /api/v1/blogs/stats',
            'GET /api/v1/blogs/:id',
            'POST /api/v1/blogs',
            'GET /api/v1/blogs/user/my-blogs',
            'PUT /api/v1/blogs/:id',
            'DELETE /api/v1/blogs/:id',
            'POST /api/v1/blogs/:id/publish',
            'POST /api/v1/blogs/generate/ai'
          ]
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to load blog routes',
          message: error.message,
          stack: error.stack
        });
      }
    });

    console.log('Loading API routes...');
    
    app.use('/api/v1/auth', require('./src/routes/authRoutes'));
    console.log('✓ Auth routes loaded: /api/v1/auth');
    
    app.use('/api/v1/user', require('./src/routes/userRoutes'));
    console.log('✓ User routes loaded: /api/v1/user');

    app.use('/api/v1/users', require('./src/routes/adminRoutes'));
    console.log('✓ Admin user routes loaded: /api/v1/users');
    
    try {
      app.use('/api/v1/claims', require('./src/routes/claimRoutes'));
      console.log('✓ Claims routes loaded: /api/v1/claims');
    } catch (error) {
      console.error('✗ Claims routes failed to load:', error.message);
    }

    // FIXED: Blog routes loading with better error handling
    try {
      const blogRoutesPath = './src/routes/blogRoutes';
      console.log(`Attempting to load blog routes from: ${blogRoutesPath}`);
      
      const blogRoutes = require(blogRoutesPath);
      app.use('/api/v1/blogs', blogRoutes);
      console.log('✓ Blog routes loaded: /api/v1/blogs');
      
      // Test the blog routes are working
      console.log('   Available blog endpoints:');
      console.log('     GET  /api/v1/blogs');
      console.log('     GET  /api/v1/blogs/trending');
      console.log('     GET  /api/v1/blogs/search');
      console.log('     GET  /api/v1/blogs/stats');
      console.log('     GET  /api/v1/blogs/:id');
      console.log('     POST /api/v1/blogs');
      console.log('     GET  /api/v1/blogs/user/my-blogs');
    } catch (error) {
      console.error('✗ Blog routes failed to load:', error);
      console.error('Error details:', error.stack);
    }

    try {
      const adminRoutes = require('./src/routes/adminRoutes');
      app.use('/api/v1/admin', adminRoutes);
      console.log('✓ Admin routes loaded: /api/v1/admin');
    } catch (error) {
      console.error('✗ Admin routes failed to load:', error.message);
    }

    try {
      app.use('/api/v1/fact-checker', require('./src/routes/factCheckerRoutes'));
      console.log('✓ Fact Checker routes loaded: /api/v1/fact-checker');
    } catch (error) {
      console.error('✗ Fact Checker routes failed to load:', error.message);
    }

    try {
      app.use('/api/v1/dashboard', require('./src/routes/dashboardRoutes'));
      console.log('✓ Dashboard routes loaded: /api/v1/dashboard');
    } catch (error) {
      console.error('✗ Dashboard routes failed to load:', error.message);
    }

    app.get('/api/test', (req, res) => {
      res.json({
        message: 'Hakikisha API is working!',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: dbInitialized ? 'connected' : 'disconnected',
        uploads: fs.existsSync(uploadsDir) ? 'available' : 'unavailable'
      });
    });

    app.get('/api/v1/admin/test', (req, res) => {
      res.json({
        message: 'Admin API is working!',
        timestamp: new Date().toISOString(),
        endpoints: {
          register_fact_checker: 'POST /api/v1/admin/users/register-fact-checker',
          register_admin: 'POST /api/v1/admin/users/register-admin',
          get_users: 'GET /api/v1/admin/users',
          dashboard_stats: 'GET /api/v1/admin/dashboard/stats'
        }
      });
    });

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
          test: '/api/test',
          auth: '/api/v1/auth',
          users: '/api/v1/users',
          user_profile: '/api/v1/user/profile',
          user_profile_picture: '/api/v1/user/profile-picture',
          claims: '/api/v1/claims',
          blogs: '/api/v1/blogs',
          admin: '/api/v1/admin',
          fact_checker: '/api/v1/fact-checker',
          dashboard: '/api/v1/dashboard'
        }
      });
    });

    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        available_endpoints: [
          '/health',
          '/api/debug/db',
          '/api/debug/routes',
          '/api/debug/blog-routes',
          '/api/test',
          '/api/v1/auth/*',
          '/api/v1/users/*',
          '/api/v1/user/*',
          '/api/v1/claims/*',
          '/api/v1/blogs/*',
          '/api/v1/admin/*',
          '/api/v1/fact-checker/*',
          '/api/v1/dashboard/*'
        ]
      });
    });

    app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'File size must be less than 5MB'
        });
      }
      
      if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({
          error: 'Invalid file type',
          message: 'Only image files are allowed'
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
      console.log('Uploads: ' + (fs.existsSync(uploadsDir) ? 'Available' : 'Unavailable'));
      console.log('');
      console.log('Endpoints:');
      console.log('   Health: http://localhost:' + PORT + '/health');
      console.log('   DB Debug: http://localhost:' + PORT + '/api/debug/db');
      console.log('   Routes Debug: http://localhost:' + PORT + '/api/debug/routes');
      console.log('   Blog Routes Debug: http://localhost:' + PORT + '/api/debug/blog-routes');
      console.log('   API Test: http://localhost:' + PORT + '/api/test');
      console.log('   Admin Test: http://localhost:' + PORT + '/api/v1/admin/test');
      console.log('   User Profile: http://localhost:' + PORT + '/api/v1/user/profile');
      console.log('   Upload Profile Picture: POST http://localhost:' + PORT + '/api/v1/user/profile-picture');
      console.log('   Trending Claims: http://localhost:' + PORT + '/api/v1/claims/trending');
      console.log('   Blogs: http://localhost:' + PORT + '/api/v1/blogs');
      console.log('   Trending Blogs: http://localhost:' + PORT + '/api/v1/blogs/trending');
      console.log('   My Blogs: http://localhost:' + PORT + '/api/v1/blogs/user/my-blogs');
      console.log('');
      console.log('Admin Endpoints:');
      console.log('   Register Fact Checker: POST http://localhost:' + PORT + '/api/v1/admin/users/register-fact-checker');
      console.log('   Register Admin: POST http://localhost:' + PORT + '/api/v1/admin/users/register-admin');
      console.log('   Get Users: GET http://localhost:' + PORT + '/api/v1/admin/users');
      console.log('   Dashboard Stats: GET http://localhost:' + PORT + '/api/v1/admin/dashboard/stats');
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