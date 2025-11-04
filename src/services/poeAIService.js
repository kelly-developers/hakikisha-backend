const { OpenAI } = require('openai');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');

class PoeAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.POE_API_KEY || "d2IBtbb7YWvhGHO1PrBlqMvY25UWC3zg77pNlyOvEBQ",
      baseURL: "https://api.poe.com/v1",
    });
    this.model = "Web-Search";
    this.systemPrompt = `You are Hakikisha AI, a comprehensive web search and research assistant specializing in:

POLITICS:
- Government policies and political systems
- Political parties, leaders, and governance
- Political analysis and commentary
- International relations and diplomacy
- Public administration and policy making

CONSTITUTION AND LAW:
- Constitutional law and amendments
- Legal frameworks and jurisprudence
- Legislative processes and bills
- Human rights and civil liberties
- Judicial systems and court rulings

ELECTIONS:
- Electoral processes and systems
- Voting procedures and voter education
- Election monitoring and observation
- Campaign finance and regulations
- Election results and analysis

CIVIC SPACE:
- Civil society organizations
- Public participation and engagement
- Freedom of assembly and association
- Civic education and awareness
- Community development initiatives

GRAPEVINE:
- Public discourse and rumors
- Social media trends and conversations
- Informal information networks
- Public sentiment and opinion
- Community chatter and discussions

Provide accurate, comprehensive, and well-researched information from web sources. Always maintain objectivity and cite relevant information sources when possible.`;
    this.disclaimer = "\n\n⚠️ This response is AI-generated and based on web search results. Please verify important information with official sources.";
  }

  async webSearch(query, searchContext = {}, hasAttachments = false, attachmentTypes = []) {
    try {
      if (!query || query.trim() === '') {
        throw new Error('Search query is required');
      }

      // Check cache first
      const cacheKey = `ai:websearch:${JSON.stringify({ query, searchContext, hasAttachments, attachmentTypes })}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Web search cache hit');
        return JSON.parse(cached);
      }

      // Enhance query with context and attachment information
      let enhancedQuery = query;
      
      // Add context if provided
      if (Object.keys(searchContext).length > 0) {
        const contextStr = Object.entries(searchContext)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        enhancedQuery = `Context: ${contextStr}\n\nSearch Query: ${query}`;
      }

      // Add attachment context
      if (hasAttachments && attachmentTypes.length > 0) {
        const types = attachmentTypes.join(', ');
        enhancedQuery = `[User attached ${types}]\n\n${enhancedQuery}`;
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
            content: `Please perform a comprehensive web search and provide detailed information about: ${enhancedQuery}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1200,
      });

      const responseText = response.choices[0].message.content;
      const result = {
        success: true,
        query: query,
        response: responseText + this.disclaimer,
        model: this.model,
        timestamp: new Date().toISOString(),
        context: searchContext
      };

      // Cache for 10 minutes (shorter cache for web search)
      await cacheService.set(cacheKey, JSON.stringify(result), 600);
      
      logger.info('Web search completed successfully');
      return result;

    } catch (error) {
      logger.error('Web search error:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 401) {
        throw new Error('AI service configuration error');
      }
      
      throw new Error('Web search service temporarily unavailable');
    }
  }

  async researchTopic(topic, category = 'general', depth = 'comprehensive') {
    try {
      if (!topic || topic.trim() === '') {
        throw new Error('Research topic is required');
      }

      // Check cache
      const cacheKey = `ai:research:${JSON.stringify({ topic, category, depth })}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Research cache hit');
        return JSON.parse(cached);
      }

      const researchPrompt = `
Perform a detailed web research on the following topic:

TOPIC: "${topic}"
CATEGORY: ${category}
DEPTH: ${depth}

Please provide:
1. Comprehensive overview and key facts
2. Recent developments and current status
3. Key stakeholders and involved parties
4. Relevant legal/policy frameworks (if applicable)
5. Public discourse and opinions
6. Potential implications or future developments
7. Recommended sources for further reading

Structure your response clearly with appropriate sections.
`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a professional research assistant. Conduct thorough web research and provide well-structured, comprehensive information on various topics."
          },
          {
            role: "user",
            content: researchPrompt
          }
        ],
        temperature: 0.6,
        max_tokens: 1500,
      });

      const responseText = response.choices[0].message.content;

      const result = {
        success: true,
        topic: topic,
        category: category,
        research: responseText,
        depth: depth,
        timestamp: new Date().toISOString(),
        disclaimer: "This research is AI-generated based on web sources. Verify critical information with primary sources."
      };

      // Cache for 30 minutes
      await cacheService.set(cacheKey, JSON.stringify(result), 1800);

      logger.info(`Research completed for topic: ${topic.substring(0, 50)}...`);
      return result;

    } catch (error) {
      logger.error('Research error:', error);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 401) {
        throw new Error('AI service configuration error');
      }
      
      throw new Error('Failed to conduct research');
    }
  }

  async analyzePublicDiscourse(text, sourceType = 'general') {
    try {
      if (!text || text.trim() === '') {
        throw new Error('Text content is required for analysis');
      }

      const cacheKey = `ai:discourse:${JSON.stringify({ text: text.substring(0, 100), sourceType })}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Discourse analysis cache hit');
        return JSON.parse(cached);
      }

      const analysisPrompt = `
Analyze this text from public discourse:

TEXT: "${text}"
SOURCE TYPE: ${sourceType}

Provide analysis covering:
1. Main themes and topics discussed
2. Sentiment and tone analysis
3. Key claims or assertions made
4. Context and background information
5. Potential biases or perspectives
6. Relevance to current events or issues
7. Suggested fact-checking points if needed

Focus on understanding the discourse within the broader context of public conversation.
`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a discourse analysis assistant. Analyze public conversations, social media content, and various forms of public communication to identify patterns, themes, and insights."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1000,
      });

      const responseText = response.choices[0].message.content;

      const result = {
        success: true,
        analysis: responseText,
        sourceType: sourceType,
        timestamp: new Date().toISOString(),
        disclaimer: "This analysis is AI-generated and should be considered as preliminary insights."
      };

      // Cache for 15 minutes
      await cacheService.set(cacheKey, JSON.stringify(result), 900);

      logger.info('Public discourse analysis completed');
      return result;

    } catch (error) {
      logger.error('Discourse analysis error:', error);
      throw new Error('Failed to analyze public discourse');
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
Using web search capabilities, analyze this claim and provide a fact-check verdict:

Claim: "${claimText}"
Category: ${category}
Source: ${sourceLink || 'Not provided'}

Provide:
1. Verdict (verified/false/misleading/needs_context/unverified)
2. Detailed explanation with evidence from web sources
3. Confidence level (high/medium/low)
4. Relevant context and background
5. Suggested reliable sources to verify this claim

Format your response clearly and professionally based on comprehensive web research.
`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are a professional fact-checker using web search capabilities. Analyze claims objectively and provide evidence-based verdicts using current information from the web."
          },
          {
            role: "user",
            content: factCheckPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 1200,
      });

      const responseText = response.choices[0].message.content;
      const verdict = this._extractVerdict(responseText);

      const result = {
        success: true,
        aiVerdict: {
          verdict: verdict,
          explanation: responseText,
          confidence: this._extractConfidence(responseText),
          timestamp: new Date().toISOString(),
          category: category
        },
        disclaimer: "This is an AI-generated preliminary verdict based on web search. Human verification is recommended for critical claims."
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
        ? `Analyze this image in the context of: ${context}. Consider relevance to politics, law, elections, civic space, or public discourse.`
        : 'Analyze this image and describe what you see. If it relates to politics, law, elections, civic space, or public discourse, provide relevant insights.';

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "You are an image analysis assistant with web search capabilities. Describe images accurately and identify any content relevant to politics, law, elections, civic space, or public discourse."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 600,
      });

      const result = {
        success: true,
        analysis: response.choices[0].message.content,
        context: context,
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
        lowerText.includes('this claim is verified') ||
        lowerText.includes('accurate')) {
      return 'verified';
    } else if (lowerText.includes('verdict: false') || 
               lowerText.includes('this claim is false') ||
               lowerText.includes('inaccurate')) {
      return 'false';
    } else if (lowerText.includes('misleading') ||
               lowerText.includes('partially true') ||
               lowerText.includes('out of context')) {
      return 'misleading';
    } else if (lowerText.includes('unverified') ||
               lowerText.includes('cannot verify') ||
               lowerText.includes('insufficient evidence')) {
      return 'unverified';
    } else {
      return 'needs_context';
    }
  }

  _extractConfidence(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('high confidence') || 
        lowerText.includes('confidence: high') ||
        lowerText.includes('strong evidence')) {
      return 'high';
    } else if (lowerText.includes('low confidence') || 
               lowerText.includes('confidence: low') ||
               lowerText.includes('limited evidence')) {
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