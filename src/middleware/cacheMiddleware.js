const cache = require('../config/cache');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class CacheMiddleware {
  constructor() {
    this.defaultTTL = Constants.CACHE_TTL.MEDIUM;
  }

  cacheResponse(ttl = this.defaultTTL, keyGenerator = null) {
    return async (req, res, next) => {
      // Only cache GET requests
      if (req.method !== 'GET') {
        return next();
      }

      // Generate cache key
      const cacheKey = keyGenerator ? keyGenerator(req) : this.generateCacheKey(req);
      
      try {
        // Try to get cached response
        const cachedData = await cache.get(cacheKey);
        
        if (cachedData) {
          logger.debug('Cache hit:', { key: cacheKey, path: req.path });
          
          // Set cache headers
          res.set('X-Cache', 'HIT');
          res.set('Cache-Control', `public, max-age=${ttl}`);
          
          return res.json(cachedData);
        }

        // Cache miss - override res.json to cache the response
        const originalJson = res.json;
        
        res.json = (data) => {
          // Cache the response
          cache.set(cacheKey, data, ttl).catch(error => {
            logger.error('Cache set error:', error);
          });

          // Set cache headers
          res.set('X-Cache', 'MISS');
          res.set('Cache-Control', `public, max-age=${ttl}`);
          
          // Call original method
          originalJson.call(res, data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        // If caching fails, continue without caching
        next();
      }
    };
  }

  generateCacheKey(req) {
    const keyParts = [
      'cache',
      req.path,
      JSON.stringify(req.query),
      req.user?.userId || 'anonymous'
    ];
    
    return keyParts.join(':').replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  // Middleware to clear cache for specific routes
  clearCache(patterns = []) {
    return async (req, res, next) => {
      try {
        // Store original send method
        const originalSend = res.send;
        
        res.send = async (data) => {
          // Clear cache patterns after response
          await this.clearCachePatterns(patterns);
          
          // Call original method
          originalSend.call(res, data);
        };

        next();
      } catch (error) {
        logger.error('Clear cache middleware error:', error);
        next();
      }
    };
  }

  async clearCachePatterns(patterns) {
    try {
      for (const pattern of patterns) {
        const keys = await cache.keys(pattern);
        
        for (const key of keys) {
          await cache.del(key);
        }
        
        logger.debug('Cleared cache patterns:', { pattern, keys: keys.length });
      }
    } catch (error) {
      logger.error('Clear cache patterns error:', error);
    }
  }

  // Middleware to prevent caching for sensitive data
  noCache() {
    return (req, res, next) => {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      next();
    };
  }

  // Cache warm-up function for frequently accessed data
  async warmUpCache() {
    try {
      const warmUpData = [
        { key: 'cache:trending:topics', ttl: Constants.CACHE_TTL.SHORT },
        { key: 'cache:popular:searches', ttl: Constants.CACHE_TTL.MEDIUM },
        { key: 'cache:factcheckers:leaderboard', ttl: Constants.CACHE_TTL.LONG }
      ];

      for (const item of warmUpData) {
        // You would populate these with actual data
        // For now, we'll just set placeholder values
        await cache.set(item.key, { warmed: true }, item.ttl);
      }

      logger.info('Cache warm-up completed');
    } catch (error) {
      logger.error('Cache warm-up error:', error);
    }
  }

  // Health check for cache
  async healthCheck() {
    try {
      const testKey = 'cache:health:check';
      const testValue = { timestamp: Date.now() };
      
      await cache.set(testKey, testValue, 10);
      const retrievedValue = await cache.get(testKey);
      
      return retrievedValue && retrievedValue.timestamp === testValue.timestamp;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }

  // Get cache statistics
  async getStats() {
    try {
      // This would be Redis-specific in production
      const info = await cache.client.info('memory');
      const keys = await cache.keys('cache:*');
      
      return {
        total_keys: keys.length,
        memory_usage: info, // Simplified
        hit_rate: await this.calculateHitRate()
      };
    } catch (error) {
      logger.error('Get cache stats error:', error);
      return null;
    }
  }

  async calculateHitRate() {
    // This would require tracking hits/misses
    // For now, return a placeholder
    return 0.85;
  }
}

module.exports = new CacheMiddleware();