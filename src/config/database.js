const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hakikisha_db',
  user: process.env.DB_USER || 'hakikisha_user',
  password: process.env.DB_PASSWORD || 'hakikisha_pass',
  // Force SSL for Render PostgreSQL
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

class Database {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
  }

  async initializeDatabase() {
    try {
      console.log('Initializing database connection...');
      console.log('Database config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        ssl: true
      });

      this.pool = new Pool(dbConfig);
      
      // Test connection
      const client = await this.pool.connect();
      console.log('Database connected successfully');
      
      // Set schema if specified
      if (process.env.DB_SCHEMA) {
        await client.query(`SET search_path TO ${process.env.DB_SCHEMA}`);
        console.log(`Schema set to: ${process.env.DB_SCHEMA}`);
      }
      
      client.release();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      this.isInitialized = false;
      return false;
    }
  }

  async query(text, params) {
    if (!this.isInitialized) {
      const initialized = await this.initializeDatabase();
      if (!initialized) {
        throw new Error('Database not initialized');
      }
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`Executed query: ${text}`, { duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  async connect() {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }
    return await this.pool.connect();
  }

  async end() {
    if (this.pool) {
      await this.pool.end();
      this.isInitialized = false;
    }
  }
}

// Create single instance
const db = new Database();

module.exports = db;