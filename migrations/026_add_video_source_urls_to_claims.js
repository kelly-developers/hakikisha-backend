const db = require('../config/database');

module.exports = {
  async up() {
    try {
      console.log('Adding video_url and source_url columns to claims table...');
      
      // Add video_url column
      await db.query(`
        ALTER TABLE hakikisha.claims 
        ADD COLUMN IF NOT EXISTS video_url TEXT
      `);
      console.log('✅ Added video_url column to claims table');
      
      // Add source_url column
      await db.query(`
        ALTER TABLE hakikisha.claims 
        ADD COLUMN IF NOT EXISTS source_url TEXT
      `);
      console.log('Added source_url column to claims table');
      
      // Create indexes for better performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_claims_video_url ON hakikisha.claims(video_url)
      `);
      console.log('Created index for video_url');
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_claims_source_url ON hakikisha.claims(source_url)
      `);
      console.log('✅ Created index for source_url');
      
    } catch (error) {
      console.error('Error adding video and source URL columns:', error);
      throw error;
    }
  },
  
  async down() {
    try {
      console.log('Removing video_url and source_url columns from claims table...');
      
      // Drop indexes first
      await db.query('DROP INDEX IF EXISTS hakikisha.idx_claims_video_url');
      await db.query('DROP INDEX IF EXISTS hakikisha.idx_claims_source_url');
      
      // Remove columns
      await db.query('ALTER TABLE hakikisha.claims DROP COLUMN IF EXISTS video_url');
      await db.query('ALTER TABLE hakikisha.claims DROP COLUMN IF EXISTS source_url');
      
      console.log('✅ Removed video_url and source_url columns from claims table');
    } catch (error) {
      console.error('Error removing video and source URL columns:', error);
      throw error;
    }
  }
};