const express = require('express');
const claimController = require('../controllers/claimController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Claim submission and management
router.post('/', claimController.submitClaim);
router.get('/', claimController.getClaims);
router.get('/:id', claimController.getClaim);
router.get('/trending', claimController.getTrendingClaims);
router.put('/:id', claimController.updateClaim);
router.delete('/:id', claimController.deleteClaim);
router.post('/:id/status', claimController.updateClaimStatus);

module.exports = router;