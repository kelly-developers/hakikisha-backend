const TrendingTopic = require('../models/TrendingTopic');
const Claim = require('../models/Claim');
const Blog = require('../models/Blog');
const AIService = require('./aiService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class TrendingService {
  async detectTrendingTopics(timeframe = '24 hours', minClaims = 3) {
    try {
      // Get recent claims for analysis
      const recentClaims = await Claim.getRecentForTrendingDetection(timeframe, 1000);
      
      if (recentClaims.length < minClaims) {
        return {
          detected_topics: [],
          message: 'Insufficient claims for trending detection'
        };
      }

      // Use AI to detect trending topics
      const aiAnalysis = await AIService.detectTrendingTopics(recentClaims, timeframe);

      // Save detected topics
      const savedTopics = [];
      for (const topicData of aiAnalysis) {
        const topic = await TrendingTopic.create({
          topic: topicData.topic_name,
          category: topicData.category,
          engagement_score: topicData.engagement_score,
          related_claims: topicData.related_claim_ids,
          detected_at: new Date()
        });
        savedTopics.push(topic);
      }

      logger.info('Trending topics detection completed', {
        timeframe,
        topics_detected: savedTopics.length,
        claims_analyzed: recentClaims.length
      });

      return {
        detected_topics: savedTopics,
        analysis_metadata: {
          timeframe,
          claims_analyzed: recentClaims.length,
          detection_algorithm: 'ai_analysis_v2'
        }
      };

    } catch (error) {
      logger.error('Trending topics detection failed:', error);
      throw error;
    }
  }

  async getCurrentTrending(options = {}) {
    try {
      const {
        category,
        limit = 10,
        timeframe = '24 hours',
        min_engagement = 30
      } = options;

      const trendingTopics = await TrendingTopic.getCurrentTrending({
        category,
        limit,
        timeframe,
        min_engagement
      });

      // Enhance topics with additional data
      const enhancedTopics = await Promise.all(
        trendingTopics.map(topic => this.enhanceTopicData(topic))
      );

      return {
        trending_topics: enhancedTopics,
        timeframe,
        total: enhancedTopics.length,
        generated_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Current trending topics retrieval failed:', error);
      throw error;
    }
  }

  async enhanceTopicData(topic) {
    try {
      // Get related claims details
      const relatedClaims = [];
      for (const claimId of topic.related_claims.slice(0, 5)) { // Limit to 5 claims
        const claim = await Claim.findById(claimId);
        if (claim) {
          relatedClaims.push({
            id: claim.id,
            title: claim.title,
            category: claim.category,
            submission_count: claim.submission_count
          });
        }
      }

      // Get related blogs
      const relatedBlogs = await Blog.findByTrendingTopic(topic.id);

      // Calculate velocity (rate of growth)
      const velocity = await this.calculateTopicVelocity(topic.topic);

      // Determine risk level
      const riskLevel = this.assessRiskLevel(topic);

      return {
        ...topic,
        related_claims: relatedClaims,
        related_blogs: relatedBlogs,
        velocity: velocity,
        risk_level: riskLevel,
        recommended_actions: this.getRecommendedActions(topic, riskLevel)
      };

    } catch (error) {
      logger.error('Topic data enhancement failed:', error);
      return topic; // Return original topic if enhancement fails
    }
  }

  async calculateTopicVelocity(topicName) {
    try {
      const history = await TrendingTopic.getTopicHistory(topicName, 3); // Last 3 days
      if (history.length < 2) return 0;

      const recentScore = history[history.length - 1].avg_engagement;
      const previousScore = history[0].avg_engagement;

      return ((recentScore - previousScore) / previousScore) * 100;

    } catch (error) {
      logger.error('Topic velocity calculation failed:', error);
      return 0;
    }
  }

  assessRiskLevel(topic) {
    let riskLevel = 'low';
    
    // High risk for political topics with high engagement
    if (topic.category === 'politics' && topic.engagement_score > 70) {
      riskLevel = 'high';
    } 
    // Medium risk for health/business topics
    else if (['health', 'business'].includes(topic.category) && topic.engagement_score > 60) {
      riskLevel = 'medium';
    }
    // High risk for any topic with very high engagement
    else if (topic.engagement_score > 85) {
      riskLevel = 'high';
    }

    return riskLevel;
  }

  getRecommendedActions(topic, riskLevel) {
    const actions = {
      high: [
        'Immediate fact-checking required',
        'Consider publishing advisory blog post',
        'Monitor social media mentions',
        'Prepare official statement if needed'
      ],
      medium: [
        'Schedule fact-checking within 24 hours',
        'Monitor topic evolution',
        'Prepare educational content'
      ],
      low: [
        'Regular monitoring sufficient',
        'Include in weekly trend report'
      ]
    };

    return actions[riskLevel] || ['No specific action required'];
  }

  async updateTopicEngagement(topicId, newEngagementScore) {
    try {
      const updatedTopic = await TrendingTopic.updateEngagementScore(topicId, newEngagementScore);
      
      logger.info('Topic engagement score updated', {
        topicId,
        new_score: newEngagementScore
      });

      return updatedTopic;

    } catch (error) {
      logger.error('Topic engagement update failed:', error);
      throw error;
    }
  }

  async generateTrendingReport(timeframe = '7 days', format = 'json') {
    try {
      const report = await this.generateComprehensiveReport(timeframe);

      if (format === 'csv') {
        return this.convertReportToCSV(report);
      }

      return report;

    } catch (error) {
      logger.error('Trending report generation failed:', error);
      throw error;
    }
  }

  async generateComprehensiveReport(timeframe) {
    const [
      trendingTopics,
      categoryAnalysis,
      velocityAnalysis,
      riskAssessment
    ] = await Promise.all([
      this.getCurrentTrending({ timeframe, limit: 20 }),
      this.analyzeCategoryTrends(timeframe),
      this.analyzeVelocityTrends(timeframe),
      this.assessOverallRisk(timeframe)
    ]);

    return {
      report_type: 'trending_analysis',
      timeframe,
      executive_summary: this.generateExecutiveSummary(trendingTopics, riskAssessment),
      trending_topics: trendingTopics.trending_topics,
      category_analysis: categoryAnalysis,
      velocity_analysis: velocityAnalysis,
      risk_assessment: riskAssessment,
      recommendations: this.generateStrategicRecommendations(trendingTopics)
    };
  }

  async analyzeCategoryTrends(timeframe) {
    const trends = await TrendingTopic.getCategoryTrends(null, timeframe);

    return trends.map(trend => ({
      category: trend.category,
      topic_count: trend.topic_count,
      average_engagement: trend.avg_engagement,
      trend_direction: trend.avg_engagement > 50 ? 'rising' : 'stable'
    }));
  }

  async analyzeVelocityTrends(timeframe) {
    const topics = await TrendingTopic.getCurrentTrending({ timeframe, limit: 15 });
    
    const velocityData = await Promise.all(
      topics.map(async topic => ({
        topic: topic.topic,
        velocity: await this.calculateTopicVelocity(topic.topic),
        direction: (await this.calculateTopicVelocity(topic.topic)) > 0 ? 'growing' : 'declining'
      }))
    );

    return velocityData.sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity));
  }

  async assessOverallRisk(timeframe) {
    const topics = await TrendingTopic.getCurrentTrending({ timeframe });
    
    const riskCounts = {
      high: 0,
      medium: 0,
      low: 0
    };

    topics.forEach(topic => {
      const riskLevel = this.assessRiskLevel(topic);
      riskCounts[riskLevel]++;
    });

    const totalTopics = topics.length;
    const overallRisk = riskCounts.high > 0 ? 'high' : 
                       riskCounts.medium > totalTopics * 0.3 ? 'medium' : 'low';

    return {
      overall_risk: overallRisk,
      risk_breakdown: riskCounts,
      high_risk_topics: topics.filter(t => this.assessRiskLevel(t) === 'high').length
    };
  }

  generateExecutiveSummary(trendingTopics, riskAssessment) {
    const totalTopics = trendingTopics.trending_topics.length;
    const highEngagementTopics = trendingTopics.trending_topics.filter(t => t.engagement_score > 70).length;

    return {
      total_trending_topics: totalTopics,
      high_engagement_topics: highEngagementTopics,
      overall_risk_level: riskAssessment.overall_risk,
      key_insights: [
        `${highEngagementTopics} topics with high engagement detected`,
        `Primary categories: ${this.getTopCategories(trendingTopics).join(', ')}`,
        `Risk assessment: ${riskAssessment.overall_risk.toUpperCase()}`
      ]
    };
  }

  getTopCategories(trendingTopics) {
    const categoryCount = {};
    
    trendingTopics.trending_topics.forEach(topic => {
      categoryCount[topic.category] = (categoryCount[topic.category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  generateStrategicRecommendations(trendingTopics) {
    const recommendations = [];

    const highRiskTopics = trendingTopics.trending_topics.filter(t => 
      this.assessRiskLevel(t) === 'high'
    );

    if (highRiskTopics.length > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Immediate fact-checking required',
        topics: highRiskTopics.map(t => t.topic),
        deadline: 'Within 4 hours'
      });
    }

    const politicalTopics = trendingTopics.trending_topics.filter(t => 
      t.category === 'politics' && t.engagement_score > 50
    );

    if (politicalTopics.length > 0) {
      recommendations.push({
        priority: 'medium',
        action: 'Monitor political discourse',
        topics: politicalTopics.map(t => t.topic),
        deadline: 'Ongoing monitoring'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'low',
        action: 'Continue regular monitoring',
        topics: [],
        deadline: 'Standard schedule'
      });
    }

    return recommendations;
  }

  convertReportToCSV(report) {
    const headers = ['Topic', 'Category', 'Engagement Score', 'Risk Level', 'Velocity', 'Trend Direction'];
    const rows = [];

    report.trending_topics.forEach(topic => {
      rows.push([
        topic.topic,
        topic.category,
        topic.engagement_score,
        topic.risk_level,
        topic.velocity,
        topic.velocity > 0 ? 'growing' : 'declining'
      ]);
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  async autoGenerateBlogFromTrending(topicId, template = 'analysis') {
    try {
      const topic = await TrendingTopic.findById(topicId);
      if (!topic) {
        throw new Error('Trending topic not found');
      }

      // Get related claims for blog content
      const relatedClaims = [];
      for (const claimId of topic.related_claims.slice(0, 10)) {
        const claim = await Claim.findById(claimId);
        if (claim) relatedClaims.push(claim);
      }

      if (relatedClaims.length === 0) {
        throw new Error('No related claims found for blog generation');
      }

      // Generate blog content using AI
      const blogContent = await AIService.generateBlogContent(
        topic.topic,
        relatedClaims,
        template
      );

      // Create blog article
      const blog = await Blog.create({
        title: `Trending Analysis: ${topic.topic}`,
        content: blogContent,
        author_id: 'system', // System-generated
        author_type: 'ai',
        category: Constants.BLOG_CATEGORIES.TRENDING_ANALYSIS,
        source_claim_ids: topic.related_claims,
        trending_topic_id: topicId,
        status: 'published'
      });

      // Update topic with blog reference
      await TrendingTopic.update(topicId, {
        ai_generated_blog_id: blog.id
      });

      logger.info('Blog auto-generated from trending topic', {
        topicId,
        blogId: blog.id,
        template
      });

      return blog;

    } catch (error) {
      logger.error('Auto blog generation failed:', error);
      throw error;
    }
  }

  async cleanupOldTrendingData(retentionDays = 30) {
    try {
      const deletedCount = await TrendingTopic.cleanupOldTopics(retentionDays);
      
      logger.info('Old trending data cleaned up', {
        retentionDays,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Trending data cleanup failed:', error);
      throw error;
    }
  }

  async getTopicEvolution(topicName, days = 7) {
    try {
      const history = await TrendingTopic.getTopicHistory(topicName, days);
      
      if (history.length === 0) {
        return { message: 'No historical data found for this topic' };
      }

      const analysis = this.analyzeTopicEvolution(history);

      return {
        topic: topicName,
        history: history,
        analysis: analysis,
        timeframe: `${days} days`
      };

    } catch (error) {
      logger.error('Topic evolution analysis failed:', error);
      throw error;
    }
  }

  analyzeTopicEvolution(history) {
    const scores = history.map(h => h.avg_engagement);
    const peak = Math.max(...scores);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const volatility = this.calculateVolatility(scores);

    return {
      peak_engagement: peak,
      average_engagement: average,
      volatility: volatility,
      trend: scores[scores.length - 1] > scores[0] ? 'growing' : 'declining',
      stability: volatility < 10 ? 'stable' : 'volatile'
    };
  }

  calculateVolatility(scores) {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }
}

module.exports = new TrendingService();