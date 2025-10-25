const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class PoeAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.POE_API_KEY || "ZceEiyLZg4JbvhV8UDpnY0rMT037Pi4QIhdPy4pirRA",
      baseURL: "https://api.poe.com/v1",
    });
    this.model = "Web-Search";
    this.systemPrompt = "You are Hakikisha AI, an election fact-checking assistant for Kenya. Provide accurate, helpful information about elections, voting, and claims. Always be professional and unbiased.";
    this.disclaimer = "\n\n⚠️ This response is AI-generated. CRECO is not responsible for any implications. Please verify important information.";
  }

  async chat(prompt, hasAttachments = false, attachmentTypes = []) {
    try {
      if (!prompt || prompt.trim() === '') {
        throw new Error('Prompt is required');
      }

      // Check cache first
      const cacheKey = `ai:chat:${JSON.stringify({ prompt, hasAttachments, attachmentTypes })}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('AI chat cache hit');
        return JSON.parse(cached);
      }

      // Enhance prompt with attachment context
      let enhancedPrompt = prompt;
      if (hasAttachments && attachmentTypes.length > 0) {
        const types = attachmentTypes.join(', ');
        enhancedPrompt = `[User attached ${types}]\n\n${prompt}`;
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: this.systemPrompt
          },
          {
            role: "user",
            content: enhancedPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const responseText = response.choices[0].message.content;
      const result = {
        success: true,
        response: responseText + this.disclaimer,
        model: this.model,
        timestamp: new Date().toISOString()
      };

      // Cache for 5 minutes
      await cacheService.set(cacheKey, JSON.stringify(result), 300);
      
      logger.info('AI chat completed successfully');
      return result;

    } catch (error) {
      logger.error('AI chat error:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 401) {
        throw new Error('AI service configuration error');
      }
      
      throw new Error('AI service temporarily unavailable');
    }
  }

  async factCheck(claimText, category = 'general', sourceLink = null) {
    try {
      if (!claimText || claimText.trim() === '') {
        throw new Error('Claim text is required');
      }

      // Check cache
      const cacheKey = `ai:factcheck:${JSON.stringify({ claimText, category })}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('AI fact-check cache hit');
        return JSON.parse(cached);
      }

      const factCheckPrompt = `
Analyze this claim and provide a fact-check verdict:

Claim: "${claimText}"
Category: ${category}
Source: ${sourceLink || 'Not provided'}

Provide:
1. Verdict (verified/false/misleading/needs_context)
2. Detailed explanation
3. Confidence level (high/medium/low)
4. Suggested reliable sources to verify this claim

Format your response clearly and professionally.
`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a professional fact-checker. Analyze claims objectively and provide evidence-based verdicts."
          },
          {
            role: "user",
            content: factCheckPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });

      const responseText = response.choices[0].message.content;
      const verdict = this._extractVerdict(responseText);

      const result = {
        success: true,
        aiVerdict: {
          verdict: verdict,
          explanation: responseText,
          confidence: this._extractConfidence(responseText),
          timestamp: new Date().toISOString()
        },
        disclaimer: "This is an AI-generated preliminary verdict. Human fact-checkers will review this claim."
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, JSON.stringify(result), 3600);

      logger.info(`AI fact-check completed for claim: ${claimText.substring(0, 50)}...`);
      return result;

    } catch (error) {
      logger.error('AI fact-check error:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 401) {
        throw new Error('AI service configuration error');
      }
      
      throw new Error('Failed to generate fact-check');
    }
  }

  async analyzeImage(imageUrl, context = '') {
    try {
      if (!imageUrl) {
        throw new Error('Image URL is required');
      }

      const prompt = context 
        ? `Analyze this image in the context of: ${context}`
        : 'Analyze this image and describe what you see. If it relates to elections or claims, provide relevant insights.';

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an image analysis assistant. Describe images accurately and identify any election-related or fact-check relevant content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      const result = {
        success: true,
        analysis: response.choices[0].message.content,
        timestamp: new Date().toISOString()
      };

      logger.info('AI image analysis completed');
      return result;

    } catch (error) {
      logger.error('AI image analysis error:', error);
      throw new Error('Failed to analyze image');
    }
  }

  _extractVerdict(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('verdict: verified') || 
        lowerText.includes('verdict: true') || 
        lowerText.includes('this claim is true') ||
        lowerText.includes('this claim is verified')) {
      return 'verified';
    } else if (lowerText.includes('verdict: false') || 
               lowerText.includes('this claim is false')) {
      return 'false';
    } else if (lowerText.includes('misleading')) {
      return 'misleading';
    } else {
      return 'needs_context';
    }
  }

  _extractConfidence(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('high confidence') || lowerText.includes('confidence: high')) {
      return 'high';
    } else if (lowerText.includes('low confidence') || lowerText.includes('confidence: low')) {
      return 'low';
    }
    
    return 'medium';
  }

  async healthCheck() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "user",
            content: "test"
          }
        ],
        max_tokens: 5,
      });
      
      return response.choices?.length > 0;
    } catch (error) {
      logger.error('AI health check failed:', error);
      return false;
    }
  }
}

module.exports = new PoeAIService();
