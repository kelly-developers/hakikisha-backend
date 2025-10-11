const Joi = require('joi');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      logger.warn('Validation error:', {
        path: req.path,
        method: req.method,
        error: error.details[0].message
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: error.details[0].message
      });
    }

    next();
  };
};

// Schemas for different request types
const schemas = {
  register: Joi.object({
    email: Joi.string().email().max(Constants.VALIDATION.EMAIL_MAX_LENGTH).required(),
    password: Joi.string().min(Constants.VALIDATION.PASSWORD_MIN_LENGTH).required(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    role: Joi.string().valid(...Object.values(Constants.ROLES)).default(Constants.ROLES.USER)
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  claim: Joi.object({
    title: Joi.string()
      .min(Constants.VALIDATION.TITLE_MIN_LENGTH)
      .max(Constants.VALIDATION.TITLE_MAX_LENGTH)
      .required(),
    description: Joi.string()
      .min(Constants.VALIDATION.DESCRIPTION_MIN_LENGTH)
      .max(Constants.VALIDATION.DESCRIPTION_MAX_LENGTH)
      .required(),
    category: Joi.string().valid(...Object.values(Constants.CATEGORIES)).required(),
    media_type: Joi.string().valid(...Object.values(Constants.MEDIA_TYPES)).default(Constants.MEDIA_TYPES.TEXT),
    media_url: Joi.string().uri().optional()
  }),

  verdict: Joi.object({
    claim_id: Joi.string().uuid().required(),
    verdict: Joi.string().valid(...Object.values(Constants.VERDICTS)).required(),
    explanation: Joi.string().min(Constants.VALIDATION.EXPLANATION_MIN_LENGTH).required(),
    evidence_sources: Joi.array().items(Joi.string().uri()).min(1).required(),
    approve_ai_verdict: Joi.boolean().optional(),
    review_notes: Joi.string().optional(),
    time_spent: Joi.number().integer().min(0).optional()
  }),

  blog: Joi.object({
    title: Joi.string()
      .min(Constants.VALIDATION.TITLE_MIN_LENGTH)
      .max(Constants.VALIDATION.TITLE_MAX_LENGTH)
      .required(),
    content: Joi.string().min(100).required(),
    category: Joi.string().valid(...Object.values(Constants.BLOG_CATEGORIES)).required(),
    featured_image: Joi.string().uri().optional(),
    related_claim_ids: Joi.array().items(Joi.string().uuid()).optional(),
    is_trending: Joi.boolean().default(false)
  }),

  userUpdate: Joi.object({
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    profile_picture: Joi.string().uri().optional()
  }),

  passwordChange: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string()
      .min(Constants.VALIDATION.PASSWORD_MIN_LENGTH)
      .required()
  }),

  notificationPreferences: Joi.object({
    verdict_ready: Joi.boolean().optional(),
    claim_assigned: Joi.boolean().optional(),
    system_alert: Joi.boolean().optional(),
    blog_published: Joi.boolean().optional(),
    trending_topic: Joi.boolean().optional(),
    email_notifications: Joi.boolean().optional(),
    push_notifications: Joi.boolean().optional()
  }),

  fileUpload: Joi.object({
    file: Joi.object({
      originalname: Joi.string().required(),
      mimetype: Joi.string().valid(
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'video/mp4',
        'video/quicktime'
      ).required(),
      size: Joi.number().max(Constants.MAX_FILE_SIZE).required()
    }).unknown(true)
  })
};

// Custom validators
const validators = {
  isEmail: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  isStrongPassword: (password) => {
    const minLength = Constants.VALIDATION.PASSWORD_MIN_LENGTH;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  },

  isURL: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  isUUID: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  isDate: (value) => {
    return !isNaN(Date.parse(value));
  },

  isInFuture: (value) => {
    return new Date(value) > new Date();
  },

  isInPast: (value) => {
    return new Date(value) < new Date();
  }
};

// Middleware to validate file uploads
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'File is required' });
  }

  const { originalname, mimetype, size } = req.file;

  // Validate file type
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 
    'application/pdf', 'video/mp4', 'video/quicktime'
  ];

  if (!allowedMimeTypes.includes(mimetype)) {
    return res.status(400).json({ error: 'Invalid file type' });
  }

  // Validate file size
  if (size > Constants.MAX_FILE_SIZE) {
    return res.status(400).json({ 
      error: `File size must be less than ${Constants.MAX_FILE_SIZE / 1024 / 1024}MB` 
    });
  }

  // Validate file extension
  const extension = originalname.split('.').pop().toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'mp4', 'mov'];
  
  if (!allowedExtensions.includes(extension)) {
    return res.status(400).json({ error: 'Invalid file extension' });
  }

  next();
};

// Middleware to validate query parameters
const validateQueryParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query);
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }

    next();
  };
};

// Query parameter schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  search: Joi.object({
    q: Joi.string().min(2).required(),
    category: Joi.string().valid(...Object.values(Constants.CATEGORIES)).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  timeframe: Joi.object({
    timeframe: Joi.string().pattern(/^\d+\s*(days?|hours?|minutes?)$/).default('30 days'),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

module.exports = {
  validateRequest,
  schemas,
  validators,
  validateFileUpload,
  validateQueryParams,
  querySchemas
};