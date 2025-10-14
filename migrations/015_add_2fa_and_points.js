/**
 * Migration: Add 2FA for admins and points system for users
 */

exports.up = async (db) => {
  // Add 2FA columns to users table
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
    ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[]
  `);

  // Create user_points table
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_points (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_points INTEGER DEFAULT 0,
      current_streak_days INTEGER DEFAULT 0,
      longest_streak_days INTEGER DEFAULT 0,
      last_activity_date DATE,
      points_reset_date DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);

  // Create points_history table for tracking point awards
  await db.query(`
    CREATE TABLE IF NOT EXISTS points_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points_awarded INTEGER NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create index for faster queries
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
  `);

  console.log('✅ Migration 015: Added 2FA and points system');
};

exports.down = async (db) => {
  await db.query(`DROP TABLE IF EXISTS points_history CASCADE`);
  await db.query(`DROP TABLE IF EXISTS user_points CASCADE`);
  await db.query(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS two_factor_enabled,
    DROP COLUMN IF EXISTS two_factor_secret,
    DROP COLUMN IF EXISTS two_factor_backup_codes
  `);
  console.log('✅ Migration 015 rolled back');
};
