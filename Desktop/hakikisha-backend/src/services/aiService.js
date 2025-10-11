const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.apiKey = process.env.AI_API_KEY;
    this.apiUrl = process.env.AI_API_URL;
    this.modelVersion = process.env.AI_MODEL_VERSION;
  }

  async processClaimWithAI(claimText) {
    try {
      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: this.modelVersion,
        messages: [
          {
            role: "system",
            content: `You are a fact-checking AI assistant. Analyze claims and provide verdicts with explanations and evidence sources.
            Possible verdicts: true, false, misleading, satire, needs_context.
            Always provide confidence score (0-1) and list credible evidence sources.`
          },
          {
            role: "user",
            content: `Analyze this claim: "${claimText}"
            
            Provide response in JSON format:
            {
              "verdict": "true/false/misleading/satire/needs_context",
              "confidence_score": 0.95,
              "explanation": "Detailed explanation...",
              "sources": ["source1.com", "source2.org"]
            }`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const aiResponse = response.data.choices[0].message.content;
      const result = JSON.parse(aiResponse);

      logger.info(`AI processing completed: ${result.verdict} with confidence ${result.confidence_score}`);

      return result;

    } catch (error) {
      logger.error('AI processing error:', error);
      throw new Error('AI service temporarily unavailable');
    }
  }

  async generateBlogContent(topic, claims, template = 'analysis') {
    try {
      const claimsText = claims.map(c => `- ${c.title}: ${c.description}`).join('\n');

      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: this.modelVersion,
        messages: [
          {
            role: "system",
            content: `You are a content writer for a fact-checking platform. Create engaging, educational blog content based on verified claims.
            Write in a neutral, informative tone. Include factual analysis and debunk misinformation clearly.`
          },
          {
            role: "user",
            content: `Create a blog post about: "${topic}"
            
            Based on these verified claims:
            ${claimsText}
            
            Template: ${template}
            Format: Markdown
            Length: 500-800 words
            Include sections: Introduction, Analysis, Verdict Summary, Conclusion`
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;

    } catch (error) {
      logger.error('AI blog generation error:', error);
      throw new Error('Content generation service temporarily unavailable');
    }
  }

  async detectTrendingTopics(claims, timeframe = '24 hours') {
    try {
      const claimsData = claims.map(c => ({
        title: c.title,
        description: c.description,
        category: c.category,
        submission_count: c.submission_count,
        created_at: c.created_at
      }));

      const response = await axios.post(`${this.apiUrl}/chat/completions`, {
        model: this.modelVersion,
        messages: [
          {
            role: "system",
            content: `Analyze claims data to identify trending topics and misinformation patterns.
            Group similar claims and calculate engagement scores.`
          },
          {
            role: "user",
            content: `Analyze these claims from the last ${timeframe}:
            ${JSON.stringify(claimsData, null, 2)}
            
            Identify trending topics with:
            - Topic name
            - Category
            - Engagement score (1-100)
            - Related claim IDs
            - Key patterns detected`
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return JSON.parse(response.data.choices[0].message.content);

    } catch (error) {
      logger.error('AI trending detection error:', error);
      throw new Error('Trending analysis service temporarily unavailable');
    }
  }
}

module.exports = new AIService();