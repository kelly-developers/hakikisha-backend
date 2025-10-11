const redis = require('../config/cache');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class CacheService {
  constructor() {
    this.client = redis.client;
  }

  async set(key, value, ttl = Constants.CACHE_TTL.MEDIUM) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.set(key, serializedValue, { EX: ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Cache exists check error:', error);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  }

  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Cache keys error:', error);
      return [];
    }
  }

  async flush() {
    try {
      await this.client.flushAll();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }

  async increment(key, amount = 1) {
    try {
      return await this.client.incrBy(key, amount);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return null;
    }
  }

  async decrement(key, amount = 1) {
    try {
      return await this.client.decrBy(key, amount);
    } catch (error) {
      logger.error('Cache decrement error:', error);
      return null;
    }
  }

  async hset(key, field, value) {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.hSet(key, field, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache hset error:', error);
      return false;
    }
  }

  async hget(key, field) {
    try {
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  }

  async hgetall(key) {
    try {
      const values = await this.client.hGetAll(key);
      const result = {};
      
      for (const [field, value] of Object.entries(values)) {
        result[field] = JSON.parse(value);
      }
      
      return result;
    } catch (error) {
      logger.error('Cache hgetall error:', error);
      return {};
    }
  }

  async sadd(key, members) {
    try {
      const stringMembers = members.map(m => JSON.stringify(m));
      await this.client.sAdd(key, stringMembers);
      return true;
    } catch (error) {
      logger.error('Cache sadd error:', error);
      return false;
    }
  }

  async smembers(key) {
    try {
      const members = await this.client.sMembers(key);
      return members.map(m => JSON.parse(m));
    } catch (error) {
      logger.error('Cache smembers error:', error);
      return [];
    }
  }

  async sismember(key, member) {
    try {
      const stringMember = JSON.stringify(member);
      return await this.client.sIsMember(key, stringMember);
    } catch (error) {
      logger.error('Cache sismember error:', error);
      return false;
    }
  }

  // Cache patterns for different data types
  async cacheUserData(userId, userData) {
    const key = `user:${userId}`;
    return this.set(key, userData, Constants.CACHE_TTL.LONG);
  }

  async getUserData(userId) {
    const key = `user:${userId}`;
    return this.get(key);
  }

  async cacheClaimData(claimId, claimData) {
    const key = `claim:${claimId}`;
    return this.set(key, claimData, Constants.CACHE_TTL.MEDIUM);
  }

  async getClaimData(claimId) {
    const key = `claim:${claimId}`;
    return this.get(key);
  }

  async cacheTrendingTopics(topics) {
    const key = 'trending:topics';
    return this.set(key, topics, Constants.CACHE_TTL.SHORT);
  }

  async getTrendingTopics() {
    const key = 'trending:topics';
    return this.get(key);
  }

  async cacheSearchResults(query, results) {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    return this.set(key, results, Constants.CACHE_TTL.MEDIUM);
  }

  async getSearchResults(query) {
    const key = `search:${Buffer.from(query).toString('base64')}`;
    return this.get(key);
  }

  // Rate limiting utilities
  async checkRateLimit(identifier, maxRequests, windowSeconds) {
    const key = `rate_limit:${identifier}`;
    const current = await this.get(key) || 0;

    if (current >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    await this.increment(key);
    await this.expire(key, windowSeconds);

    return { allowed: true, remaining: maxRequests - current - 1 };
  }

  // Session management
  async cacheSession(sessionId, sessionData) {
    const key = `session:${sessionId}`;
    return this.set(key, sessionData, Constants.CACHE_TTL.LONG);
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return this.get(key);
  }

  async invalidateSession(sessionId) {
    const key = `session:${sessionId}`;
    return this.del(key);
  }

  // Lock mechanism for critical operations
  async acquireLock(lockKey, ttl = 10) {
    const key = `lock:${lockKey}`;
    const acquired = await this.set(key, 'locked', ttl);
    return acquired;
  }

  async releaseLock(lockKey) {
    const key = `lock:${lockKey}`;
    return this.del(key);
  }

  // Cache statistics and monitoring
  async getStats() {
    try {
      const info = await this.client.info('memory');
      const keys = await this.keys('*');
      
      return {
        total_keys: keys.length,
        memory_usage: info, // This would need parsing for specific metrics
        hit_rate: await this.calculateHitRate()
      };
    } catch (error) {
      logger.error('Cache stats retrieval error:', error);
      return null;
    }
  }

  async calculateHitRate() {
    // This would require tracking hits and misses
    // For now, return a placeholder
    try {
      const hits = await this.get('cache_stats:hits') || 0;
      const misses = await this.get('cache_stats:misses') || 0;
      const total = hits + misses;
      
      return total > 0 ? hits / total : 0;
    } catch (error) {
      return 0;
    }
  }

  async trackHit() {
    await this.increment('cache_stats:hits');
  }

  async trackMiss() {
    await this.increment('cache_stats:misses');
  }

  // Cache warming
  async warmUpCache() {
    try {
      const warmUpTasks = [
        this.cacheTrendingTopics([]),
        this.cachePopularSearches(),
        this.cacheSystemConfig()
      ];

      await Promise.allSettled(warmUpTasks);
      logger.info('Cache warm-up completed');

    } catch (error) {
      logger.error('Cache warm-up failed:', error);
    }
  }

  async cachePopularSearches() {
    // This would cache frequently searched terms
    const key = 'cache:popular:searches';
    const popularSearches = []; // Would come from analytics
    return this.set(key, popularSearches, Constants.CACHE_TTL.MEDIUM);
  }

  async cacheSystemConfig() {
    const key = 'cache:system:config';
    const config = {
      feature_flags: {},
      rate_limits: {},
      maintenance_mode: false
    };
    return this.set(key, config, Constants.CACHE_TTL.VERY_LONG);
  }

  // Health check
  async healthCheck() {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Cache health check failed:', error);
      return false;
    }
  }
}

module.exports = new CacheService();