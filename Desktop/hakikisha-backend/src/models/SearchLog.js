const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class SearchLog {
  static async create(searchData) {
    const {
      user_id,
      query,
      search_type = 'all',
      results_count = 0,
      search_duration = 0,
      filters_applied = {},
      ip_address,
      user_agent
    } = searchData;

    const id = uuidv4();
    const queryStr = `
      INSERT INTO search_logs (id, user_id, query, search_type, results_count, search_duration, filters_applied, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `;

    try {
      const result = await db.query(queryStr, [
        id, user_id, query, search_type, results_count, search_duration,
        JSON.stringify(filters_applied), ip_address, user_agent
      ]);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating search log:', error);
      throw error;
    }
  }

  static async getUserSearchHistory(userId, limit = 20, offset = 0) {
    const query = `
      SELECT 
        query,
        search_type,
        results_count,
        search_duration,
        created_at
      FROM search_logs 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await db.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting user search history:', error);
      throw error;
    }
  }

  static async getPopularSearches(timeframe = '7 days', limit = 10) {
    const query = `
      SELECT 
        query,
        search_type,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results,
        AVG(search_duration) as avg_duration
      FROM search_logs 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY query, search_type
      ORDER BY search_count DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting popular searches:', error);
      throw error;
    }
  }

  static async getSearchAnalytics(timeframe = '30 days') {
    const query = `
      SELECT 
        -- Daily search volume
        DATE(created_at) as date,
        COUNT(*) as daily_searches,
        COUNT(DISTINCT user_id) as daily_searchers,
        
        -- Search type distribution
        COUNT(CASE WHEN search_type = 'claims' THEN 1 END) as claim_searches,
        COUNT(CASE WHEN search_type = 'blogs' THEN 1 END) as blog_searches,
        COUNT(CASE WHEN search_type = 'verdicts' THEN 1 END) as verdict_searches,
        COUNT(CASE WHEN search_type = 'all' THEN 1 END) as all_searches,
        
        -- Performance metrics
        AVG(results_count) as avg_results,
        AVG(search_duration) as avg_duration_ms,
        
        -- Success rate (searches with results)
        ROUND(100.0 * COUNT(CASE WHEN results_count > 0 THEN 1 END) / COUNT(*), 2) as success_rate
        
      FROM search_logs 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting search analytics:', error);
      throw error;
    }
  }

  static async getZeroResultQueries(timeframe = '7 days', limit = 20) {
    const query = `
      SELECT 
        query,
        search_type,
        COUNT(*) as occurrence_count,
        MAX(created_at) as last_searched
      FROM search_logs 
      WHERE created_at >= NOW() - INTERVAL '${timeframe}'
        AND results_count = 0
      GROUP BY query, search_type
      ORDER BY occurrence_count DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting zero result queries:', error);
      throw error;
    }
  }

  static async getSearchPatterns(timeframe = '30 days') {
    const query = `
      WITH search_terms AS (
        SELECT 
          UNNEST(REGEXP_SPLIT_TO_ARRAY(LOWER(query), '\\s+')) as term,
          results_count
        FROM search_logs 
        WHERE created_at >= NOW() - INTERVAL '${timeframe}'
          AND query IS NOT NULL
      )
      SELECT 
        term,
        COUNT(*) as frequency,
        AVG(CASE WHEN results_count > 0 THEN 1.0 ELSE 0.0 END) as success_rate
      FROM search_terms 
      WHERE LENGTH(term) > 2  -- Ignore short words
      GROUP BY term
      HAVING COUNT(*) > 5  -- Only consider terms searched multiple times
      ORDER BY frequency DESC
      LIMIT 50
    `;

    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Error getting search patterns:', error);
      throw error;
    }
  }

  static async clearUserSearchHistory(userId) {
    const query = `
      DELETE FROM search_logs 
      WHERE user_id = $1
      RETURNING COUNT(*) as deleted_count
    `;

    try {
      const result = await db.query(query, [userId]);
      return parseInt(result.rows[0].deleted_count);
    } catch (error) {
      logger.error('Error clearing user search history:', error);
      throw error;
    }
  }

  static async cleanupOldSearches(retentionDays = 90) {
    const query = `
      DELETE FROM search_logs 
      WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
    `;

    try {
      const result = await db.query(query);
      logger.info(`Cleaned up ${result.rowCount} old search records`);
      return result.rowCount;
    } catch (error) {
      logger.error('Error cleaning up old searches:', error);
      throw error;
    }
  }
}

module.exports = SearchLog;