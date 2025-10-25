const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

// Response compression helper
const shouldCompress = (req, res) => {
  if (req.headers['x-no-compression']) {
    return false;
  }
  return true;
};

// Request timing middleware
const requestTimer = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log slow requests (>1s)
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }
    
    // Set response time header
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

// Database query result caching middleware
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `http:${req.originalUrl}`;
    
    try {
      const cachedResponse = await cacheService.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Cache hit', { url: req.originalUrl });
        return res.json(JSON.parse(cachedResponse));
      }

      // Store original res.json
      const originalJson = res.json.bind(res);
      
      // Override res.json
      res.json = (data) => {
        // Cache successful responses
        if (res.statusCode === 200) {
          cacheService.set(cacheKey, JSON.stringify(data), ttl).catch(err => {
            logger.error('Cache set error:', err);
          });
        }
        
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Connection pooling health check
const connectionPoolMonitor = (req, res, next) => {
  const db = require('../config/database');
  
  // Log pool stats periodically (every 100 requests)
  if (Math.random() < 0.01) {
    logger.info('Database pool stats', {
      totalCount: db.totalCount,
      idleCount: db.idleCount,
      waitingCount: db.waitingCount
    });
  }
  
  next();
};

// Memory usage monitor
const memoryMonitor = (req, res, next) => {
  // Log memory usage periodically (every 1000 requests)
  if (Math.random() < 0.001) {
    const memUsage = process.memoryUsage();
    logger.info('Memory usage', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    });
  }
  
  next();
};

// Request ID for tracing
const requestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = {
  requestTimer,
  cacheMiddleware,
  connectionPoolMonitor,
  memoryMonitor,
  requestId,
  shouldCompress
};
