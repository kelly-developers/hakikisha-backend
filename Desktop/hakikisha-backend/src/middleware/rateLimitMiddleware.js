const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/cache');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class RateLimitMiddleware {
  constructor() {
    this.redisClient = redis.client;
  }

  getGeneralLimiter() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args)
      }),
      windowMs: Constants.RATE_LIMIT.WINDOW_MS,
      max: Constants.RATE_LIMIT.MAX_REQUESTS,
      message: {
        error: Constants.RATE_LIMIT.MESSAGE
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `rate_limit:${req.ip}:general`;
      },
      handler: (req, res) => {
        logger.warn('Rate limit exceeded:', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });

        res.status(429).json({
          error: Constants.RATE_LIMIT.MESSAGE,
          retryAfter: Math.ceil(Constants.RATE_LIMIT.WINDOW_MS / 1000)
        });
      }
    });
  }

  getAuthLimiter() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args)
      }),
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts per window
      message: {
        error: 'Too many authentication attempts, please try again later.'
      },
      keyGenerator: (req) => {
        return `rate_limit:${req.ip}:auth`;
      },
      skipSuccessfulRequests: true,
      handler: (req, res) => {
        logger.warn('Auth rate limit exceeded:', {
          ip: req.ip,
          email: req.body.email
        });

        res.status(429).json({
          error: 'Too many authentication attempts, please try again later.',
          retryAfter: 900 // 15 minutes in seconds
        });
      }
    });
  }

  getClaimSubmissionLimiter() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args)
      }),
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 claims per hour
      message: {
        error: 'Too many claim submissions, please try again later.'
      },
      keyGenerator: (req) => {
        return `rate_limit:${req.user?.userId || req.ip}:claims`;
      },
      handler: (req, res) => {
        logger.warn('Claim submission rate limit exceeded:', {
          userId: req.user?.userId,
          ip: req.ip
        });

        res.status(429).json({
          error: 'Too many claim submissions, please try again later.',
          retryAfter: 3600 // 1 hour in seconds
        });
      }
    });
  }

  getSearchLimiter() {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args)
      }),
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 30, // 30 searches per minute
      message: {
        error: 'Too many search requests, please try again later.'
      },
      keyGenerator: (req) => {
        return `rate_limit:${req.user?.userId || req.ip}:search`;
      },
      handler: (req, res) => {
        logger.warn('Search rate limit exceeded:', {
          userId: req.user?.userId,
          ip: req.ip,
          query: req.query.q
        });

        res.status(429).json({
          error: 'Too many search requests, please try again later.',
          retryAfter: 60 // 1 minute in seconds
        });
      }
    });
  }

  getStrictLimiter(maxAttempts, windowMinutes, message) {
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => this.redisClient.sendCommand(args)
      }),
      windowMs: windowMinutes * 60 * 1000,
      max: maxAttempts,
      message: { error: message },
      keyGenerator: (req) => {
        return `rate_limit:${req.ip}:strict`;
      },
      handler: (req, res) => {
        logger.warn('Strict rate limit exceeded:', {
          ip: req.ip,
          path: req.path,
          method: req.method
        });

        res.status(429).json({
          error: message,
          retryAfter: windowMinutes * 60
        });
      }
    });
  }

  // Middleware to skip rate limiting for certain IPs (e.g., internal services)
  skipForInternalIPs(req, res, next) {
    const internalIPs = ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'];
    
    const clientIP = req.ip;
    const isInternal = internalIPs.some(ip => {
      if (ip.includes('/')) {
        // CIDR notation
        return this.isIPInRange(clientIP, ip);
      }
      return clientIP === ip;
    });

    if (isInternal) {
      return next();
    }

    // Continue with rate limiting
    this.getGeneralLimiter()(req, res, next);
  }

  isIPInRange(ip, cidr) {
    // Simplified CIDR check - in production, use a proper library
    const [range, bits] = cidr.split('/');
    return ip.startsWith(range.split('.').slice(0, parseInt(bits) / 8).join('.'));
  }

  // Clean up old rate limit records
  async cleanupOldRecords() {
    try {
      const keys = await this.redisClient.keys('rate_limit:*');
      const now = Date.now();
      
      for (const key of keys) {
        const ttl = await this.redisClient.ttl(key);
        if (ttl === -2) { // Key doesn't exist
          await this.redisClient.del(key);
        }
      }
      
      logger.info('Rate limit cleanup completed');
    } catch (error) {
      logger.error('Rate limit cleanup error:', error);
    }
  }
}

module.exports = new RateLimitMiddleware();