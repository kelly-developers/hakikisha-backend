import 'dotenv/config';
import app from './app';
import { initializeDatabase } from './src/config/database';
import DatabaseInitializer from './src/config/database-init';

const PORT = process.env.PORT || 5000;

console.log('🚀 Starting HAKIKISHA Server...');
console.log('🔍 Environment:', process.env.NODE_ENV);
console.log('🔍 Database Host:', process.env.DB_HOST);

const startServer = async () => {
  try {
    // Initialize database connection
    console.log('🔄 Initializing database connection...');
    const dbInitialized = await initializeDatabase();

    if (!dbInitialized) {
      console.error('Failed to initialize database. Server cannot start.');
      process.exit(1);
    }

    // Initialize database tables and create admin user
    console.log('🗃️ Initializing database tables and admin user...');
    await DatabaseInitializer.initializeCompleteDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log('');
      console.log('===================================');
      console.log(`HAKIKISHA Server is running!`);
      console.log(`===================================`);
      console.log(`Port: ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Database: PostgreSQL ✅`);
      console.log(`Default Admin: kellynyachiro@gmail.com`);
      console.log('');
      console.log('Endpoints:');
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   API Test: http://localhost:${PORT}/api/test`);
      console.log(`   Auth: http://localhost:${PORT}/api/auth/*`);
      console.log(`   Claims: http://localhost:${PORT}/api/claims/*`);
      console.log('');
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

startServer();