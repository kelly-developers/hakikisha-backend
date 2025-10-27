const db = require('../src/config/database');

async function up() {
  // Add disclaimer column for AI responsibility messaging
  await db.query(`
    ALTER TABLE hakikisha.ai_verdicts
    ADD COLUMN IF NOT EXISTS disclaimer TEXT DEFAULT 'This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers.',
    ADD COLUMN IF NOT EXISTS is_edited_by_human BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS edited_by_fact_checker_id UUID REFERENCES hakikisha.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE
  `);

  console.log('✅ Added disclaimer and editing tracking columns to ai_verdicts table');
}

async function down() {
  await db.query(`
    ALTER TABLE hakikisha.ai_verdicts
    DROP COLUMN IF EXISTS disclaimer,
    DROP COLUMN IF EXISTS is_edited_by_human,
    DROP COLUMN IF EXISTS edited_by_fact_checker_id,
    DROP COLUMN IF EXISTS edited_at
  `);
}

module.exports = { up, down };
