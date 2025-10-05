import db from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class SearchService {
  static async searchClaims(
    query: string,
    category?: string,
    page: number = 1,
    limit: number = 20,
    userId?: string
  ) {
    let searchQuery = `
      SELECT c.*, u.email as user_email,
             COALESCE(v.verdict, av.verdict) as final_verdict,
             v.explanation as verdict_explanation
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
      WHERE c.status = 'published'
        AND (c.title ILIKE $1 OR c.description ILIKE $1)
    `;

    const params: any[] = [`%${query}%`];
    let paramCount = 2;

    if (category) {
      searchQuery += ` AND c.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    searchQuery += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await db.query(searchQuery, params);

    // Log search
    if (userId) {
      await this.logSearch(userId, query, 'claims', result.rows.length);
    }

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM claims c
      WHERE c.status = 'published'
        AND (c.title ILIKE $1 OR c.description ILIKE $1)
    `;
    const countParams: any[] = [`%${query}%`];

    if (category) {
      countQuery += ` AND c.category = $2`;
      countParams.push(category);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async searchVerdicts(
    query: string,
    page: number = 1,
    limit: number = 20,
    userId?: string
  ) {
    const searchQuery = `
      SELECT v.*, c.title as claim_title, c.description as claim_description,
             u.email as fact_checker_email
      FROM verdicts v
      LEFT JOIN claims c ON v.claim_id = c.id
      LEFT JOIN fact_checkers fc ON v.fact_checker_id = fc.id
      LEFT JOIN users u ON fc.user_id = u.id
      WHERE v.is_final = true
        AND (v.explanation ILIKE $1 OR c.title ILIKE $1 OR c.description ILIKE $1)
      ORDER BY v.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(searchQuery, [
      `%${query}%`,
      limit,
      (page - 1) * limit
    ]);

    // Log search
    if (userId) {
      await this.logSearch(userId, query, 'verdicts', result.rows.length);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM verdicts v
       LEFT JOIN claims c ON v.claim_id = c.id
       WHERE v.is_final = true
         AND (v.explanation ILIKE $1 OR c.title ILIKE $1 OR c.description ILIKE $1)`,
      [`%${query}%`]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async searchBlogs(
    query: string,
    page: number = 1,
    limit: number = 20,
    userId?: string
  ) {
    const searchQuery = `
      SELECT b.*, u.email as author_email
      FROM blogs b
      LEFT JOIN users u ON b.author_id = u.id
      WHERE b.status = 'published'
        AND (b.title ILIKE $1 OR b.content ILIKE $1)
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(searchQuery, [
      `%${query}%`,
      limit,
      (page - 1) * limit
    ]);

    // Log search
    if (userId) {
      await this.logSearch(userId, query, 'blogs', result.rows.length);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM blogs
       WHERE status = 'published'
         AND (title ILIKE $1 OR content ILIKE $1)`,
      [`%${query}%`]
    );

    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async getSearchSuggestions(query: string, limit: number = 5) {
    const result = await db.query(
      `SELECT DISTINCT title
       FROM claims
       WHERE status = 'published'
         AND title ILIKE $1
       ORDER BY submission_count DESC, created_at DESC
       LIMIT $2`,
      [`%${query}%`, limit]
    );

    return result.rows.map(row => row.title);
  }

  private static async logSearch(
    userId: string,
    searchQuery: string,
    searchType: string,
    resultsCount: number
  ) {
    try {
      const id = uuidv4();
      await db.query(
        `INSERT INTO search_logs (id, user_id, search_query, search_type, results_count, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [id, userId, searchQuery, searchType, resultsCount]
      );
    } catch (error) {
      // Log error but don't fail the search
      console.error('Error logging search:', error);
    }
  }
}
