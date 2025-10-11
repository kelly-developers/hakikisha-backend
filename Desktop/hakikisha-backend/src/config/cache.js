const { createClient } = require('redis');
const logger = require('../utils/logger');

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Use environment variable or default to localhost
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      logger.info(`Connecting to Redis: ${redisUrl}`);
      
      this.client = createClient({
        url: redisUrl
      });

      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis Client Connected');
        this.isConnected = true;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.warn('Redis connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async set(key, value, expiration = 3600) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping set operation');
      return null;
    }
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      await this.client.set(key, stringValue, { EX: expiration });
      return true;
    } catch (error) {
      logger.error('Redis set error:', error);
      return false;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      logger.warn('Redis not connected, skipping get operation');
      return null;
    }
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis get error:', error);
      return null;
    }
  }

  async del(key) {
    if (!this.isConnected) return null;
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis delete error:', error);
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Create instance and connect
const cache = new RedisCache();

// Initialize cache (but don't block startup)
cache.connect().catch(err => {
  logger.warn('Cache initialization failed:', err.message);
});

module.exports = cache;