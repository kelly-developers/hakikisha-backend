const db = require('./database');
const bcrypt = require('bcryptjs');

class DatabaseInitializer {
  static async initializeCompleteDatabase() {
    try {
      console.log('🗃️ Starting complete database initialization...');
      
      // Check database connection
      const isConnected = await this.checkDatabaseConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to database');
      }

      // Ensure schema exists
      await this.createSchema();
      
      // Initialize essential tables first
      await this.initializeEssentialTables();
      
      // Create indexes
      await this.createIndexes();
      
      // Create default admin user
      await this.createDefaultAdmin();
      
      // Add sample data for testing
      await this.addSampleData();
      
      // Verify everything is working
      await this.verifyDatabaseState();
      
      console.log('🎉 Database initialization completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  static async createSchema() {
    try {
      await db.query('CREATE SCHEMA IF NOT EXISTS hakikisha');
      console.log('✅ Schema created/verified');
    } catch (error) {
      console.log('⚠️ Schema might already exist:', error.message);
    }
  }

  static async initializeEssentialTables() {
    try {
      console.log('📋 Creating essential database tables...');

      // Create tables in correct order with dependencies
      await this.createUsersTable();
      await this.createClaimsTable();
      await this.createAIVerdictsTable();
      await this.createVerdictsTable();
      
      console.log('✅ Essential tables created/verified successfully!');
    } catch (error) {
      console.error('❌ Error creating essential tables:', error);
      throw error;
    }
  }

  static async createUsersTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'fact_checker', 'admin')),
          profile_picture TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          registration_status VARCHAR(50) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
          two_factor_enabled BOOLEAN DEFAULT FALSE,
          two_factor_secret VARCHAR(255),
          login_count INTEGER DEFAULT 0,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('✅ Users table created/verified');
    } catch (error) {
      console.error('❌ Error creating users table:', error);
      throw error;
    }
  }

  static async createClaimsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.claims (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          category VARCHAR(100),
          media_type VARCHAR(50) DEFAULT 'text',
          media_url TEXT,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ai_processing', 'human_review', 'resolved', 'rejected')),
          priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          submission_count INTEGER DEFAULT 1,
          is_trending BOOLEAN DEFAULT FALSE,
          trending_score DECIMAL(5,2) DEFAULT 0,
          ai_verdict_id UUID,
          human_verdict_id UUID,
          assigned_fact_checker_id UUID,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      
      // Add trending columns if they don't exist
      await this.addColumnIfNotExists('hakikisha.claims', 'is_trending', 'BOOLEAN DEFAULT FALSE');
      await this.addColumnIfNotExists('hakikisha.claims', 'trending_score', 'DECIMAL(5,2) DEFAULT 0');
      
      console.log('✅ Claims table created/verified');
    } catch (error) {
      console.error('❌ Error creating claims table:', error);
      throw error;
    }
  }

  static async createAIVerdictsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.ai_verdicts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
          verdict VARCHAR(50) CHECK (verdict IN ('true', 'false', 'misleading', 'unverifiable')),
          confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
          explanation TEXT,
          evidence_sources JSONB,
          ai_model_version VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('✅ AI Verdicts table created/verified');
    } catch (error) {
      console.error('❌ Error creating AI verdicts table:', error);
      throw error;
    }
  }

  static async createVerdictsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.verdicts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
          fact_checker_id UUID REFERENCES hakikisha.users(id),
          verdict VARCHAR(50) NOT NULL CHECK (verdict IN ('true', 'false', 'misleading', 'unverifiable')),
          explanation TEXT NOT NULL,
          evidence_sources JSONB,
          ai_verdict_id UUID REFERENCES hakikisha.ai_verdicts(id),
          approval_status VARCHAR(50) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
          review_notes TEXT,
          time_spent INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('✅ Verdicts table created/verified');
    } catch (error) {
      console.error('❌ Error creating verdicts table:', error);
      throw error;
    }
  }

  static async createIndexes() {
    const essentialIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_claims_user_id ON hakikisha.claims(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_claims_status ON hakikisha.claims(status)',
      'CREATE INDEX IF NOT EXISTS idx_claims_category ON hakikisha.claims(category)',
      'CREATE INDEX IF NOT EXISTS idx_claims_trending ON hakikisha.claims(is_trending)',
      'CREATE INDEX IF NOT EXISTS idx_claims_trending_score ON hakikisha.claims(trending_score)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_claim_id ON hakikisha.ai_verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_claim_id ON hakikisha.verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON hakikisha.users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON hakikisha.users(role)'
    ];

    for (const indexQuery of essentialIndexes) {
      try {
        await db.query(indexQuery);
        console.log(`✅ Created index: ${indexQuery.split(' ')[3]}`);
      } catch (error) {
        console.log(`⚠️ Index might already exist: ${error.message}`);
      }
    }
    console.log('✅ All essential indexes created/verified');
  }

  static async addColumnIfNotExists(table, column, definition) {
    try {
      const tableName = table.replace('hakikisha.', '');
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' 
        AND table_name = $1 
        AND column_name = $2
      `;
      
      const result = await db.query(checkQuery, [tableName, column]);
      
      if (result.rows.length === 0) {
        const alterQuery = `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`;
        await db.query(alterQuery);
        console.log(`✅ Added missing column: ${table}.${column}`);
      }
    } catch (error) {
      console.log(`⚠️ Could not add column ${column} to ${table}:`, error.message);
    }
  }

  static async checkDatabaseConnection() {
    try {
      await db.query('SELECT 1');
      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      return false;
    }
  }

  static async createDefaultAdmin() {
    try {
      const adminEmail = 'kellynyachiro@gmail.com';
      const adminPassword = 'Kelly@40125507';
      
      console.log('Setting up admin user: ' + adminEmail);
      
      // Check if admin already exists
      const existingAdmin = await db.query(
        'SELECT id, email, password_hash, role, registration_status FROM hakikisha.users WHERE email = $1',
        [adminEmail]
      );

      if (existingAdmin.rows.length > 0) {
        const admin = existingAdmin.rows[0];
        console.log('Found existing admin: ' + admin.email + ', role: ' + admin.role + ', status: ' + admin.registration_status);
        
        // Ensure admin is approved and verified
        if (admin.registration_status !== 'approved' || !admin.password_hash) {
          console.log('Fixing admin user status and password...');
          
          const saltRounds = 12;
          const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
          
          await db.query(
            `UPDATE hakikisha.users 
             SET password_hash = $1, 
                 registration_status = 'approved', 
                 is_verified = true, 
                 role = 'admin',
                 updated_at = NOW()
             WHERE email = $2`,
            [passwordHash, adminEmail]
          );
          
          console.log('Admin user fixed and password set');
        } else {
          console.log('Default admin user already exists with correct settings');
        }
        
        return existingAdmin.rows[0];
      } else {
        // Create new admin user
        console.log('Creating new admin user...');
        
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        const result = await db.query(
          `INSERT INTO hakikisha.users (email, password_hash, role, is_verified, registration_status) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id, email, role, registration_status`,
          [adminEmail, passwordHash, 'admin', true, 'approved']
        );

        const newAdmin = result.rows[0];
        
        console.log('Default admin user created: ' + newAdmin.email);
        console.log('Role: ' + newAdmin.role);
        console.log('Status: ' + newAdmin.registration_status);
        
        return newAdmin;
      }
    } catch (error) {
      console.error('Error creating/updating default admin user:', error);
      throw error;
    }
  }

  static async addSampleData() {
    try {
      console.log('📝 Adding sample data...');
      
      // Add some sample claims if no claims exist
      const claimCount = await db.query('SELECT COUNT(*) FROM hakikisha.claims');
      if (parseInt(claimCount.rows[0].count) === 0) {
        console.log('Adding sample claims...');
        
        // Get admin user ID
        const admin = await db.query('SELECT id FROM hakikisha.users WHERE email = $1', ['kellynyachiro@gmail.com']);
        
        if (admin.rows.length > 0) {
          const sampleClaims = [
            {
              title: 'Community Development Initiative Launched',
              description: 'A new community development program has been launched to improve local infrastructure and services.',
              category: 'Governance',
              status: 'resolved',
              is_trending: true,
              trending_score: 85.5,
              submission_count: 15
            },
            {
              title: 'Civic Engagement Program Success',
              description: 'Recent civic engagement initiatives have shown significant increase in community participation.',
              category: 'Civic Processes', 
              status: 'resolved',
              is_trending: true,
              trending_score: 72.3,
              submission_count: 12
            },
            {
              title: 'Public Health Awareness Campaign',
              description: 'New public health campaign focuses on preventive care and community wellness.',
              category: 'Health',
              status: 'human_review',
              is_trending: false,
              trending_score: 45.0,
              submission_count: 8
            },
            {
              title: 'Education Reform Proposal',
              description: 'Proposed education reforms aim to improve curriculum and teacher training.',
              category: 'Education',
              status: 'pending',
              is_trending: false,
              trending_score: 30.2,
              submission_count: 5
            }
          ];
          
          for (const claim of sampleClaims) {
            await db.query(
              `INSERT INTO hakikisha.claims 
               (user_id, title, description, category, status, is_trending, trending_score, submission_count, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [admin.rows[0].id, claim.title, claim.description, claim.category, claim.status, claim.is_trending, claim.trending_score, claim.submission_count]
            );
          }
          
          console.log('✅ Sample claims added');
        }
      }
      
    } catch (error) {
      console.log('⚠️ Could not add sample data:', error.message);
    }
  }

  static async verifyDatabaseState() {
    try {
      console.log('🔍 Verifying database state...');
      
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'hakikisha' 
        ORDER BY table_name
      `);
      
      console.log(`📊 Found ${tables.rows.length} tables in hakikisha schema`);
      
      // Check each essential table
      const essentialTables = ['users', 'claims', 'ai_verdicts', 'verdicts'];
      for (const tableName of essentialTables) {
        try {
          const count = await db.query(`SELECT COUNT(*) FROM hakikisha.${tableName}`);
          console.log(`📋 ${tableName}: ${count.rows[0].count} records`);
        } catch (error) {
          console.log(`❌ ${tableName}: Table not accessible - ${error.message}`);
        }
      }

      // Verify admin user
      const adminCheck = await db.query(
        'SELECT email, role, password_hash IS NOT NULL as has_password FROM hakikisha.users WHERE email = $1',
        ['kellynyachiro@gmail.com']
      );
      
      if (adminCheck.rows.length > 0) {
        const admin = adminCheck.rows[0];
        console.log(`👤 Admin status: ${admin.email}, role: ${admin.role}, has_password: ${admin.has_password}`);
      } else {
        console.log('❌ Admin user not found');
      }

      // Check trending claims
      const trendingClaims = await db.query(
        'SELECT COUNT(*) as count FROM hakikisha.claims WHERE is_trending = true'
      );
      console.log(`🔥 Trending claims: ${trendingClaims.rows[0].count}`);
      
      return {
        tableCount: tables.rows.length,
        adminExists: adminCheck.rows.length > 0,
        adminHasPassword: adminCheck.rows.length > 0 ? adminCheck.rows[0].has_password : false,
        trendingClaimsCount: parseInt(trendingClaims.rows[0].count)
      };
    } catch (error) {
      console.error('❌ Error verifying database state:', error);
      throw error;
    }
  }

  static async resetDatabase() {
    try {
      console.log('🔄 Resetting database...');
      
      const tables = [
        'verdicts',
        'ai_verdicts', 
        'claims',
        'users'
      ];
      
      for (const table of tables) {
        try {
          await db.query(`DROP TABLE IF EXISTS hakikisha.${table} CASCADE`);
          console.log(`Dropped table: ${table}`);
        } catch (error) {
          console.log(`Could not drop table ${table}:`, error.message);
        }
      }
      
      await this.initializeCompleteDatabase();
      console.log('✅ Database reset and reinitialized successfully!');
      
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }
}

module.exports = DatabaseInitializer;