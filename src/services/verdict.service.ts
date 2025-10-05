import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';

export class VerdictService {
  static async createVerdict(
    claimId: string,
    factCheckerId: string,
    verdict: string,
    explanation: string,
    evidenceSources: string[],
    confidenceScore?: number
  ) {
    const id = uuidv4();

    const result = await db.query(
      `INSERT INTO verdicts (
        id, claim_id, fact_checker_id, verdict, explanation,
        evidence_sources, confidence_score, is_final, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
      RETURNING *`,
      [id, claimId, factCheckerId, verdict, explanation, evidenceSources, confidenceScore || 85]
    );

    // Update claim with verdict
    await db.query(
      `UPDATE claims 
       SET human_verdict_id = $1, status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [id, claimId]
    );

    return result.rows[0];
  }

  static async getVerdictByClaimId(claimId: string) {
    const result = await db.query(
      `SELECT v.*, u.email as fact_checker_email, fc.rating as fact_checker_rating
       FROM verdicts v
       LEFT JOIN fact_checkers fc ON v.fact_checker_id = fc.id
       LEFT JOIN users u ON fc.user_id = u.id
       WHERE v.claim_id = $1 AND v.is_final = true
       ORDER BY v.created_at DESC
       LIMIT 1`,
      [claimId]
    );

    return result.rows[0] || null;
  }

  static async getVerdictsByFactChecker(
    factCheckerId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const result = await db.query(
      `SELECT v.*, c.title as claim_title, c.category as claim_category
       FROM verdicts v
       LEFT JOIN claims c ON v.claim_id = c.id
       WHERE v.fact_checker_id = $1
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [factCheckerId, limit, (page - 1) * limit]
    );

    const countResult = await db.query(
      'SELECT COUNT(*) FROM verdicts WHERE fact_checker_id = $1',
      [factCheckerId]
    );

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  static async getVerdictStats(factCheckerId: string) {
    const result = await db.query(
      `SELECT 
        COUNT(*) as total_verdicts,
        COUNT(CASE WHEN verdict = 'true' THEN 1 END) as true_count,
        COUNT(CASE WHEN verdict = 'false' THEN 1 END) as false_count,
        COUNT(CASE WHEN verdict = 'misleading' THEN 1 END) as misleading_count,
        COUNT(CASE WHEN verdict = 'unverifiable' THEN 1 END) as unverifiable_count,
        AVG(confidence_score) as avg_confidence
       FROM verdicts
       WHERE fact_checker_id = $1`,
      [factCheckerId]
    );

    return result.rows[0];
  }
}
