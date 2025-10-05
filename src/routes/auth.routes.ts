import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);

// Protected routes
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;
