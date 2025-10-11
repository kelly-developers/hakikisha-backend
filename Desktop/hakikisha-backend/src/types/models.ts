export interface User {
  id: string;
  email: string;
  password_hash: string;
  phone?: string;
  role: 'user' | 'fact_checker' | 'admin';
  profile_picture?: string;
  is_verified: boolean;
  registration_status: 'pending' | 'approved' | 'rejected';
  last_login?: Date;
  login_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Claim {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  media_type: 'text' | 'image' | 'video' | 'link';
  media_url?: string;
  status: 'pending' | 'ai_processing' | 'ai_approved' | 'human_review' | 'published' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_trending: boolean;
  trending_score?: number;
  submission_count: number;
  ai_verdict_id?: string;
  human_verdict_id?: string;
  assigned_fact_checker_id?: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}

export interface Verdict {
  id: string;
  claim_id: string;
  fact_checker_id: string;
  verdict: 'true' | 'false' | 'misleading' | 'unverifiable';
  explanation: string;
  evidence_sources: string[];
  confidence_score: number;
  is_final: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AIVerdict {
  id: string;
  claim_id: string;
  verdict: 'true' | 'false' | 'misleading' | 'unverifiable';
  confidence_score: number;
  explanation: string;
  evidence_sources: string[];
  ai_model_version: string;
  approved_by_human: boolean;
  created_at: Date;
}

export interface FactChecker {
  id: string;
  user_id: string;
  expertise_areas: string[];
  verification_status: 'pending' | 'approved' | 'suspended';
  rating: number;
  total_verdicts: number;
  accurate_verdicts: number;
  accuracy_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'claim_status' | 'claim_verdict' | 'registration' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  related_id?: string;
  created_at: Date;
}

export interface SearchLog {
  id: string;
  user_id?: string;
  search_query: string;
  search_type: 'claims' | 'verdicts' | 'blogs';
  results_count: number;
  created_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  created_at: Date;
  last_accessed: Date;
}

export interface RegistrationRequest {
  id: string;
  email: string;
  phone?: string;
  role: 'user' | 'fact_checker';
  expertise_areas?: string[];
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  created_at: Date;
}
