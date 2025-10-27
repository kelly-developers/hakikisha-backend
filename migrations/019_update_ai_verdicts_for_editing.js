const db = require('../src/config/database');

async function up() {
  await db.query(`
    ALTER TABLE hakikisha.ai_verdicts 
    ADD COLUMN IF NOT EXISTS disclaimer TEXT DEFAULT 'This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers.',
    ADD COLUMN IF NOT EXISTS is_edited_by_human BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS edited_by_fact_checker_id UUID REFERENCES hakikisha.users(id),
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
  `);

  await db.query(`
    ALTER TABLE hakikisha.verdicts
    ADD COLUMN IF NOT EXISTS based_on_ai_verdict BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS responsibility VARCHAR(50) DEFAULT 'creco' CHECK (responsibility IN ('ai', 'creco'));
  `);

  console.log('Migration 019: Added AI verdict editing and responsibility tracking fields');
}

async function down() {
  await db.query(`
    ALTER TABLE hakikisha.ai_verdicts 
    DROP COLUMN IF EXISTS disclaimer,
    DROP COLUMN IF EXISTS is_edited_by_human,
    DROP COLUMN IF EXISTS edited_by_fact_checker_id,
    DROP COLUMN IF EXISTS edited_at;
  `);

  await db.query(`
    ALTER TABLE hakikisha.verdicts
    DROP COLUMN IF EXISTS based_on_ai_verdict,
    DROP COLUMN IF EXISTS responsibility;
  `);
}

module.exports = { up, down };
