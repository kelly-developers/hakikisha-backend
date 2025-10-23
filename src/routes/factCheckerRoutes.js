const express = require('express');
const factCheckerController = require('../controllers/factCheckerController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

console.log('✅ Fact-checker routes module loaded successfully');

// All routes require fact-checker or admin authentication
router.use(authMiddleware, requireRole(['fact_checker', 'admin']));

// Fact-checker specific routes
router.get('/pending-claims', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/pending-claims - Pending claims endpoint hit');
  next();
}, factCheckerController.getPendingClaims);

router.post('/submit-verdict', (req, res, next) => {
  console.log('🔍 POST /api/v1/fact-checker/submit-verdict - Submit verdict endpoint hit');
  next();
}, factCheckerController.submitVerdict);

router.get('/stats', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/stats - Stats endpoint hit');
  next();
}, factCheckerController.getStats);

router.get('/ai-suggestions', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/ai-suggestions - AI suggestions endpoint hit');
  next();
}, factCheckerController.getAISuggestions);

router.post('/approve-ai-verdict', (req, res, next) => {
  console.log('🔍 POST /api/v1/fact-checker/approve-ai-verdict - Approve AI verdict endpoint hit');
  next();
}, factCheckerController.approveAIVerdict);

// Fact-checker blogs routes
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

module.exports = router;