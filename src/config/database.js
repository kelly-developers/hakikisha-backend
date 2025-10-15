// src/config/database.js
const { Pool } = require('pg');

console.log('🔧 Loading database configuration...');
console.log('📁 Database config file loaded successfully');

// Create pool with connection details
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual parameters
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Force SSL for Render PostgreSQL
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Database initialization function
const initializeDatabase = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Database connection attempt ${i + 1}/${retries}...`);
      console.log(`🔗 Connecting to: ${process.env.DB_HOST}`);
      
      const client = await pool.connect();
      
      // Set schema
      await client.query(`SET search_path TO ${process.env.DB_SCHEMA || 'hakikisha'}, public`);
      
      // Test basic query
      const result = await client.query('SELECT version(), current_database(), current_schema()');
      
      console.log('✅ Database connected successfully!');
      console.log(`🗃️ Database: ${result.rows[0].current_database}`);
      console.log(`📊 Schema: ${result.rows[0].current_schema}`);
      console.log(`🔧 PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
      
      client.release();
      return true;
      
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1}/${retries} failed:`, error.message);
      console.log(`🔧 Connection details:`, {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        ssl: 'enforced'
      });
      
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 All database connection attempts failed');
        return false;
      }
    }
  }
};

// Event handlers
pool.on('connect', () => {
  console.log('🔗 New database connection established');
});

pool.on('error', (err) => {
  console.error('💥 Database pool error:', err);
});

// Test connection on startup
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('🧪 Connection test: SUCCESS');
    client.release();
  } catch (error) {
    console.error('🧪 Connection test: FAILED -', error.message);
  }
};

// Run test on require
testConnection();

module.exports = {
  query: (text, params) => {
    console.log(`📝 Executing query: ${text.substring(0, 100)}...`);
    return pool.query(text, params);
  },
  pool,
  initializeDatabase
};