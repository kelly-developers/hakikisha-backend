// server.js
require('dotenv').config();

console.log('🚀 Starting Hakikisha Server...');
console.log('🔍 Environment:', process.env.NODE_ENV);

const express = require('express');
const app = require('./app');
const db = require('./config/database');
const DatabaseInitializer = require('./config/database-init');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    let dbInitialized = false;
    let tablesInitialized = false;
    let adminCreated = false;

    console.log('🔄 Initializing database connection...');
    
    try {
      // Initialize database connection
      dbInitialized = await db.initializeDatabase();
      
      if (dbInitialized) {
        console.log('🗃️ Initializing database tables and admin user...');
        
        try {
          // Initialize tables and admin user
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
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError.message);
      console.log('⚠️ Starting server without database...');
    }

    // Create express app with trust proxy for Render
    const expressApp = express();
    expressApp.set('trust proxy', 1); // Important for rate limiting on Render
    
    // Health check endpoint
    expressApp.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'hakikisha-backend',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        tables: tablesInitialized ? 'initialized' : 'not initialized',
        admin: adminCreated ? 'created' : 'not created'
      });
    });

    // Database debug endpoint
    expressApp.get('/api/debug/db', async (req, res) => {
      try {
        const tables = await db.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'hakikisha' 
          ORDER BY table_name
        `);
        
        const users = await db.query('SELECT COUNT(*) as count FROM hakikisha.users');
        const admin = await db.query('SELECT email, role FROM hakikisha.users WHERE email = $1', ['kellynyachiro@gmail.com']);
        
        res.json({
          database: {
            status: 'connected',
            tables: tables.rows.map(t => t.table_name),
            userCount: users.rows[0].count,
            adminExists: admin.rows.length > 0,
            admin: admin.rows[0] || null
          }
        });
      } catch (error) {
        res.status(500).json({
          database: {
            status: 'error',
            error: error.message
          }
        });
      }
    });

    // Use your main app
    expressApp.use(app);

    // Start server
    expressApp.listen(PORT, '0.0.0.0', () => {
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
      console.log(`   Health: https://hakikisha-backend.onrender.com/health`);
      console.log(`   DB Debug: https://hakikisha-backend.onrender.com/api/debug/db`);
      console.log(`   API Test: https://hakikisha-backend.onrender.com/api/test`);
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