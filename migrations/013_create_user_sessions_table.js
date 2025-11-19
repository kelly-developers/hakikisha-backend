const db = require('../src/config/database');

async function up() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS hakikisha.user_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
      session_token VARCHAR(500),
      token VARCHAR(500),
      refresh_token VARCHAR(500),
      ip_address VARCHAR(45),
      user_agent TEXT,
      login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      logout_time TIMESTAMP WITH TIME ZONE,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON hakikisha.user_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON hakikisha.user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON hakikisha.user_sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON hakikisha.user_sessions(is_active);
  `);

  console.log('✅ Created user_sessions table');
}

async function down() {
  await db.query('DROP TABLE IF EXISTS hakikisha.user_sessions CASCADE');
  console.log('✅ Dropped user_sessions table');
}

module.exports = { up, down };
