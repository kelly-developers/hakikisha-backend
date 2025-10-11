const db = require('../src/config/database');

async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_verdicts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
      verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('true', 'false', 'misleading', 'satire', 'needs_context')),
      confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
      explanation TEXT NOT NULL,
      evidence_sources JSONB NOT NULL,
      ai_model_version VARCHAR(50) NOT NULL,
      processing_time INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ai_verdicts_claim_id ON ai_verdicts(claim_id);
    CREATE INDEX IF NOT EXISTS idx_ai_verdicts_verdict ON ai_verdicts(verdict);
  `);
}

async function down() {
  await db.query('DROP TABLE IF EXISTS ai_verdicts CASCADE');
}

module.exports = { up, down };