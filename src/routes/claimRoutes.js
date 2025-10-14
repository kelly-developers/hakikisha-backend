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

router.post('/submit', claimController.submitClaim);
router.post('/upload-evidence', upload.single('file'), claimController.uploadEvidence);
router.get('/my-claims', claimController.getMyClaims);
router.get('/:claimId', claimController.getClaimDetails);

module.exports = router;
