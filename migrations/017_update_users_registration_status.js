const db = require('../src/config/database');

async function up() {
  await db.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS registration_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (registration_status IN ('pending', 'approved', 'rejected'));

    -- Approve existing users
    UPDATE users SET registration_status = 'approved' WHERE registration_status IS NULL;
  `);
  console.log('✅ Added registration_status to users table');
}

async function down() {
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS registration_status');
  console.log('✅ Removed registration_status from users table');
}

module.exports = { up, down };
