import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../utils/validators';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      
      const user = await AuthService.register(
        validated.email,
        validated.password,
        validated.phone,
        validated.role || 'user'
      );

      res.status(201).json({
        success: true,
        message: role === 'fact_checker' 
          ? 'Registration submitted for approval. You will be notified once reviewed.'
          : 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          registration_status: user.registration_status
        }
      });
    } catch (error: any) {
      if (error.message === 'User already exists') {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      }
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      
      const result = await AuthService.login(validated.email, validated.password);

      res.json({
        success: true,
        message: 'Login successful',
        ...result
      });
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required'
        });
      }

      const result = await AuthService.refreshToken(refreshToken);

      res.json({
        success: true,
        ...result
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (req.user && token) {
        await AuthService.logout(req.user.userId, token);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
      }

      const user = await AuthService.getCurrentUser(req.user.userId);

      res.json({
        success: true,
        user
      });
    } catch (error) {
      next(error);
    }
  }
}
