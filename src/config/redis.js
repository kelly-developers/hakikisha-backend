const redis = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isRedisAvailable = false;

const initRedis = async () => {
  try {
    // Only use Redis in production or if explicitly configured
    if (!process.env.REDIS_URL && process.env.NODE_ENV !== 'production') {
      logger.info('Redis not configured, using in-memory cache');
      return null;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.error('Redis connection failed after 3 retries');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
      isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
      isRedisAvailable = true;
    });

    await redisClient.connect();
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis:', error.message);
    isRedisAvailable = false;
    return null;
  }
};

const getRedisClient = () => {
  return isRedisAvailable ? redisClient : null;
};

const isAvailable = () => {
  return isRedisAvailable;
};

const closeRedis = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  isAvailable,
  closeRedis
};
