const Joi = require('joi');

const validateRegistration = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    phone: Joi.string().pattern(/^\+?[\d\s-()]+$/).optional(),
    role: Joi.string().valid('user', 'fact_checker').default('user')
  });

  return schema.validate(data);
};

const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

const validateClaimSubmission = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(10).max(200).required(),
    description: Joi.string().min(20).max(1000).required(),
    category: Joi.string().valid(
      'politics', 'health', 'education', 'technology', 
      'entertainment', 'sports', 'business', 'other'
    ).required(),
    media_type: Joi.string().valid('text', 'image', 'video', 'link').default('text'),
    media_url: Joi.string().uri().optional()
  });

  return schema.validate(data);
};

const validateVerdict = (data) => {
  const schema = Joi.object({
    claim_id: Joi.string().uuid().required(),
    verdict: Joi.string().valid('true', 'false', 'misleading', 'satire', 'needs_context').required(),
    explanation: Joi.string().min(50).required(),
    evidence_sources: Joi.array().items(Joi.string().uri()).min(1).required(),
    approve_ai_verdict: Joi.boolean().optional()
  });

  return schema.validate(data);
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateClaimSubmission,
  validateVerdict
};