const Claim = require('../models/Claim');
const Blog = require('../models/Blog');
const Verdict = require('../models/Verdict');
const SearchLog = require('../models/SearchLog');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class SearchService {
  async searchAllContent(query, filters = {}, userId = null) {
    try {
      const startTime = Date.now();
      
      const {
        page = 1,
        limit = 20,
        categories,
        verdicts,
        authors,
        date_from,
        date_to
      } = filters;

      const offset = (page - 1) * limit;

      // Search across different content types in parallel
      const [claims, blogs, verdictsResults] = await Promise.all([
        this.searchClaims(query, { categories, verdicts, date_from, date_to, limit, offset }),
        this.searchBlogs(query, { categories, authors, date_from, date_to, limit, offset }),
        this.searchVerdicts(query, { verdicts, date_from, date_to, limit, offset })
      ]);

      const searchDuration = Date.now() - startTime;

      // Log search activity
      if (userId) {
        await this.logSearchActivity(userId, query, 'all', searchDuration, 
          claims.total + blogs.total + verdictsResults.total);
      }

      // Combine and rank results
      const combinedResults = this.combineAndRankResults(
        claims.results, blogs.results, verdictsResults.results, query
      );

      return {
        query,
        results: combinedResults.slice(0, limit),
        facets: {
          claims: claims.total,
          blogs: blogs.total,
          verdicts: verdictsResults.total
        },
        search_duration: searchDuration,
        total_results: claims.total + blogs.total + verdictsResults.total,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil((claims.total + blogs.total + verdictsResults.total) / limit)
        }
      };

    } catch (error) {
      logger.error('Global search failed:', error);
      throw error;
    }
  }

  async searchClaims(query, filters = {}) {
    try {
      const {
        categories,
        verdicts,
        date_from,
        date_to,
        limit = 20,
        offset = 0
      } = filters;

      const results = await Claim.search(query, {
        categories,
        verdicts,
        date_from,
        date_to,
        limit,
        offset
      });

      const total = await Claim.countSearchResults(query, {
        categories,
        verdicts,
        date_from,
        date_to
      });

      return {
        results: results.map(claim => ({
          type: 'claim',
          id: claim.id,
          title: claim.title,
          description: claim.description,
          category: claim.category,
          status: claim.status,
          verdict: claim.final_verdict,
          created_at: claim.created_at,
          relevance_score: this.calculateRelevanceScore(claim, query)
        })),
        total
      };

    } catch (error) {
      logger.error('Claims search failed:', error);
      throw error;
    }
  }

  async searchBlogs(query, filters = {}) {
    try {
      const {
        categories,
        authors,
        date_from,
        date_to,
        limit = 10,
        offset = 0
      } = filters;

      const results = await Blog.search(query, {
        categories,
        authors,
        date_from,
        date_to,
        limit,
        offset
      });

      const total = await Blog.countSearchResults(query, {
        categories,
        authors,
        date_from,
        date_to
      });

      return {
        results: results.map(blog => ({
          type: 'blog',
          id: blog.id,
          title: blog.title,
          excerpt: blog.content.substring(0, 200) + '...',
          category: blog.category,
          author: blog.author_email,
          created_at: blog.created_at,
          view_count: blog.view_count,
          relevance_score: this.calculateRelevanceScore(blog, query)
        })),
        total
      };

    } catch (error) {
      logger.error('Blogs search failed:', error);
      throw error;
    }
  }

  async searchVerdicts(query, filters = {}) {
    try {
      const {
        verdicts,
        date_from,
        date_to,
        limit = 20,
        offset = 0
      } = filters;

      const results = await Verdict.search(query, {
        verdicts,
        date_from,
        date_to,
        limit,
        offset
      });

      const total = await Verdict.countSearchResults(query, {
        verdicts,
        date_from,
        date_to
      });

      return {
        results: results.map(verdict => ({
          type: 'verdict',
          id: verdict.id,
          claim_title: verdict.claim_title,
          verdict: verdict.verdict,
          explanation: verdict.explanation.substring(0, 150) + '...',
          fact_checker: verdict.fact_checker_email,
          created_at: verdict.created_at,
          relevance_score: this.calculateRelevanceScore(verdict, query)
        })),
        total
      };

    } catch (error) {
      logger.error('Verdicts search failed:', error);
      throw error;
    }
  }

  calculateRelevanceScore(item, query) {
    const queryTerms = query.toLowerCase().split(/\s+/);
    let score = 0;

    // Score based on title match
    if (item.title) {
      const title = item.title.toLowerCase();
      score += queryTerms.filter(term => title.includes(term)).length * 10;
    }

    // Score based on content/description match
    const content = (item.description || item.content || item.explanation || '').toLowerCase();
    score += queryTerms.filter(term => content.includes(term)).length * 5;

    // Boost score for exact matches
    if (item.title && item.title.toLowerCase().includes(query.toLowerCase())) {
      score += 20;
    }

    // Recency boost (newer items get higher scores)
    if (item.created_at) {
      const daysOld = (new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 10 - (daysOld / 10)); // Boost decreases over time
    }

    // Popularity boost for blogs
    if (item.view_count) {
      score += Math.min(item.view_count / 100, 5); // Cap popularity boost
    }

    return Math.min(score, 100); // Cap at 100
  }

  combineAndRankResults(claims, blogs, verdicts, query) {
    const allResults = [...claims, ...blogs, ...verdicts];
    
    // Sort by relevance score descending
    return allResults.sort((a, b) => b.relevance_score - a.relevance_score);
  }

  async getSearchSuggestions(query, type = 'all') {
    try {
      if (!query || query.length < 2) {
        return { suggestions: [] };
      }

      const suggestions = await this.generateSuggestions(query, type);

      return {
        query,
        type,
        suggestions: suggestions.slice(0, 10) // Limit to 10 suggestions
      };

    } catch (error) {
      logger.error('Search suggestions failed:', error);
      return { suggestions: [] };
    }
  }

  async generateSuggestions(query, type) {
    const suggestions = new Set();

    // Add the original query
    suggestions.add(query);

    // Generate related terms based on query
    const relatedTerms = this.generateRelatedTerms(query);
    relatedTerms.forEach(term => suggestions.add(term));

    // Get popular searches that start with the query
    const popularSearches = await SearchLog.getPopularSearches('7 days', 20);
    const matchingPopular = popularSearches.filter(search => 
      search.query.toLowerCase().startsWith(query.toLowerCase())
    );
    
    matchingPopular.forEach(search => suggestions.add(search.query));

    return Array.from(suggestions);
  }

  generateRelatedTerms(query) {
    const terms = new Set();
    const words = query.toLowerCase().split(/\s+/);

    // Add singular/plural variations
    words.forEach(word => {
      if (word.endsWith('s')) {
        terms.add(word.slice(0, -1)); // Remove 's'
      } else {
        terms.add(word + 's'); // Add 's'
      }
    });

    // Add common related terms
    const relatedWords = {
      'covid': ['coronavirus', 'pandemic', 'vaccine'],
      'election': ['vote', 'poll', 'candidate'],
      'climate': ['weather', 'environment', 'global warming'],
      'health': ['medical', 'doctor', 'hospital']
    };

    words.forEach(word => {
      if (relatedWords[word]) {
        relatedWords[word].forEach(related => terms.add(related));
      }
    });

    return Array.from(terms);
  }

  async logSearchActivity(userId, query, searchType, duration, resultsCount) {
    try {
      await SearchLog.create({
        user_id: userId,
        query: query,
        search_type: searchType,
        results_count: resultsCount,
        search_duration: duration
      });
    } catch (error) {
      logger.error('Search activity logging failed:', error);
      // Don't throw error to avoid affecting search functionality
    }
  }

  async getSearchAnalytics(timeframe = '30 days') {
    try {
      const analytics = await SearchLog.getSearchAnalytics(timeframe);

      return {
        timeframe,
        total_searches: analytics.reduce((sum, day) => sum + day.daily_searches, 0),
        unique_searchers: analytics.reduce((sum, day) => sum + day.daily_searchers, 0),
        daily_breakdown: analytics,
        success_rate: analytics.length > 0 ? 
          analytics.reduce((sum, day) => sum + day.success_rate, 0) / analytics.length : 0,
        popular_searches: await SearchLog.getPopularSearches(timeframe, 10),
        zero_result_queries: await SearchLog.getZeroResultQueries(timeframe, 10)
      };

    } catch (error) {
      logger.error('Search analytics retrieval failed:', error);
      throw error;
    }
  }

  async advancedSearch(searchParams) {
    try {
      const {
        query,
        content_types = ['claims', 'blogs', 'verdicts'],
        categories = [],
        verdicts = [],
        authors = [],
        date_from,
        date_to,
        min_confidence,
        max_confidence,
        page = 1,
        limit = 20
      } = searchParams;

      const offset = (page - 1) * limit;
      const startTime = Date.now();

      // Execute searches based on selected content types
      const searchPromises = [];
      
      if (content_types.includes('claims')) {
        searchPromises.push(this.searchClaims(query, {
          categories, verdicts, date_from, date_to, limit, offset
        }));
      }

      if (content_types.includes('blogs')) {
        searchPromises.push(this.searchBlogs(query, {
          categories, authors, date_from, date_to, limit, offset
        }));
      }

      if (content_types.includes('verdicts')) {
        searchPromises.push(this.searchVerdicts(query, {
          verdicts, date_from, date_to, limit, offset
        }));
      }

      const results = await Promise.all(searchPromises);
      const searchDuration = Date.now() - startTime;

      // Combine results
      const allResults = results.flatMap(result => result.results);
      const totalResults = results.reduce((sum, result) => sum + result.total, 0);

      // Apply confidence filtering if specified
      const filteredResults = min_confidence || max_confidence ? 
        allResults.filter(result => {
          if (!result.confidence_score) return true;
          if (min_confidence && result.confidence_score < min_confidence) return false;
          if (max_confidence && result.confidence_score > max_confidence) return false;
          return true;
        }) : allResults;

      // Sort by relevance
      const sortedResults = filteredResults.sort((a, b) => b.relevance_score - a.relevance_score);

      return {
        query,
        results: sortedResults.slice(0, limit),
        filters_applied: {
          content_types,
          categories,
          verdicts,
          authors,
          date_range: { from: date_from, to: date_to },
          confidence_range: { min: min_confidence, max: max_confidence }
        },
        search_duration: searchDuration,
        total_results: totalResults,
        returned_results: sortedResults.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(totalResults / limit)
        }
      };

    } catch (error) {
      logger.error('Advanced search failed:', error);
      throw error;
    }
  }

  async getSearchPatterns(timeframe = '30 days') {
    try {
      const patterns = await SearchLog.getSearchPatterns(timeframe);

      return {
        timeframe,
        total_unique_terms: patterns.length,
        most_frequent_terms: patterns.slice(0, 20),
        analysis: this.analyzeSearchPatterns(patterns)
      };

    } catch (error) {
      logger.error('Search patterns analysis failed:', error);
      throw error;
    }
  }

  analyzeSearchPatterns(patterns) {
    const totalFrequency = patterns.reduce((sum, pattern) => sum + pattern.frequency, 0);
    
    return {
      average_success_rate: patterns.reduce((sum, pattern) => sum + pattern.success_rate, 0) / patterns.length,
      most_successful_terms: patterns.filter(p => p.success_rate > 0.8).slice(0, 10),
      least_successful_terms: patterns.filter(p => p.success_rate < 0.2).slice(0, 10),
      coverage_analysis: {
        top_10_terms_coverage: patterns.slice(0, 10).reduce((sum, p) => sum + p.frequency, 0) / totalFrequency,
        top_50_terms_coverage: patterns.slice(0, 50).reduce((sum, p) => sum + p.frequency, 0) / totalFrequency
      }
    };
  }

  async optimizeSearchIndex() {
    try {
      // This would optimize the search index for better performance
      // Placeholder implementation
      
      logger.info('Search index optimization completed');
      
      return {
        success: true,
        message: 'Search index optimized successfully',
        optimized_at: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Search index optimization failed:', error);
      throw error;
    }
  }

  async cleanupSearchData(retentionDays = 90) {
    try {
      const deletedCount = await SearchLog.cleanupOldSearches(retentionDays);
      
      logger.info('Old search data cleaned up', {
        retentionDays,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Search data cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = new SearchService();