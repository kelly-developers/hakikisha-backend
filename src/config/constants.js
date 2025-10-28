const Constants = {
  // Application Constants
  APP_NAME: 'Hakikisha',
  APP_VERSION: '1.0.0',
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

  // User Roles
  ROLES: {
    USER: 'user',
    FACT_CHECKER: 'fact_checker',
    ADMIN: 'admin'
  },

  // Claim Status
  CLAIM_STATUS: {
    PENDING: 'pending',
    AI_PROCESSING: 'ai_processing',
    HUMAN_REVIEW: 'human_review',
    AI_APPROVED: 'ai_approved',
    HUMAN_APPROVED: 'human_approved',
    PUBLISHED: 'published',
    REJECTED: 'rejected'
  },

  // Verdict Types
  VERDICTS: {
    TRUE: 'true',
    FALSE: 'false',
    MISLEADING: 'misleading',
    SATIRE: 'satire',
    NEEDS_CONTEXT: 'needs_context'
  },

  // Claim Categories
  CATEGORIES: {
    POLITICS: 'politics',
    HEALTH: 'health',
    EDUCATION: 'education',
    TECHNOLOGY: 'technology',
    ENTERTAINMENT: 'entertainment',
    SPORTS: 'sports',
    BUSINESS: 'business',
    OTHER: 'other'
  },

  // Media Types
  MEDIA_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    LINK: 'link'
  },

  // Priority Levels
  PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    VERDICT_READY: 'verdict_ready',
    CLAIM_ASSIGNED: 'claim_assigned',
    SYSTEM_ALERT: 'system_alert',
    BLOG_PUBLISHED: 'blog_published',
    TRENDING_TOPIC: 'trending_topic'
  },

  // Blog Categories
  BLOG_CATEGORIES: {
    FACT_CHECK: 'fact_check',
    EDUCATIONAL: 'educational',
    TRENDING_ANALYSIS: 'trending_analysis',
    COMMUNITY: 'community'
  },

  // AI Configuration
  AI: {
    CONFIDENCE_THRESHOLD: 0.85,
    MAX_RETRIES: 3,
    TIMEOUT: 30000,
    MODEL_VERSION: 'gpt-4'
  },

  // Pagination
  PAGINATION: {
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
    DEFAULT_PAGE: 1
  },

  // Cache TTL (in seconds)
  CACHE_TTL: {
    SHORT: 300, // 5 minutes
    MEDIUM: 3600, // 1 hour
    LONG: 86400, // 1 day
    VERY_LONG: 604800 // 1 week
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
    MESSAGE: 'Too many requests from this IP, please try again later.'
  },

  // Validation Rules
  VALIDATION: {
    EMAIL_MAX_LENGTH: 255,
    PASSWORD_MIN_LENGTH: 8,
    TITLE_MIN_LENGTH: 10,
    TITLE_MAX_LENGTH: 200,
    DESCRIPTION_MIN_LENGTH: 20,
    DESCRIPTION_MAX_LENGTH: 1000,
    EXPLANATION_MIN_LENGTH: 50
  },

  // Error Messages
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Insufficient permissions',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation failed',
    DATABASE_ERROR: 'Database operation failed',
    NETWORK_ERROR: 'Network connection failed',
    AI_SERVICE_ERROR: 'AI service temporarily unavailable'
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    REGISTRATION_SUCCESS: 'Registration successful',
    LOGIN_SUCCESS: 'Login successful',
    CLAIM_SUBMITTED: 'Claim submitted successfully',
    VERDICT_SUBMITTED: 'Verdict submitted successfully',
    BLOG_PUBLISHED: 'Blog published successfully'
  },

  // HTTP Status Codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  }
};

// Freeze object to prevent modifications
Object.freeze(Constants);

module.exports = Constants;