import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: 'user' | 'fact_checker' | 'admin';
      };
    }
  }
}

export {};
