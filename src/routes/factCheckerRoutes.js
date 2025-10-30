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

// NEW: AI Verdicts management routes
router.get('/ai-verdicts', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/ai-verdicts - AI verdicts endpoint hit');
  next();
}, factCheckerController.getAIVerdicts);

router.get('/ai-verdicts/:claimId', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/ai-verdicts/:claimId - AI verdict details endpoint hit');
  next();
}, factCheckerController.getAIVerdictDetails);

router.put('/ai-verdicts/:claimId', (req, res, next) => {
  console.log('🔍 PUT /api/v1/fact-checker/ai-verdicts/:claimId - Edit AI verdict endpoint hit');
  next();
}, factCheckerController.editAIVerdict);

router.get('/ai-suggestions', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/ai-suggestions - AI suggestions endpoint hit');
  next();
}, factCheckerController.getAISuggestions);

// FIXED: Updated approve AI verdict route to accept claimId parameter
router.post('/approve-ai-verdict/:claimId', (req, res, next) => {
  console.log('🔍 POST /api/v1/fact-checker/approve-ai-verdict/:claimId - Approve AI verdict endpoint hit');
  next();
}, factCheckerController.approveAIVerdict);

// Fact-checker blogs routes
router.get('/blogs', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/blogs - Fact-checker blogs endpoint hit');
  next();
}, factCheckerController.getMyBlogs);

// Fact-checker dashboard
router.get('/dashboard', (req, res, next) => {
  console.log('🔍 GET /api/v1/fact-checker/dashboard - Fact-checker dashboard endpoint hit');
  next();
}, factCheckerController.getFactCheckerDashboard);

// Test endpoint
router.get('/test/endpoint', (req, res) => {
  console.log('🔍 GET /api/v1/fact-checker/test/endpoint - Test endpoint hit');
  res.json({
    success: true,
    message: 'Fact-checker routes are working!',
    user: req.user,
    timestamp: new Date().toISOString(),
    endpoints: {
      pending_claims: 'GET /api/v1/fact-checker/pending-claims',
      ai_verdicts: 'GET /api/v1/fact-checker/ai-verdicts',
      edit_ai_verdict: 'PUT /api/v1/fact-checker/ai-verdicts/:claimId',
      submit_verdict: 'POST /api/v1/fact-checker/submit-verdict',
      approve_ai_verdict: 'POST /api/v1/fact-checker/approve-ai-verdict/:claimId',
      dashboard: 'GET /api/v1/fact-checker/dashboard'
    }
  });
});

module.exports = router;