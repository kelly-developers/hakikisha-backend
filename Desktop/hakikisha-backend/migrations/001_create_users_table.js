const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default database first
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function runMigration() {
  let client;
  try {
    client = await pool.connect();
    
    // Create database if it doesn't exist
    await client.query('CREATE DATABASE hakikisha_prod');
    
    console.log('Database created successfully');
  } catch (error) {
    if (error.code !== '42P04') { // Database already exists
      throw error;
    }
  } finally {
    if (client) client.release();
  }

  // Connect to the new database
  const dbPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  const dbClient = await dbPool.connect();

  try {
    // Create users table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'fact_checker', 'admin')),
        profile_picture TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        registration_status VARCHAR(20) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login TIMESTAMP WITH TIME ZONE,
        login_count INTEGER DEFAULT 0
      )
    `);

    // Create claims table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(50) NOT NULL CHECK (category IN ('politics', 'health', 'education', 'technology', 'entertainment', 'sports', 'business', 'other')),
        media_type VARCHAR(20) DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video', 'link')),
        media_url TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ai_processing', 'human_review', 'ai_approved', 'human_approved', 'published', 'rejected')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        similarity_hash VARCHAR(64),
        submission_count INTEGER DEFAULT 1,
        ai_verdict_id UUID,
        human_verdict_id UUID,
        assigned_fact_checker_id UUID,
        is_trending BOOLEAN DEFAULT FALSE,
        trending_score FLOAT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        published_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create indexes for performance
    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
      CREATE INDEX IF NOT EXISTS idx_claims_user_id ON claims(user_id);
      CREATE INDEX IF NOT EXISTS idx_claims_category ON claims(category);
      CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    console.log('Migration completed successfully');
  } finally {
    dbClient.release();
    await dbPool.end();
  }
}

runMigration().catch(console.error);