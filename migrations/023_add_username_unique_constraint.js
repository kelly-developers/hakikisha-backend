const db = require('../src/config/database');

async function up() {
  // Add unique constraint to username if it doesn't exist
  await db.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_username_key' 
        AND conrelid = 'hakikisha.users'::regclass
      ) THEN
        ALTER TABLE hakikisha.users ADD CONSTRAINT users_username_key UNIQUE (username);
      END IF;
    END $$;
  `);

  console.log('✅ Username unique constraint added successfully');
}

async function down() {
  await db.query(`
    ALTER TABLE hakikisha.users DROP CONSTRAINT IF EXISTS users_username_key;
  `);
}

module.exports = { up, down };
