const express = require('express');
const factCheckerController = require('../controllers/factCheckerController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

console.log('✅ Fact-checker routes module loaded successfully');

// All routes require fact-checker or admin authentication
router.use(authMiddleware, requireRole(['fact_checker', 'admin']));

// Fact-checker dashboard and stats
router.get('/dashboard', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/dashboard - Dashboard endpoint hit');
  next();
}, factCheckerController.getFactCheckerDashboard);

router.get('/stats', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/stats - Stats endpoint hit');
  next();
}, factCheckerController.getStats);

// Claim management routes
router.get('/claims/pending', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/claims/pending - Pending claims endpoint hit');
  next();
}, factCheckerController.getPendingClaims);

router.get('/claims/:claimId', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/claims/:claimId - Claim details endpoint hit');
  next();
}, factCheckerController.getClaimDetails);

router.post('/claims/:claimId/verdict', (req, res, next) => {
  console.log('🔍 POST /api/v1/fact-checker/claims/:claimId/verdict - Submit verdict endpoint hit');
  next();
}, factCheckerController.submitVerdict);

// AI verdict management
router.get('/ai-suggestions', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/ai-suggestions - AI suggestions endpoint hit');
  next();
}, factCheckerController.getAISuggestions);

router.post('/ai-verdict/approve', (req, res, next) => {
  console.log('🔍 POST /api/v1/fact-checker/ai-verdict/approve - Approve AI verdict endpoint hit');
  next();
}, factCheckerController.approveAIVerdict);

// Blog management routes
router.get('/blogs', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/blogs - Fact-checker blogs endpoint hit');
  next();
}, factCheckerController.getMyBlogs);

// Test endpoint
router.get('/test/endpoint', (req, res) => {
  console.log('🔍 GET /api/v1/fact-checker/test/endpoint - Test endpoint hit');
  res.json({
    success: true,
    message: 'Fact-checker routes are working!',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  console.log('🔍 GET /api/v1/fact-checker/health - Health check endpoint hit');
  res.json({
    success: true,
    message: 'Fact-checker service is healthy',
    user: {
      id: req.user?.userId,
      email: req.user?.email,
      role: req.user?.role
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;