const express = require('express');
const multer = require('multer');
const claimController = require('../controllers/claimController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Public routes (no auth required)
router.get('/trending', claimController.getTrendingClaims);
router.get('/search', claimController.searchClaims);

// Protected routes (authentication required)
router.use(authMiddleware);

// Specific routes BEFORE parameterized routes
router.get('/my-claims', claimController.getMyClaims);
router.post('/', claimController.submitClaim);
router.post('/upload-evidence', upload.single('evidence'), claimController.uploadEvidence);
router.get('/verified', claimController.getVerifiedClaims);

// Verdict response routes
router.post('/:claimId/verdict-response', claimController.submitVerdictResponse);
router.get('/:claimId/verdict-responses', claimController.getVerdictResponses);

// Parameterized routes LAST
router.get('/:claimId', claimController.getClaimDetails);

module.exports = router;