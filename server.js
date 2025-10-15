require('dotenv').config();

console.log('🚀 Starting Hakikisha Server...');
console.log('🔍 Checking environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

const express = require('express');
const app = require('./app'); // your main routes
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Initialize database if available
    let dbInitialized = false;
    let dbInitializedComplete = false;
    
    try {
      const db = require('./src/config/database');
      const DatabaseInitializer = require('./config/database-init');
      
      if (db.initializeDatabase) {
        console.log('🔄 Initializing database connection...');
        dbInitialized = await db.initializeDatabase();
        
        if (dbInitialized) {
          console.log('🗃️ Initializing database tables and admin user...');
          await DatabaseInitializer.initializeCompleteDatabase();
          dbInitializedComplete = true;
          console.log('✅ Database tables and admin user created successfully!');
          console.log('👤 Default Admin: kellynyachiro@gmail.com');
        }
      } else {
        console.warn('⚠️ No initializeDatabase() found, skipping DB init');
      }
    } catch (dbError) {
      console.error('❌ Database configuration error:', dbError.message);
      console.log('💡 Make sure src/config/database.js exports initializeDatabase()');
      // do NOT exit — still allow server to start for testing
    }

    // Add a default root route so Render doesn't give 404
    const expressApp = require('express')();
    expressApp.use('/', (req, res, next) => {
      if (req.path === '/' || req.path === '/health') {
        return res.json({
          status: 'ok',
          service: 'hakikisha-backend',
          db: dbInitialized ? 'connected' : 'not connected',
          tables: dbInitializedComplete ? 'initialized' : 'not initialized',
          admin: dbInitializedComplete ? 'created' : 'not created'
        });
      }
      next();
    });
    expressApp.use(app); // plug in your main app

    expressApp.listen(PORT, '0.0.0.0', () => {
      console.log(`🎉 Hakikisha Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📊 Database: ${dbInitialized ? 'Connected ✅' : 'Not Connected ❌'}`);
      console.log(`🗃️ Tables: ${dbInitializedComplete ? 'Initialized ✅' : 'Not Initialized ❌'}`);
      console.log(`👤 Admin: ${dbInitializedComplete ? 'Created ✅' : 'Not Created ❌'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 DB Debug: http://localhost:${PORT}/api/debug/db`);
      console.log(`🔧 Env Debug: http://localhost:${PORT}/api/debug/env`);
    });

  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer();