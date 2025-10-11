// server.js
require('dotenv').config();

console.log('🚀 Starting Hakikisha Server...');
console.log('🔍 Checking environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);

const app = require('./app');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Try to initialize database
    let dbInitialized = false;
    
    try {
      const db = require('./src/config/database');
      console.log('🔄 Initializing database connection...');
      dbInitialized = await db.initializeDatabase();
    } catch (dbError) {
      console.error('❌ Database configuration error:', dbError.message);
      console.log('💡 Make sure config/database.js exists');
      process.exit(1);
    }

    if (dbInitialized) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🎉 Hakikisha Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(`📊 Database: Render PostgreSQL ✅`);
        console.log(`🏥 Health check: http://localhost:${PORT}/health`);
        console.log(`🔍 DB Debug: http://localhost:${PORT}/api/debug/db`);
        console.log(`🔧 Env Debug: http://localhost:${PORT}/api/debug/env`);
      });
    } else {
      console.error('💥 Failed to initialize database. Server cannot start.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer();