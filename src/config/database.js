const { Pool } = require('pg');
require('dotenv').config();

console.log('Database Configuration Loading...');
console.log('DATASOURCE_URL:', process.env.DATASOURCE_URL ? 'Set' : 'Not set');
console.log('DATASOURCE_USER:', process.env.DATASOURCE_USER);
console.log('DATASOURCE_PASSWORD:', process.env.DATASOURCE_PASSWORD ? '***' : 'Not set');
console.log('DB_SCHEMA:', process.env.DB_SCHEMA);

// Parse DATASOURCE_URL if provided, otherwise use individual connection parameters
function parseDatabaseConfig() {
  if (process.env.DATASOURCE_URL) {
    try {
      // Parse the DATASOURCE_URL (format: postgresql://user:password@host:port/database)
      const url = process.env.DATASOURCE_URL;
      
      // Handle both postgresql:// and jdbc:postgresql:// formats
      const cleanUrl = url.replace(/^jdbc:/, '');
      const parsed = new URL(cleanUrl);
      
      // Extract connection parameters
      const host = parsed.hostname;
      const port = parseInt(parsed.port) || 5432;
      const database = parsed.pathname.replace('/', '') || 'deepkentom';
      const user = parsed.username || process.env.DATASOURCE_USER;
      const password = parsed.password || process.env.DATASOURCE_PASSWORD;
      
      console.log('Parsed DATASOURCE_URL:', { 
        host, 
        port, 
        database, 
        user: user ? '***' : 'not set',
        hasPassword: !!password 
      });
      
      return {
        host: host,
        port: port,
        database: database,
        user: user,
        password: password,
        // Force SSL for Render PostgreSQL
        ssl: {
          rejectUnauthorized: false
        },
        // Performance optimizations
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        
        // Statement timeout to prevent long-running queries
        statement_timeout: 30000,
        query_timeout: 30000,
        
        // Connection pool monitoring
        application_name: 'hakikisha_backend',
        
        // Keep-alive settings for stable connections
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,

        // Retry configuration
        maxUses: 7500,
      };
    } catch (error) {
      console.error('❌ Error parsing DATASOURCE_URL:', error.message);
      console.error('URL was:', process.env.DATASOURCE_URL);
      // Fall back to individual environment variables
      return getIndividualConfig();
    }
  } else {
    return getIndividualConfig();
  }
}

function getIndividualConfig() {
  console.log('Using individual database configuration');
  return {
    host: process.env.DB_HOST || 'dpg-d1shosh5pdvs73ahbdog-a.frankfurt-postgres.render.com',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'deepkentom',
    user: process.env.DB_USER || process.env.DATASOURCE_USER || 'deepkentom',
    password: process.env.DB_PASSWORD || process.env.DATASOURCE_PASSWORD || 'BN3jcRrGBXERpn9jhGtqEAu2A5wlCh9K',
    // Force SSL for Render PostgreSQL
    ssl: { rejectUnauthorized: false },
    // Performance optimizations
    max: parseInt(process.env.DB_POOL_MAX) || 20,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
    
    // Statement timeout to prevent long-running queries
    statement_timeout: 30000,
    query_timeout: 30000,
    
    // Connection pool monitoring
    application_name: 'hakikisha_backend',
    
    // Keep-alive settings for stable connections
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  };
}

const dbConfig = parseDatabaseConfig();

class Database {
  constructor() {
    this.pool = null;
    this.isInitialized = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
  }

  async initializeDatabase() {
    try {
      this.connectionAttempts++;
      console.log(`🔄 Database connection attempt ${this.connectionAttempts}/${this.maxConnectionAttempts}...`);
      console.log('Database config:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        ssl: !!dbConfig.ssl,
        max: dbConfig.max,
        min: dbConfig.min
      });

      this.pool = new Pool(dbConfig);
      
      // Add error handling to the pool
      this.pool.on('error', (err, client) => {
        console.error('❌ Database pool error:', err);
      });

      this.pool.on('connect', (client) => {
        console.log('✅ New database client connected');
      });

      this.pool.on('acquire', (client) => {
        console.log('🔗 Database client acquired from pool');
      });

      this.pool.on('remove', (client) => {
        console.log('🔌 Database client removed from pool');
      });
      
      // Test connection with retry logic
      let connected = false;
      let lastError = null;
      
      for (let i = 0; i < 3; i++) {
        try {
          const client = await this.pool.connect();
          console.log('✅ Database connected successfully on attempt ' + (i + 1));
          
          // Set schema if specified
          const schema = process.env.DB_SCHEMA || 'hakikisha';
          await client.query(`SET search_path TO ${schema}`);
          console.log(`✅ Schema set to: ${schema}`);
          
          // Test a simple query
          const result = await client.query('SELECT version()');
          console.log('✅ Database version:', result.rows[0].version.substring(0, 50) + '...');
          
          client.release();
          connected = true;
          break;
        } catch (error) {
          lastError = error;
          console.log(`⚠️ Connection attempt ${i + 1} failed:`, error.message);
          if (i < 2) {
            console.log('Retrying in 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!connected) {
        throw lastError || new Error('All connection attempts failed');
      }
      
      this.isInitialized = true;
      this.connectionAttempts = 0;
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      console.error('Connection details:', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        error: error.message
      });
      
      if (error.code) {
        console.error('PostgreSQL error code:', error.code);
      }
      
      this.isInitialized = false;
      
      // Retry connection if we haven't exceeded max attempts
      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`Retrying connection in 5 seconds... (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        return await this.initializeDatabase();
      }
      
      return false;
    }
  }

  async query(text, params) {
    if (!this.isInitialized) {
      const initialized = await this.initializeDatabase();
      if (!initialized) {
        throw new Error('Database not initialized after multiple attempts');
      }
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries (>1s) for performance monitoring
      if (duration > 1000) {
        console.warn(`🐌 SLOW QUERY (${duration}ms):`, text.substring(0, 200));
      }
      
      return result;
    } catch (error) {
      console.error('❌ Query error:', { 
        query: text.substring(0, 200), 
        params: params ? params.slice(0, 3) : 'none',
        error: error.message,
        code: error.code 
      });
      
      // If connection is broken, try to reinitialize
      if (error.code === '57P01' || error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
        console.log('🔄 Connection broken, reinitializing...');
        this.isInitialized = false;
        await this.initializeDatabase();
      }
      
      throw error;
    }
  }

  async connect() {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }
    
    try {
      const client = await this.pool.connect();
      return client;
    } catch (error) {
      console.error('❌ Failed to get client from pool:', error);
      throw error;
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health_check');
      return {
        healthy: true,
        message: 'Database is connected and responsive',
        pool: {
          total: this.totalCount,
          idle: this.idleCount,
          waiting: this.waitingCount
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: error.message,
        pool: {
          total: this.totalCount,
          idle: this.idleCount,
          waiting: this.waitingCount
        }
      };
    }
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
      console.log('🔌 Database pool closed');
    }
  }
}

// Create single instance
const db = new Database();

// Test connection on startup
db.initializeDatabase().then(success => {
  if (success) {
    console.log('🎉 Database initialized successfully!');
  } else {
    console.error('💥 Failed to initialize database after all attempts');
  }
}).catch(error => {
  console.error('💥 Database initialization error:', error);
});

module.exports = db;