const db = require('../src/config/database');

async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hakikisha.verdict_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
      response TEXT NOT NULL,
      response_type VARCHAR(50) CHECK (response_type IN ('agree', 'disagree', 'question', 'comment')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_verdict_responses_claim_id ON hakikisha.verdict_responses(claim_id);
    CREATE INDEX IF NOT EXISTS idx_verdict_responses_user_id ON hakikisha.verdict_responses(user_id);
    CREATE INDEX IF NOT EXISTS idx_verdict_responses_created_at ON hakikisha.verdict_responses(created_at DESC);
  `);

  console.log('✅ Verdict responses table created successfully');
}

async function down() {
  await db.query('DROP TABLE IF EXISTS hakikisha.verdict_responses CASCADE');
}

module.exports = { up, down };
