import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { Claim } from '../types/models';

export class ClaimService {
  static async createClaim(
    userId: string,
    title: string,
    description: string,
    category: string,
    media_type: string,
    media_url?: string
  ) {
    const id = uuidv4();
    
    const result = await db.query(
      `INSERT INTO claims (
        id, user_id, title, description, category, media_type, media_url,
        status, priority, submission_count, is_trending, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'medium', 1, false, NOW())
      RETURNING *`,
      [id, userId, title, description, category, media_type, media_url || null]
    );

    return result.rows[0];
  }

  static async getClaimById(claimId: string) {
    const result = await db.query(
      `SELECT c.*, 
              u.email as user_email,
              v.verdict as verdict_result,
              v.explanation as verdict_explanation,
              v.evidence_sources as verdict_sources,
              v.confidence_score as verdict_confidence,
              v.is_final as verdict_is_final,
              av.verdict as ai_verdict_result,
              av.confidence_score as ai_confidence
       FROM claims c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN verdicts v ON c.human_verdict_id = v.id
       LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
       WHERE c.id = $1`,
      [claimId]
    );

    if (result.rows.length === 0) {
      throw new Error('Claim not found');
    }

    const claim = result.rows[0];
    
    // Format verdict data
    if (claim.verdict_result) {
      claim.verdict = {
        id: claim.human_verdict_id,
        verdict: claim.verdict_result,
        explanation: claim.verdict_explanation,
        evidence_sources: claim.verdict_sources,
        confidence_score: claim.verdict_confidence,
        is_final: claim.verdict_is_final
      };
    }

    // Clean up flat fields
    delete claim.verdict_result;
    delete claim.verdict_explanation;
    delete claim.verdict_sources;
    delete claim.verdict_confidence;
    delete claim.verdict_is_final;
    delete claim.ai_verdict_result;
    delete claim.ai_confidence;

    return claim;
  }

  static async getClaims(filters: any = {}, page: number = 1, limit: number = 20) {
    let query = `
      SELECT c.*, u.email as user_email,
             COALESCE(v.verdict, av.verdict) as final_verdict
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND c.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.category) {
      query += ` AND c.category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.userId) {
      query += ` AND c.user_id = $${paramCount}`;
      params.push(filters.userId);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM claims WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (filters.status) {
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(filters.status);
      countParamIndex++;
    }

    if (filters.category) {
      countQuery += ` AND category = $${countParamIndex}`;
      countParams.push(filters.category);
      countParamIndex++;
    }

    if (filters.userId) {
      countQuery += ` AND user_id = $${countParamIndex}`;
      countParams.push(filters.userId);
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

  static async getTrendingClaims(limit: number = 10) {
    const result = await db.query(
      `SELECT c.*, 
              COALESCE(v.verdict, av.verdict) as final_verdict,
              v.explanation as verdict_explanation,
              v.evidence_sources as verdict_sources
       FROM claims c
       LEFT JOIN verdicts v ON c.human_verdict_id = v.id
       LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
       WHERE c.is_trending = true
       ORDER BY c.trending_score DESC, c.submission_count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows.map(claim => {
      if (claim.final_verdict) {
        claim.verdict = {
          verdict: claim.final_verdict,
          explanation: claim.verdict_explanation,
          evidence_sources: claim.verdict_sources
        };
      }
      delete claim.final_verdict;
      delete claim.verdict_explanation;
      delete claim.verdict_sources;
      return claim;
    });
  }

  static async updateClaimStatus(
    claimId: string,
    status: string,
    factCheckerId?: string
  ) {
    const result = await db.query(
      `UPDATE claims 
       SET status = $1, 
           assigned_fact_checker_id = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, factCheckerId || null, claimId]
    );

    if (result.rows.length === 0) {
      throw new Error('Claim not found');
    }

    return result.rows[0];
  }

  static async searchClaims(
    searchQuery: string,
    category?: string,
    page: number = 1,
    limit: number = 20
  ) {
    let query = `
      SELECT c.*, u.email as user_email,
             COALESCE(v.verdict, av.verdict) as final_verdict
      FROM claims c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN verdicts v ON c.human_verdict_id = v.id
      LEFT JOIN ai_verdicts av ON c.ai_verdict_id = av.id
      WHERE (c.title ILIKE $1 OR c.description ILIKE $1)
    `;

    const params: any[] = [`%${searchQuery}%`];
    let paramCount = 2;

    if (category) {
      query += ` AND c.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, (page - 1) * limit);

    const result = await db.query(query, params);

    // Get total
    let countQuery = `
      SELECT COUNT(*) FROM claims c
      WHERE (c.title ILIKE $1 OR c.description ILIKE $1)
    `;
    const countParams: any[] = [`%${searchQuery}%`];

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
}
