const db = require('../src/config/database');

async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS two_factor_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX idx_2fa_user_id ON two_factor_codes(user_id);
    CREATE INDEX idx_2fa_code ON two_factor_codes(code);
  `);
  console.log('✅ Created two_factor_codes table');
}

async function down() {
  await db.query('DROP TABLE IF EXISTS two_factor_codes CASCADE');
  console.log('✅ Dropped two_factor_codes table');
}

module.exports = { up, down };
