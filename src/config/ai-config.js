const Constants = require('./constants');

class AIConfig {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    this.apiUrl = process.env.AI_API_URL;
    this.modelVersion = process.env.AI_MODEL_VERSION || Constants.AI.MODEL_VERSION;
    this.maxRetries = Constants.AI.MAX_RETRIES;
    this.timeout = Constants.AI.TIMEOUT;
    this.confidenceThreshold = Constants.AI.CONFIDENCE_THRESHOLD;
  }

  getBaseConfig() {
    return {
      apiKey: this.apiKey,
      apiUrl: this.apiUrl,
      modelVersion: this.modelVersion,
      maxRetries: this.maxRetries,
      timeout: this.timeout
    };
  }

  getClaimAnalysisConfig() {
    return {
      model: this.modelVersion,
      temperature: 0.3,
      max_tokens: 1000,
      systemPrompt: `You are a fact-checking AI assistant. Analyze claims and provide verdicts with explanations and evidence sources.
      Possible verdicts: true, false, misleading, satire, needs_context.
      Always provide confidence score (0-1) and list credible evidence sources.`
    };
  }

  getBlogGenerationConfig() {
    return {
      model: this.modelVersion,
      temperature: 0.7,
      max_tokens: 2000,
      systemPrompt: `You are a content writer for a fact-checking platform. Create engaging, educational blog content based on verified claims.
      Write in a neutral, informative tone. Include factual analysis and debunk misinformation clearly.`
    };
  }

  getTrendingAnalysisConfig() {
    return {
      model: this.modelVersion,
      temperature: 0.2,
      max_tokens: 1500,
      systemPrompt: `Analyze claims data to identify trending topics and misinformation patterns.
      Group similar claims and calculate engagement scores.`
    };
  }

  validateAIConfig() {
    const errors = [];

    if (!this.apiKey) {
      errors.push('AI_API_KEY is required');
    }

    if (!this.apiUrl) {
      errors.push('AI_API_URL is required');
    }

    if (!this.modelVersion) {
      errors.push('AI_MODEL_VERSION is required');
    }

    if (errors.length > 0) {
      throw new Error(`AI configuration errors: ${errors.join(', ')}`);
    }

    return true;
  }

  getEndpoint(endpointType) {
    const endpoints = {
      chat: '/chat/completions',
      models: '/models',
      completions: '/completions'
    };

    return endpoints[endpointType] || endpoints.chat;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': `Hakikisha-Backend/${Constants.APP_VERSION}`
    };
  }

  getRetryConfig() {
    return {
      retries: this.maxRetries,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
      randomize: true
    };
  }
}

module.exports = new AIConfig();