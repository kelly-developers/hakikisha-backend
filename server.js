require('dotenv').config();

console.log('🚀 Starting Hakikisha Server...');
console.log('🔍 Environment:', process.env.NODE_ENV);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const startServer = async () => {
  try {
    let dbInitialized = false;
    let tablesInitialized = false;
    let adminCreated = false;

    console.log('🔄 Initializing database connection...');
    
    try {
      // Try to load database configuration
      let db;
      try {
        db = require('./src/config/database');
        console.log('✅ Database module loaded successfully');
      } catch (dbModuleError) {
        console.error('❌ Database module not found:', dbModuleError.message);
        throw new Error('Database configuration not found');
      }
      
      // Initialize database connection
      if (db && typeof db.initializeDatabase === 'function') {
        dbInitialized = await db.initializeDatabase();
        
        if (dbInitialized) {
          console.log('🗃️ Initializing database tables and admin user...');
          
          try {
            const DatabaseInitializer = require('./src/config/database-init');
            console.log('✅ DatabaseInitializer module loaded successfully');
            
            await DatabaseInitializer.initializeCompleteDatabase();
            tablesInitialized = true;
            
            // Verify admin user was created
            const adminCheck = await db.query(
              'SELECT email, role FROM hakikisha.users WHERE email = $1', 
              ['kellynyachiro@gmail.com']
            );
            
            adminCreated = adminCheck.rows.length > 0;
            
            if (adminCreated) {
              console.log('✅ Admin user verified: kellynyachiro@gmail.com');
            } else {
              console.log('❌ Admin user not found after initialization');
            }
            
            console.log('🎉 Database setup completed successfully!');
          } catch (initError) {
            console.error('❌ Database initialization failed:', initError.message);
            console.log('⚠️ Continuing without database initialization...');
          }
        }
      } else {
        console.error('❌ Database module does not export initializeDatabase function');
      }
    } catch (dbError) {
      console.error('❌ Database setup error:', dbError.message);
      console.log('⚠️ Starting server without database...');
    }

    // Create express app with trust proxy for Render
    const app = express();
    app.set('trust proxy', 1);
    
    // Middleware
    app.use(helmet());
    app.use(cors());
    app.use(morgan('combined'));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
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
        port: process.env.PORT || 10000
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
          users: {
            count: users.rows[0].count
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
    app.use('/api/v1/auth', require('./src/routes/authRoutes'));
    app.use('/api/v1/users', require('./src/routes/userRoutes'));
    
    // Test endpoint
    app.get('/api/test', (req, res) => {
      res.json({
        message: 'Hakikisha API is working!',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.json({
        message: 'Hakikisha Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          debug: '/api/debug/db',
          test: '/api/test',
          auth: '/api/v1/auth'
        }
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
      });
    });

    // Error handling middleware
    app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    const PORT = process.env.PORT || 10000;
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🎉 ===================================');
      console.log(`🎉 Hakikisha Server is running!`);
      console.log(`🎉 ===================================`);
      console.log(`🌍 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Database: ${dbInitialized ? 'Connected ✅' : 'Not Connected ❌'}`);
      console.log(`🗃️ Tables: ${tablesInitialized ? 'Initialized ✅' : 'Not Initialized ❌'}`);
      console.log(`👤 Admin: ${adminCreated ? 'Created ✅' : 'Not Created ❌'}`);
      console.log('');
      console.log('📍 Endpoints:');
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   DB Debug: http://localhost:${PORT}/api/debug/db`);
      console.log(`   API Test: http://localhost:${PORT}/api/test`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();