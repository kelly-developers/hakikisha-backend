require('dotenv').config();

console.log('🚀 Starting Hakikisha Server...');
console.log('🔍 Environment:', process.env.NODE_ENV || 'production');
console.log('🔍 Checking environment variables:');
console.log('DB_HOST:', process.env.DB_HOST ? '***' : 'not set');
console.log('DB_USER:', process.env.DB_USER ? '***' : 'not set');
console.log('DB_NAME:', process.env.DB_NAME ? '***' : 'not set');
console.log('PORT:', process.env.PORT);

const app = require('./app');

const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    // Try to initialize databas with retry logic
    let dbInitialized = false;
    let dbError = null;
    
    try {
      const db = require('./config/database');
      console.log('Initializing database connection...');
      
      // Test database connection with retry
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔗 Database connection attempt ${attempt}/3...`);
        try {
          dbInitialized = await db.initializeDatabase();
          if (dbInitialized) break;
        } catch (error) {
          dbError = error;
          if (attempt < 3) {
            console.log(`⏳ Retrying database connection in 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
    } catch (dbError) {
      console.error('❌ Database configuration error:', dbError.message);
      console.log('💡 Make sure config/database.js exists and is properly configured');
    }

    if (dbInitialized) {
      console.log('✅ Database connected successfully!');
    } else {
      console.warn('⚠️  Database connection failed, but starting server anyway for testing');
      console.warn('💡 Error:', dbError?.message);
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('🎉 ==================================================');
      console.log('🎉 HAKIKISHA SERVER STARTED SUCCESSFULLY!');
      console.log('🎉 ==================================================');
      console.log(`🌍 Server running on port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`📊 Database: ${dbInitialized ? '✅ Connected' : '❌ Disconnected'}`);
      console.log('');
      console.log('📍 Available Endpoints:');
      console.log(`   🌐 Main URL: https://hakikisha-backend.onrender.com`);
      console.log(`   ❤️  Health: https://hakikisha-backend.onrender.com/health`);
      console.log(`   🧪 API Test: https://hakikisha-backend.onrender.com/api/test`);
      console.log(`   🔧 Debug: https://hakikisha-backend.onrender.com/api/debug/env`);
      console.log(`   👥 Register: https://hakikisha-backend.onrender.com/api/auth/register`);
      console.log(`   🔐 Login: https://hakikisha-backend.onrender.com/api/auth/login`);
      console.log('');
      console.log('📱 Ready for mobile app connections!');
      console.log('==================================================');
    });
    
  } catch (error) {
    console.error('❌ Server startup error:', error);
    process.exit(1);
  }
};

startServer();