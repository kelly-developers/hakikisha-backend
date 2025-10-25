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
  // Performance optimizations for 5M concurrent users
  max: parseInt(process.env.DB_POOL_MAX) || 100, // Increased from 20 to 100
  min: parseInt(process.env.DB_POOL_MIN) || 10, // Keep minimum connections alive
  idleTimeoutMillis: 10000, // Release idle connections faster
  connectionTimeoutMillis: 5000, // Increased timeout
  
  // Statement timeout to prevent long-running queries
  statement_timeout: 10000, // 10 seconds max per query
  query_timeout: 10000,
  
  // Connection pool monitoring
  application_name: 'hakikisha_backend',
  
  // Keep-alive settings for stable connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
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
      
      // Log slow queries (>1s) for performance monitoring
      if (duration > 1000) {
        console.warn(`SLOW QUERY (${duration}ms):`, text.substring(0, 100));
      }
      
      return result;
    } catch (error) {
      console.error('Query error:', { text: text.substring(0, 100), error: error.message });
      throw error;
    }
  }

  async connect() {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }
    return await this.pool.connect();
  }

  // Expose pool stats for monitoring
  get totalCount() {
    return this.pool?.totalCount || 0;
  }

  get idleCount() {
    return this.pool?.idleCount || 0;
  }

  get waitingCount() {
    return this.pool?.waitingCount || 0;
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