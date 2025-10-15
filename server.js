// server.js
require('dotenv').config();

console.log('🚀 Starting Hakikisha Server...');
console.log('🔍 Environment:', process.env.NODE_ENV);

const express = require('express');
const app = require('./app');
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    let dbInitialized = false;
    let tablesInitialized = false;
    let adminCreated = false;

    console.log('🔄 Initializing database connection...');
    
    try {
      // Try to load database configuration from src/config
      let db;
      try {
        db = require('./src/config/database');
        console.log('✅ Database module loaded successfully from src/config');
      } catch (dbModuleError) {
        console.error('❌ Database module not found in src/config:', dbModuleError.message);
        throw new Error('Database configuration not found in src/config');
      }
      
      // Initialize database connection
      if (db && db.initializeDatabase) {
        dbInitialized = await db.initializeDatabase();
        
        if (dbInitialized) {
          console.log('🗃️ Initializing database tables and admin user...');
          
          try {
            // ✅ FIXED PATH: Use src/config/database-init
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
            console.log('🔧 Debug info:', {
              errorStack: initError.stack,
              currentDir: __dirname,
              files: require('fs').readdirSync('./src/config')
            });
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
    const expressApp = express();
    expressApp.set('trust proxy', 1);
    
    // Health check endpoint
    expressApp.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'hakikisha-backend',
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        tables: tablesInitialized ? 'initialized' : 'not initialized',
        admin: adminCreated ? 'created' : 'not created',
        port: PORT
      });
    });

    // Database debug endpoint
    expressApp.get('/api/debug/db', async (req, res) => {
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

    // Files debug endpoint
    expressApp.get('/api/debug/files', (req, res) => {
      const fs = require('fs');
      const path = require('path');
      
      function getFiles(dir, prefix = '') {
        let result = [];
        try {
          const items = fs.readdirSync(dir);
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              result.push(prefix + item + '/');
              result = result.concat(getFiles(fullPath, prefix + item + '/'));
            } else {
              result.push(prefix + item);
            }
          }
        } catch (error) {
          result.push(`Error reading ${dir}: ${error.message}`);
        }
        return result;
      }
      
      res.json({
        currentDirectory: process.cwd(),
        files: getFiles('.'),
        srcConfigFiles: getFiles('./src/config')
      });
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
      console.log(`   Files Debug: https://hakikisha-backend.onrender.com/api/debug/files`);
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