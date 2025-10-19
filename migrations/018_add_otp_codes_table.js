const db = require('../src/config/database');

async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hakikisha.otp_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
      code VARCHAR(6) NOT NULL,
      type VARCHAR(20) NOT NULL DEFAULT '2fa' CHECK (type IN ('2fa', 'password_reset', 'email_verification')),
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX idx_otp_user_id ON hakikisha.otp_codes(user_id);
    CREATE INDEX idx_otp_code ON hakikisha.otp_codes(code);
    CREATE INDEX idx_otp_expires_at ON hakikisha.otp_codes(expires_at);
  `);
  console.log('Created otp_codes table');
}

async function down() {
  await db.query('DROP TABLE IF EXISTS hakikisha.otp_codes CASCADE');
  console.log('Dropped otp_codes table');
}

module.exports = { up, down };
