// config/database.js
const { Pool } = require('pg');

console.log('🔧 Loading database configuration...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);

// Create pool with connection details
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback to individual parameters
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Database initialization function
const initializeDatabase = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Database connection attempt ${i + 1}/${retries}...`);
      
      const client = await pool.connect();
      
      // Set schema
      await client.query(`SET search_path TO ${process.env.DB_SCHEMA || 'hakikisha'}, public`);
      
      // Test basic query
      const result = await client.query('SELECT current_schema(), version()');
      
      console.log('✅ Database connected successfully!');
      console.log(`📊 Schema: ${result.rows[0].current_schema}`);
      console.log(`🗃️ PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
      
      client.release();
      return true;
      
    } catch (error) {
      console.error(`❌ Connection attempt ${i + 1}/${retries} failed:`, error.message);
      
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

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initializeDatabase
};