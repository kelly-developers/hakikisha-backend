const db = require('../src/config/database');

async function up() {
  try {
    console.log('Adding missing columns to ai_verdicts and verdicts tables...');
    
    // Add columns to ai_verdicts table
    await db.query(`
      ALTER TABLE hakikisha.ai_verdicts
      ADD COLUMN IF NOT EXISTS disclaimer TEXT DEFAULT 'This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers.',
      ADD COLUMN IF NOT EXISTS is_edited_by_human BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS edited_by_fact_checker_id UUID REFERENCES hakikisha.users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE
    `);
    
    console.log('✅ Added disclaimer and editing tracking columns to ai_verdicts table');
    
    // Add responsibility column to verdicts table
    await db.query(`
      ALTER TABLE hakikisha.verdicts
      ADD COLUMN IF NOT EXISTS responsibility VARCHAR(20) DEFAULT 'creco' CHECK (responsibility IN ('creco', 'ai'))
    `);
    
    console.log('✅ Added responsibility column to verdicts table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  await db.query(`
    ALTER TABLE hakikisha.ai_verdicts
    DROP COLUMN IF EXISTS disclaimer,
    DROP COLUMN IF EXISTS is_edited_by_human,
    DROP COLUMN IF EXISTS edited_by_fact_checker_id,
    DROP COLUMN IF EXISTS edited_at
  `);
  
  await db.query(`
    ALTER TABLE hakikisha.verdicts
    DROP COLUMN IF EXISTS responsibility
  `);
}

module.exports = { up, down };
