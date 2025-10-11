const TrendingTopic = require('../models/TrendingTopic');
const Claim = require('../models/Claim');
const Blog = require('../models/Blog');
const AIService = require('../services/aiService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class TrendingController {
  async getTrendingTopics(req, res, next) {
    try {
      const { category, limit = 10, timeframe = '24 hours' } = req.query;

      const trendingTopics = await TrendingTopic.getCurrentTrending({
        category,
        limit: parseInt(limit),
        timeframe
      });

      res.json({
        trending_topics: trendingTopics,
        timeframe,
        total: trendingTopics.length
      });

    } catch (error) {
      logger.error('Get trending topics error:', error);
      next(error);
    }
  }

  async getTrendingTopicDetail(req, res, next) {
    try {
      const { id } = req.params;

      const topic = await TrendingTopic.findById(id);
      if (!topic) {
        return res.status(404).json({ error: Constants.ERROR_MESSAGES.NOT_FOUND });
      }

      // Get related claims
      const relatedClaims = [];
      for (const claimId of topic.related_claims) {
        const claim = await Claim.findById(claimId);
        if (claim) {
          relatedClaims.push(claim);
        }
      }

      // Get related blogs
      const relatedBlogs = await Blog.findByTrendingTopic(id);

      res.json({
        topic,
        related_claims: relatedClaims,
        related_blogs: relatedBlogs,
        analysis: await this.analyzeTopic(topic)
      });

    } catch (error) {
      logger.error('Get trending topic detail error:', error);
      next(error);
    }
  }

  async detectTrendingTopics(req, res, next) {
    try {
      const { timeframe = '24 hours', min_claims = 3 } = req.body;

      // Get recent claims for analysis
      const recentClaims = await Claim.getRecentForTrendingDetection(timeframe, 1000);
      
      if (recentClaims.length < min_claims) {
        return res.json({
          message: 'Insufficient claims for trending detection',
          detected_topics: []
        });
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

      logger.info(`Detected ${savedTopics.length} trending topics`);

      res.json({
        message: 'Trending topics detection completed',
        detected_topics: savedTopics,
        timeframe,
        claims_analyzed: recentClaims.length
      });

    } catch (error) {
      logger.error('Detect trending topics error:', error);
      next(error);
    }
  }

  async updateTrendingScore(req, res, next) {
    try {
      const { id } = req.params;
      const { engagement_score } = req.body;

      const topic = await TrendingTopic.findById(id);
      if (!topic) {
        return res.status(404).json({ error: Constants.ERROR_MESSAGES.NOT_FOUND });
      }

      const updatedTopic = await TrendingTopic.updateEngagementScore(id, engagement_score);

      res.json({
        message: 'Trending score updated successfully',
        topic: updatedTopic
      });

    } catch (error) {
      logger.error('Update trending score error:', error);
      next(error);
    }
  }

  async getTopicHistory(req, res, next) {
    try {
      const { topic_name, days = 7 } = req.query;

      if (!topic_name) {
        return res.status(400).json({ error: 'Topic name is required' });
      }

      const history = await TrendingTopic.getTopicHistory(topic_name, parseInt(days));

      res.json({
        topic: topic_name,
        history,
        analysis: this.analyzeTopicHistory(history)
      });

    } catch (error) {
      logger.error('Get topic history error:', error);
      next(error);
    }
  }

  async getCategoryTrends(req, res, next) {
    try {
      const { category, days = 7 } = req.query;

      const trends = await TrendingTopic.getCategoryTrends(category, parseInt(days));

      res.json({
        category: category || 'all',
        trends,
        timeframe: `${days} days`
      });

    } catch (error) {
      logger.error('Get category trends error:', error);
      next(error);
    }
  }

  async generateTrendingReport(req, res, next) {
    try {
      const { timeframe = '7 days', format = 'json' } = req.query;

      const report = await this.generateComprehensiveReport(timeframe);

      if (format === 'csv') {
        const csvData = this.convertReportToCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=trending-report-${timeframe}.csv`);
        return res.send(csvData);
      }

      res.json({
        report,
        timeframe,
        generated_at: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Generate trending report error:', error);
      next(error);
    }
  }

  async analyzeTopic(topic) {
    // Basic analysis of topic trends
    const analysis = {
      trend_direction: 'stable', // rising, falling, stable
      velocity: 0, // rate of change
      confidence: 0.8,
      predicted_duration: 'short', // short, medium, long
      risk_level: 'low' // low, medium, high
    };

    // Simple analysis based on engagement score and claim count
    if (topic.engagement_score > 80) {
      analysis.trend_direction = 'rising';
      analysis.risk_level = topic.category === 'politics' ? 'high' : 'medium';
    } else if (topic.engagement_score < 30) {
      analysis.trend_direction = 'falling';
      analysis.risk_level = 'low';
    }

    analysis.velocity = topic.engagement_score / 100; // Simplified velocity calculation

    return analysis;
  }

  analyzeTopicHistory(history) {
    if (history.length === 0) {
      return { message: 'Insufficient data for analysis' };
    }

    const scores = history.map(h => h.engagement_score);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    return {
      average_engagement: averageScore,
      peak_engagement: maxScore,
      lowest_engagement: minScore,
      trend: maxScore > scores[scores.length - 1] ? 'declining' : 'growing',
      volatility: (maxScore - minScore) / averageScore
    };
  }

  async generateComprehensiveReport(timeframe) {
    const [
      trendingTopics,
      categoryDistribution,
      velocityAnalysis,
      riskAssessment
    ] = await Promise.all([
      TrendingTopic.getCurrentTrending({ timeframe, limit: 20 }),
      TrendingTopic.getCategoryDistribution(timeframe),
      this.calculateVelocityTrends(timeframe),
      this.assessRiskLevels(timeframe)
    ]);

    return {
      summary: {
        total_topics: trendingTopics.length,
        timeframe,
        generated_at: new Date().toISOString()
      },
      top_topics: trendingTopics.slice(0, 10),
      category_distribution: categoryDistribution,
      velocity_analysis: velocityAnalysis,
      risk_assessment: riskAssessment
    };
  }

  async calculateVelocityTrends(timeframe) {
    // Calculate how quickly topics are growing/declining
    const topics = await TrendingTopic.getVelocityData(timeframe);
    
    return topics.map(topic => ({
      topic: topic.topic,
      velocity: topic.velocity,
      direction: topic.velocity > 0 ? 'growing' : 'declining',
      acceleration: topic.acceleration
    }));
  }

  async assessRiskLevels(timeframe) {
    // Assess risk levels based on topic category and engagement
    const topics = await TrendingTopic.getCurrentTrending({ timeframe });
    
    return topics.map(topic => {
      let riskLevel = 'low';
      
      if (topic.category === 'politics' && topic.engagement_score > 70) {
        riskLevel = 'high';
      } else if (['health', 'business'].includes(topic.category) && topic.engagement_score > 60) {
        riskLevel = 'medium';
      }

      return {
        topic: topic.topic,
        category: topic.category,
        engagement_score: topic.engagement_score,
        risk_level: riskLevel,
        recommended_action: this.getRecommendedAction(riskLevel)
      };
    });
  }

  getRecommendedAction(riskLevel) {
    const actions = {
      high: 'Immediate fact-checking and content moderation required',
      medium: 'Monitor closely and prepare fact-checking resources',
      low: 'Regular monitoring sufficient'
    };

    return actions[riskLevel] || 'No specific action required';
  }

  convertReportToCSV(report) {
    const headers = ['Topic', 'Category', 'Engagement Score', 'Risk Level', 'Velocity', 'Trend Direction'];
    const rows = [];

    report.top_topics.forEach(topic => {
      const riskItem = report.risk_assessment.find(r => r.topic === topic.topic);
      const velocityItem = report.velocity_analysis.find(v => v.topic === topic.topic);

      rows.push([
        topic.topic,
        topic.category,
        topic.engagement_score,
        riskItem?.risk_level || 'unknown',
        velocityItem?.velocity || 0,
        velocityItem?.direction || 'stable'
      ]);
    });

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

module.exports = new TrendingController();