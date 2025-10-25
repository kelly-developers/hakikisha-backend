const express = require('express');
const poeAIController = require('../controllers/poeAIController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// AI-specific rate limiter (more restrictive)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many AI requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public health check
router.get('/health', poeAIController.healthCheck);

// Protected routes - require authentication
router.use(authMiddleware);
router.use(aiLimiter);

// AI chat endpoint
router.post('/chat', poeAIController.chat);

// AI fact-check endpoint
router.post('/fact-check', poeAIController.factCheck);

// AI image analysis endpoint
router.post('/analyze-image', poeAIController.analyzeImage);

module.exports = router;
