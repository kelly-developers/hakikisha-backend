const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hakikisha_db',
  user: process.env.DB_USER || 'hakikisha_user',
  password: process.env.DB_PASSWORD || 'hakikisha_pass',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Add SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

class Database {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  async initializeDatabase() {
    try {
      this.pool = new Pool(dbConfig);
      
      // Test connection
      const client = await this.pool.connect();
      console.log('✅ Database connected successfully');
      client.release();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  async query(text, params) {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`📝 Executed query: ${text}`, { duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('❌ Query error:', { text, error: error.message });
      throw error;
    }
  }

  async connect() {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }
    return await this.pool.connect();
  }
}

// Create single instance
const db = new Database();

module.exports = db;