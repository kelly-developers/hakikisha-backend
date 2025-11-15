const { Pool } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.initializePool();
  }

  initializePool() {
    try {
      // Parse your DATASOURCE_URL to extract connection details
      const datasourceUrl = process.env.DATASOURCE_URL || 'postgresql://username:password@host:port/database';
      
      // Extract components from the URL (you might need to adjust this based on your actual URL format)
      const urlPattern = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/;
      const match = datasourceUrl.match(urlPattern);
      
      if (match) {
        const [, user, password, host, port, database] = match;
        
        this.pool = new Pool({
          user: user || process.env.DATASOURCE_USER,
          password: password || process.env.DATASOURCE_PASSWORD,
          host: host,
          port: parseInt(port) || 5432,
          database: database,
          ssl: {
            rejectUnauthorized: false
          },
          // Connection pool settings
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          // Add retry logic
          retry: {
            max: 3,
            timeout: 1000
          }
        });
      } else {
        // Fallback to individual environment variables
        this.pool = new Pool({
          user: process.env.DATASOURCE_USER,
          password: process.env.DATASOURCE_PASSWORD,
          host: 'dpg-d1shosh5pdvs73ahbdog-a.frankfurt-postgres.render.com',
          port: 5432,
          database: 'deepkentom',
          ssl: {
            rejectUnauthorized: false
          },
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
      }

      this.setupEventListeners();
      console.log('✅ Database pool initialized');
    } catch (error) {
      console.error('❌ Error initializing database pool:', error);
    }
  }

  setupEventListeners() {
    this.pool.on('connect', () => {
      console.log('✅ New client connected to database');
      this.isConnected = true;
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ Database pool error:', err);
      this.isConnected = false;
    });

    this.pool.on('remove', () => {
      console.log('ℹ️ Client removed from pool');
    });
  }

  async query(text, params) {
    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      console.log(`✅ Executed query in ${duration}ms:`, {
        query: text,
        duration: duration,
        rows: result.rowCount
      });
      
      return result;
    } catch (error) {
      console.error('❌ Database query error:', {
        query: text,
        params: params,
        error: error.message
      });
      throw error;
    }
  }

  async connect() {
    try {
      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database connection test successful:', result.rows[0]);
      client.release();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  async checkConnection() {
    try {
      const result = await this.query('SELECT 1 as test');
      this.isConnected = true;
      return true;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  async close() {
    try {
      await this.pool.end();
      console.log('✅ Database pool closed');
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Error closing database pool:', error);
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

// Create a single instance
const database = new Database();

module.exports = database;