const AIService = require('../services/aiService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class AIMiddleware {
  validateAIRequest() {
    return (req, res, next) => {
      const { claim_text, claims, topic } = req.body;

      if (claim_text && claim_text.length > 1000) {
        return res.status(400).json({ 
          error: 'Claim text too long. Maximum 1000 characters allowed.' 
        });
      }

      if (claims && (!Array.isArray(claims) || claims.length > 10)) {
        return res.status(400).json({ 
          error: 'Claims must be an array with maximum 10 items' 
        });
      }

      if (topic && topic.length > 200) {
        return res.status(400).json({ 
          error: 'Topic too long. Maximum 200 characters allowed.' 
        });
      }

      next();
    };
  }

  async checkAIServiceHealth(req, res, next) {
    try {
      // Simple health check by making a small AI request
      const isHealthy = await AIService.healthCheck();
      
      if (!isHealthy) {
        logger.warn('AI service is unavailable');
        return res.status(503).json({ 
          error: 'AI service temporarily unavailable. Please try again later.' 
        });
      }

      next();
    } catch (error) {
      logger.error('AI service health check failed:', error);
      return res.status(503).json({ 
        error: 'AI service temporarily unavailable. Please try again later.' 
      });
    }
  }

  rateLimitAIRequests() {
    const limits = new Map(); // In production, use Redis

    return (req, res, next) => {
      const userId = req.user?.userId || req.ip;
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const maxRequests = 10; // 10 requests per minute

      const userLimits = limits.get(userId) || { count: 0, resetTime: now + windowMs };

      // Reset counter if window has passed
      if (now > userLimits.resetTime) {
        userLimits.count = 0;
        userLimits.resetTime = now + windowMs;
      }

      // Check if limit exceeded
      if (userLimits.count >= maxRequests) {
        const retryAfter = Math.ceil((userLimits.resetTime - now) / 1000);
        
        logger.warn('AI request rate limit exceeded', { userId });
        
        return res.status(429).json({
          error: 'Too many AI requests. Please try again later.',
          retryAfter
        });
      }

      // Increment counter
      userLimits.count++;
      limits.set(userId, userLimits);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': maxRequests - userLimits.count,
        'X-RateLimit-Reset': userLimits.resetTime
      });

      next();
    };
  }

  async validateAIResponse(req, res, next) {
    // Store original response method
    const originalJson = res.json;

    res.json = function(data) {
      if (data.ai_response) {
        const validatedResponse = this.validateAIOutput(data.ai_response);
        
        if (!validatedResponse.valid) {
          logger.warn('Invalid AI response detected', {
            error: validatedResponse.error,
            userId: req.user?.userId
          });

          // You might want to handle this differently based on requirements
          data.ai_response = this.getFallbackResponse();
        }
      }

      originalJson.call(this, data);
    };

    next();
  }

  validateAIOutput(aiResponse) {
    const validations = [
      {
        check: (response) => response && typeof response === 'object',
        error: 'AI response must be an object'
      },
      {
        check: (response) => response.verdict && Constants.VERDICTS.includes(response.verdict),
        error: 'Invalid verdict type'
      },
      {
        check: (response) => response.confidence_score >= 0 && response.confidence_score <= 1,
        error: 'Confidence score must be between 0 and 1'
      },
      {
        check: (response) => response.explanation && response.explanation.length > 0,
        error: 'Explanation is required'
      },
      {
        check: (response) => !response.explanation.includes('<script>'),
        error: 'Explanation contains potentially dangerous content'
      }
    ];

    for (const validation of validations) {
      if (!validation.check(aiResponse)) {
        return { valid: false, error: validation.error };
      }
    }

    return { valid: true };
  }

  getFallbackResponse() {
    return {
      verdict: 'needs_context',
      confidence_score: 0.5,
      explanation: 'Unable to process this claim at the moment. Please try again later or consult with a human fact-checker.',
      sources: []
    };
  }

  async cacheAIResponse(ttl = 300) { // 5 minutes cache
    return async (req, res, next) => {
      if (req.method !== 'POST') {
        return next();
      }

      const cacheKey = `ai:${JSON.stringify(req.body)}`;
      
      try {
        // Try to get cached response
        const cachedResponse = await req.cache.get(cacheKey);
        
        if (cachedResponse) {
          logger.debug('AI cache hit', { key: cacheKey });
          return res.json(cachedResponse);
        }

        // Cache miss - override res.json
        const originalJson = res.json;
        
        res.json = (data) => {
          // Cache successful AI responses
          if (data.success && data.ai_response) {
            req.cache.set(cacheKey, data, ttl).catch(error => {
              logger.error('AI response cache error:', error);
            });
          }

          originalJson.call(res, data);
        };

        next();
      } catch (error) {
        logger.error('AI cache middleware error:', error);
        next();
      }
    };
  }

  async logAIUsage(req, res, next) {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (req.aiUsage) {
        logger.info('AI usage metrics', {
          userId: req.user?.userId,
          endpoint: req.path,
          model: req.aiUsage.model,
          tokens_used: req.aiUsage.tokens,
          duration: `${duration}ms`,
          cost: this.calculateCost(req.aiUsage.tokens),
          timestamp: new Date().toISOString()
        });
      }
    });

    next();
  }

  calculateCost(tokens) {
    // Example cost calculation (adjust based on your AI provider)
    const costPerToken = 0.00002; // Example rate
    return tokens * costPerToken;
  }

  async featureFlag(flagName) {
    return (req, res, next) => {
      // This would check against a feature flag service
      // const isEnabled = await FeatureFlagService.isEnabled(flagName, req.user);
      
      const isEnabled = true; // Default to enabled

      if (!isEnabled) {
        return res.status(403).json({ 
          error: 'This AI feature is currently disabled' 
        });
      }

      next();
    };
  }

  async validateContentSafety(req, res, next) {
    const { claim_text, content } = req.body;

    try {
      // This would integrate with a content safety API
      // const safetyCheck = await ContentSafetyService.check(claim_text || content);
      
      const safetyCheck = { safe: true, reasons: [] }; // Placeholder

      if (!safetyCheck.safe) {
        logger.warn('Content safety check failed', {
          reasons: safetyCheck.reasons,
          userId: req.user?.userId
        });

        return res.status(400).json({
          error: 'Content violates safety guidelines',
          reasons: safetyCheck.reasons
        });
      }

      next();
    } catch (error) {
      logger.error('Content safety check error:', error);
      // Allow to proceed if safety check fails
      next();
    }
  }
}

module.exports = new AIMiddleware();