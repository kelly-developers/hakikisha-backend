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
    this.systemPrompt = "You are Hakikisha AI, fact-checking assistant for Kenya. Provide accurate, helpful information about politics, constitution and law Civic space Grapevine, voting, and claims. Always be professional and unbiased.";
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

      // ✅ FIXED: Improved prompt for structured responses
      const factCheckPrompt = `
ANALYZE THIS CLAIM AND PROVIDE A STRUCTURED FACT-CHECK RESPONSE:

CLAIM: "${claimText}"
CATEGORY: ${category}
${sourceLink ? `SOURCE: ${sourceLink}` : 'SOURCE: Not provided'}

YOU MUST RESPOND IN THIS EXACT FORMAT:

VERDICT: [true/false/misleading/needs_context]
CONFIDENCE: [high/medium/low]
EXPLANATION: [Detailed explanation of your analysis, evidence found, and reasoning. Be specific about why the claim is true, false, misleading, or needs context.]
SOURCES: [List any relevant sources or evidence found. If no sources, state "No specific sources found."]

IMPORTANT GUIDELINES:
- Be DECISIVE: If evidence strongly suggests the claim is false, use "false"
- Only use "needs_context" when genuinely uncertain due to lack of information
- Use "misleading" for claims that contain some truth but are presented deceptively
- Provide specific evidence and reasoning for your verdict
- If you find strong evidence against the claim, be clear about it
- Avoid vague language - be specific about what makes the claim true or false

Start your response with "VERDICT:" exactly as shown above.
`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: `You are a professional fact-checker. Analyze claims objectively and provide evidence-based verdicts.
            
            VERDICT DEFINITIONS:
            - "true": Claim is accurate and supported by evidence
            - "false": Claim is factually incorrect or contradicted by evidence  
            - "misleading": Claim contains truth but is presented in misleading way
            - "needs_context": Cannot determine without additional context
            
            Be decisive and specific in your analysis.`
          },
          {
            role: "user",
            content: factCheckPrompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent responses
        max_tokens: 1200,
      });

      const responseText = response.choices[0].message.content;
      console.log('AI Raw Response:', responseText);
      
      // ✅ FIXED: Use enhanced verdict extraction
      const { verdict, confidence, explanation, sources } = this._parseStructuredResponse(responseText);
      
      const result = {
        success: true,
        aiVerdict: {
          verdict: verdict,
          explanation: explanation,
          confidence: confidence,
          sources: sources,
          timestamp: new Date().toISOString()
        },
        disclaimer: "This is an AI-generated preliminary verdict. Human fact-checkers will review this claim."
      };

      // Cache for 1 hour
      await cacheService.set(cacheKey, JSON.stringify(result), 3600);

      logger.info(`AI fact-check completed for claim: ${claimText.substring(0, 50)}... - Verdict: ${verdict}`);
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

  // ✅ NEW: Enhanced structured response parsing
  _parseStructuredResponse(text) {
    console.log('Parsing structured AI response...');
    
    const lines = text.split('\n').filter(line => line.trim());
    
    let verdict = 'needs_context';
    let confidence = 'medium';
    let explanation = '';
    let sources = [];
    
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      const lowerLine = trimmedLine.toLowerCase();
      
      // Detect section headers
      if (lowerLine.startsWith('verdict:')) {
        currentSection = 'verdict';
        const verdictMatch = trimmedLine.match(/verdict:\s*(true|false|misleading|needs_context)/i);
        if (verdictMatch) {
          verdict = verdictMatch[1].toLowerCase();
          console.log(`✅ Extracted verdict: ${verdict}`);
        }
        continue;
      } else if (lowerLine.startsWith('confidence:')) {
        currentSection = 'confidence';
        const confidenceMatch = trimmedLine.match(/confidence:\s*(high|medium|low)/i);
        if (confidenceMatch) {
          confidence = confidenceMatch[1].toLowerCase();
          console.log(`✅ Extracted confidence: ${confidence}`);
        }
        continue;
      } else if (lowerLine.startsWith('explanation:')) {
        currentSection = 'explanation';
        explanation = trimmedLine.replace(/explanation:\s*/i, '').trim();
        continue;
      } else if (lowerLine.startsWith('sources:')) {
        currentSection = 'sources';
        const sourceText = trimmedLine.replace(/sources:\s*/i, '').trim();
        if (sourceText) {
          sources = this._parseSources(sourceText);
        }
        continue;
      }

      // Add content to current section
      if (currentSection === 'explanation' && trimmedLine) {
        explanation += (explanation ? ' ' : '') + trimmedLine;
      } else if (currentSection === 'sources' && trimmedLine) {
        sources = [...sources, ...this._parseSources(trimmedLine)];
      }
    }

    // ✅ FIXED: Enhanced fallback verdict detection if structured parsing fails
    if (verdict === 'needs_context') {
      console.log('🔄 Falling back to enhanced verdict detection...');
      const fallbackVerdict = this._enhancedVerdictDetection(text);
      if (fallbackVerdict !== 'needs_context') {
        verdict = fallbackVerdict;
        console.log(`✅ Fallback detected verdict: ${verdict}`);
      }
    }

    // Ensure we have at least some explanation
    if (!explanation.trim()) {
      explanation = "The AI analyzed this claim but did not provide a detailed explanation.";
    }

    return {
      verdict,
      confidence,
      explanation: explanation.trim(),
      sources: sources.filter(s => s.trim())
    };
  }

  // ✅ NEW: Parse sources from text
  _parseSources(sourceText) {
    if (!sourceText || sourceText.toLowerCase().includes('no specific sources')) {
      return [];
    }
    
    // Split by common delimiters
    const sources = sourceText.split(/[,•\-*]|\d+\./).map(s => s.trim()).filter(s => s);
    
    // If no clear delimiters found, return the whole text as one source
    if (sources.length === 0 && sourceText.trim()) {
      return [sourceText.trim()];
    }
    
    return sources;
  }

  // ✅ NEW: Enhanced verdict detection with comprehensive keyword matching
  _enhancedVerdictDetection(text) {
    const lowerText = text.toLowerCase();
    
    console.log('Running enhanced verdict detection...');
    
    // STRONG FALSE INDICATORS (HIGHEST PRIORITY)
    const strongFalseIndicators = [
      'false', 'incorrect', 'not true', 'inaccurate', 'untrue', 'wrong',
      'debunk', 'disproven', 'misinformation', 'no evidence', 'lack of evidence',
      'contradict', 'refut', 'fabricat', 'hoax', 'myth', 'baseless', 'no support',
      'false claim', 'is false', 'was false', 'are false', 'proven false',
      'inaccurate claim', 'unsubstantiated', 'no basis', 'factually incorrect'
    ];

    // STRONG TRUE INDICATORS
    const strongTrueIndicators = [
      'true', 'correct', 'accurate', 'verified', 'valid', 'supported by evidence',
      'evidence confirms', 'consistent with', 'accurate portrayal', 'factual',
      'is true', 'was true', 'are true', 'confirmed true', 'accurate claim',
      'well-supported', 'evidence supports', 'corroborated'
    ];

    // MISLEADING INDICATORS
    const misleadingIndicators = [
      'misleading', 'exaggerat', 'distort', 'partial', 'out of context',
      'oversimplif', 'misrepresent', 'half-truth', 'cherry-pick', 'deceptive',
      'taken out of context', 'missing context', 'spin', 'biased presentation'
    ];

    // Check for strong false indicators first
    for (const indicator of strongFalseIndicators) {
      if (lowerText.includes(indicator)) {
        console.log(`✅ Enhanced detection: FALSE with "${indicator}"`);
        return 'false';
      }
    }

    // Check for strong true indicators
    for (const indicator of strongTrueIndicators) {
      if (lowerText.includes(indicator)) {
        console.log(`✅ Enhanced detection: TRUE with "${indicator}"`);
        return 'true';
      }
    }

    // Check for misleading indicators
    for (const indicator of misleadingIndicators) {
      if (lowerText.includes(indicator)) {
        console.log(`✅ Enhanced detection: MISLEADING with "${indicator}"`);
        return 'misleading';
      }
    }

    // Sentiment analysis fallback
    const negativeWords = ['not', 'no', 'never', 'nothing', 'without', 'lack', 'false', 'incorrect', 'wrong'];
    const positiveWords = ['yes', 'confirm', 'support', 'valid', 'true', 'accurate', 'correct', 'verified'];
    
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;

    if (negativeCount > positiveCount + 2) {
      console.log(`🔄 Sentiment analysis: FALSE (negative: ${negativeCount}, positive: ${positiveCount})`);
      return 'false';
    } else if (positiveCount > negativeCount + 2) {
      console.log(`🔄 Sentiment analysis: TRUE (negative: ${negativeCount}, positive: ${positiveCount})`);
      return 'true';
    }

    console.log('❓ Enhanced detection: No clear verdict found');
    return 'needs_context';
  }

  // ✅ UPDATED: Legacy method for backward compatibility
  _extractVerdict(text) {
    console.log('Using legacy verdict extraction...');
    const result = this._enhancedVerdictDetection(text);
    console.log(`Legacy extraction result: ${result}`);
    return result;
  }

  // ✅ UPDATED: Legacy confidence extraction
  _extractConfidence(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('high confidence') || 
        lowerText.includes('confidence: high') ||
        lowerText.includes('very confident') ||
        lowerText.includes('strong evidence')) {
      return 'high';
    } else if (lowerText.includes('low confidence') || 
               lowerText.includes('confidence: low') ||
               lowerText.includes('uncertain') ||
               lowerText.includes('limited evidence')) {
      return 'low';
    }
    
    return 'medium';
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