import { Router } from 'express';
import { VerdictController } from '../controllers/verdict.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Submit verdict (fact-checkers only)
router.post('/', requireRole(['fact_checker', 'admin']), VerdictController.submitVerdict);

// Get verdict for a claim
router.get('/claim/:id', VerdictController.getVerdict);

// Get my verdicts (fact-checkers only)
router.get('/my-verdicts', requireRole(['fact_checker', 'admin']), VerdictController.getMyVerdicts);

// Get verdict statistics
router.get('/stats', requireRole(['fact_checker', 'admin']), VerdictController.getVerdictStats);

// Update verdict (fact-checkers only)
router.put('/:id', requireRole(['fact_checker', 'admin']), VerdictController.updateVerdict);

export default router;
