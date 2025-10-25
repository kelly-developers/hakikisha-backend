const poeAIService = require('../services/poeAIService');
const logger = require('../utils/logger');

class PoeAIController {
  async chat(req, res, next) {
    try {
      const { prompt, hasAttachments = false, attachmentTypes = [] } = req.body;

      if (!prompt || prompt.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required'
        });
      }

      // Input validation
      if (prompt.length > 5000) {
        return res.status(400).json({
          success: false,
          error: 'Prompt too long. Maximum 5000 characters allowed.'
        });
      }

      if (attachmentTypes && !Array.isArray(attachmentTypes)) {
        return res.status(400).json({
          success: false,
          error: 'attachmentTypes must be an array'
        });
      }

      const result = await poeAIService.chat(prompt, hasAttachments, attachmentTypes);

      res.json(result);

    } catch (error) {
      logger.error('AI chat controller error:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: error.message
        });
      }
      
      if (error.message.includes('configuration error')) {
        return res.status(500).json({
          success: false,
          error: 'AI service configuration error'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate AI response',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async factCheck(req, res, next) {
    try {
      const { claimText, category = 'general', sourceLink } = req.body;

      if (!claimText || claimText.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Claim text is required'
        });
      }

      // Input validation
      if (claimText.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Claim text too long. Maximum 1000 characters allowed.'
        });
      }

      const result = await poeAIService.factCheck(claimText, category, sourceLink);

      res.json(result);

    } catch (error) {
      logger.error('AI fact-check controller error:', error);
      
      if (error.message.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate fact-check',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async analyzeImage(req, res, next) {
    try {
      const { imageUrl, context } = req.body;

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Image URL is required'
        });
      }

      const result = await poeAIService.analyzeImage(imageUrl, context);

      res.json(result);

    } catch (error) {
      logger.error('AI image analysis controller error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to analyze image',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async healthCheck(req, res, next) {
    try {
      const isHealthy = await poeAIService.healthCheck();
      
      if (isHealthy) {
        res.json({
          success: true,
          status: 'healthy',
          message: 'AI service is operational',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          message: 'AI service is temporarily unavailable',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('AI health check error:', error);
      res.status(503).json({
        success: false,
        status: 'error',
        message: 'Failed to check AI service health',
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new PoeAIController();
