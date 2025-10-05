import { Router } from 'express';
import { ClaimController } from '../controllers/claim.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get trending claims first (before :id route)
router.get('/trending', ClaimController.getTrendingClaims);

// Claim submission and management
router.post('/', ClaimController.submitClaim);
router.get('/', ClaimController.getClaims);
router.get('/:id', ClaimController.getClaim);
router.put('/:id', ClaimController.updateClaim);
router.delete('/:id', ClaimController.deleteClaim);
router.post('/:id/status', ClaimController.updateClaimStatus);

export default router;
