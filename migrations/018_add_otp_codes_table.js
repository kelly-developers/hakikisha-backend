const db = require('../src/config/database');

async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hakikisha.otp_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
      code VARCHAR(6) NOT NULL,
      purpose VARCHAR(50) NOT NULL,
      is_used BOOLEAN DEFAULT false,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_otp_user_id ON hakikisha.otp_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_otp_code ON hakikisha.otp_codes(code);
    CREATE INDEX IF NOT EXISTS idx_otp_expires ON hakikisha.otp_codes(expires_at);
  `);

  console.log('✅ Created otp_codes table');
}

async function down() {
  await db.query('DROP TABLE IF EXISTS hakikisha.otp_codes CASCADE');
}

module.exports = { up, down };
