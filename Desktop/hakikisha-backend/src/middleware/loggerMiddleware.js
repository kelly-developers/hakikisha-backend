const logger = require('../utils/logger');
const Constants = require('../config/constants');

class LoggerMiddleware {
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      // Log request start
      logger.info('Request started', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId || 'anonymous'
      });

      // Store original methods
      const originalSend = res.send;
      const originalJson = res.json;

      // Response interception for logging
      res.send = function(data) {
        logResponse.call(this, data, originalSend);
      };

      res.json = function(data) {
        logResponse.call(this, data, originalJson);
      };

      function logResponse(data, originalMethod) {
        const duration = Date.now() - start;
        
        // Log response
        logger.info('Request completed', {
          method: req.method,
          url: req.url,
          statusCode: this.statusCode,
          duration: `${duration}ms`,
          userId: req.user?.userId || 'anonymous',
          contentLength: this.get('Content-Length') || JSON.stringify(data)?.length || 0
        });

        // Call original method
        originalMethod.call(this, data);
      }

      next();
    };
  }

  errorLogger() {
    return (error, req, res, next) => {
      logger.error('Request error', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.user?.userId || 'anonymous',
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
          statusCode: error.statusCode
        }
      });

      next(error);
    };
  }

  auditLogger() {
    return (req, res, next) => {
      const auditActions = [
        'POST:/api/claims',
        'PUT:/api/verdicts',
        'POST:/api/blogs',
        'PUT:/api/admin'
      ];

      const action = `${req.method}:${req.path}`;
      
      if (auditActions.some(pattern => action.includes(pattern))) {
        logger.info('Audit action', {
          action,
          userId: req.user?.userId,
          userRole: req.user?.role,
          ip: req.ip,
          timestamp: new Date().toISOString(),
          userAgent: req.get('User-Agent'),
          body: this.sanitizeBody(req.body)
        });
      }

      next();
    };
  }

  performanceLogger() {
    return (req, res, next) => {
      const start = process.hrtime();

      res.on('finish', () => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        if (duration > 1000) { // Log slow requests (>1s)
          logger.warn('Slow request', {
            method: req.method,
            url: req.url,
            duration: `${duration.toFixed(2)}ms`,
            userId: req.user?.userId || 'anonymous'
          });
        }

        // Log performance metrics
        logger.debug('Request performance', {
          method: req.method,
          url: req.url,
          duration: `${duration.toFixed(2)}ms`,
          statusCode: res.statusCode
        });
      });

      next();
    };
  }

  securityLogger() {
    return (req, res, next) => {
      // Log potential security issues
      const securityHeaders = {
        'X-Forwarded-For': req.get('X-Forwarded-For'),
        'User-Agent': req.get('User-Agent'),
        'Referer': req.get('Referer')
      };

      // Check for suspicious patterns
      if (this.isSuspiciousRequest(req)) {
        logger.warn('Suspicious request detected', {
          method: req.method,
          url: req.url,
          ip: req.ip,
          headers: securityHeaders,
          userId: req.user?.userId || 'anonymous'
        });
      }

      next();
    };
  }

  isSuspiciousRequest(req) {
    const suspiciousPatterns = [
      /\.\.\//, // Path traversal
      /<script>/i, // XSS attempts
      /union.*select/i, // SQL injection
      /\/\.env/, // Environment file access
      /\/\.git/, // Git directory access
      /\/etc\/passwd/ // System file access
    ];

    const url = req.url.toLowerCase();
    const userAgent = req.get('User-Agent') || '';

    return suspiciousPatterns.some(pattern => 
      pattern.test(url) || pattern.test(userAgent)
    );
  }

  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'creditcard', 'ssn', 'cvv', 'pin'
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  // Custom log levels based on context
  getLogLevel(req) {
    if (req.path.includes('/health') || req.path.includes('/metrics')) {
      return 'debug';
    }

    if (req.method === 'OPTIONS') {
      return 'debug';
    }

    if (res.statusCode >= 500) {
      return 'error';
    }

    if (res.statusCode >= 400) {
      return 'warn';
    }

    return 'info';
  }

  // Correlation ID middleware
  correlationId() {
    return (req, res, next) => {
      const correlationId = req.get('X-Correlation-Id') || this.generateCorrelationId();
      
      // Add to request and response
      req.correlationId = correlationId;
      res.set('X-Correlation-Id', correlationId);

      // Add to logger context
      logger.defaultMeta = {
        ...logger.defaultMeta,
        correlationId
      };

      next();
    };
  }

  generateCorrelationId() {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Request context middleware
  requestContext() {
    return (req, res, next) => {
      req.context = {
        startTime: Date.now(),
        correlationId: req.correlationId,
        userId: req.user?.userId,
        userRole: req.user?.role,
        ip: req.ip
      };

      next();
    };
  }
}

module.exports = new LoggerMiddleware();