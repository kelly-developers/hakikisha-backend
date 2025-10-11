import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  phone: z.string().optional(),
  role: z.enum(['user', 'fact_checker']).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const claimSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(500),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  category: z.string().min(1, 'Category is required'),
  media_type: z.enum(['text', 'image', 'video', 'link']),
  media_url: z.string().url().optional().or(z.literal('')),
});

export const verdictSchema = z.object({
  claim_id: z.string().uuid('Invalid claim ID'),
  verdict: z.enum(['true', 'false', 'misleading', 'unverifiable']),
  explanation: z.string().min(50, 'Explanation must be at least 50 characters').max(10000),
  evidence_sources: z.array(z.string().url()).min(1, 'At least one evidence source is required'),
  confidence_score: z.number().min(0).max(100).optional(),
  approve_ai_verdict: z.boolean().optional(),
});

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  category: z.string().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ClaimInput = z.infer<typeof claimSchema>;
export type VerdictInput = z.infer<typeof verdictSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
