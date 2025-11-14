import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/verify-2fa', AuthController.verify2FA);
router.post('/refresh', AuthController.refreshToken);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getCurrentUser);

export default router;
