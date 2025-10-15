// src/config/database-init.js
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

      // Initialize all tables
      await this.initializeTables();
      
      // Create indexes
      await this.createIndexes();
      
      // Create default admin user
      await this.createDefaultAdmin();
      
      console.log('🎉 Database initialization completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  static async initializeTables() {
    try {
      console.log('📋 Creating database tables...');

      // Create tables in correct order (respecting foreign key dependencies)
      await this.createUsersTable();
      await this.createClaimsTable();
      await this.createAIVerdictsTable();
      await this.createFactCheckersTable();
      await this.createVerdictsTable();
      await this.createBlogArticlesTable();
      await this.createTrendingTopicsTable();
      await this.createNotificationsTable();
      await this.createUserAnalyticsTable();
      await this.createAdminActivitiesTable();
      await this.createFactCheckerActivitiesTable();
      await this.createSearchLogsTable();
      await this.createUserSessionsTable();
      await this.createRegistrationRequestsTable();

      console.log('✅ All tables created successfully!');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
  }

  static async createUsersTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'fact_checker', 'admin')),
        profile_picture TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        login_count INTEGER DEFAULT 0,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Users table created/verified');
  }

  static async createClaimsTable() {
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
        ai_verdict_id UUID,
        human_verdict_id UUID,
        assigned_fact_checker_id UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Claims table created/verified');
  }

  static async createAIVerdictsTable() {
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
  }

  static async createFactCheckersTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.fact_checkers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
        expertise_areas JSONB DEFAULT '[]',
        verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected', 'suspended')),
        rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
        total_reviews INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        joined_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Fact Checkers table created/verified');
  }

  static async createVerdictsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.verdicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
        fact_checker_id UUID NOT NULL REFERENCES hakikisha.fact_checkers(id) ON DELETE CASCADE,
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
  }

  static async createBlogArticlesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.blog_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        author_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
        author_type VARCHAR(50) DEFAULT 'human' CHECK (author_type IN ('human', 'ai')),
        category VARCHAR(100) DEFAULT 'fact_check',
        source_claim_ids JSONB DEFAULT '[]',
        trending_topic_id UUID,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        featured_image TEXT,
        read_time INTEGER DEFAULT 5,
        view_count INTEGER DEFAULT 0,
        published_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Blog Articles table created/verified');
  }

  static async createTrendingTopicsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.trending_topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        topic VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        claim_count INTEGER DEFAULT 0,
        engagement_score DECIMAL(5,2) DEFAULT 0,
        related_claims JSONB DEFAULT '[]',
        ai_generated_blog_id UUID REFERENCES hakikisha.blog_articles(id),
        human_approved_blog_id UUID REFERENCES hakikisha.blog_articles(id),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
        detected_at TIMESTAMP DEFAULT NOW(),
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Trending Topics table created/verified');
  }

  static async createNotificationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        related_entity_type VARCHAR(50),
        related_entity_id UUID,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Notifications table created/verified');
  }

  static async createUserAnalyticsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.user_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES hakikisha.users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ User Analytics table created/verified');
  }

  static async createAdminActivitiesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.admin_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
        activity_type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        target_user_id UUID REFERENCES hakikisha.users(id) ON DELETE SET NULL,
        changes_made JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Admin Activities table created/verified');
  }

  static async createFactCheckerActivitiesTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.fact_checker_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        fact_checker_id UUID NOT NULL REFERENCES hakikisha.fact_checkers(id) ON DELETE CASCADE,
        activity_type VARCHAR(100) NOT NULL,
        claim_id UUID REFERENCES hakikisha.claims(id) ON DELETE SET NULL,
        verdict_id UUID REFERENCES hakikisha.verdicts(id) ON DELETE SET NULL,
        blog_id UUID REFERENCES hakikisha.blog_articles(id) ON DELETE SET NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration INTEGER,
        ip_address INET,
        device_info JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Fact Checker Activities table created/verified');
  }

  static async createSearchLogsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.search_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES hakikisha.users(id) ON DELETE SET NULL,
        query TEXT NOT NULL,
        search_type VARCHAR(50) DEFAULT 'all',
        results_count INTEGER DEFAULT 0,
        search_duration INTEGER DEFAULT 0,
        filters_applied JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Search Logs table created/verified');
  }

  static async createUserSessionsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
        session_token TEXT NOT NULL UNIQUE,
        ip_address INET,
        user_agent TEXT,
        login_time TIMESTAMP DEFAULT NOW(),
        last_activity TIMESTAMP DEFAULT NOW(),
        logout_time TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      )
    `;
    await db.query(query);
    console.log('✅ User Sessions table created/verified');
  }

  static async createRegistrationRequestsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hakikisha.registration_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
        request_type VARCHAR(50) DEFAULT 'user' CHECK (request_type IN ('user', 'fact_checker', 'admin')),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        admin_notes TEXT,
        reviewed_by UUID REFERENCES hakikisha.users(id),
        reviewed_at TIMESTAMP,
        submitted_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await db.query(query);
    console.log('✅ Registration Requests table created/verified');
  }

  // Add indexes for better performance
  static async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_claims_user_id ON hakikisha.claims(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_claims_status ON hakikisha.claims(status)',
      'CREATE INDEX IF NOT EXISTS idx_claims_category ON hakikisha.claims(category)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_claim_id ON hakikisha.ai_verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_claim_id ON hakikisha.verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_fact_checker_id ON hakikisha.verdicts(fact_checker_id)',
      'CREATE INDEX IF NOT EXISTS idx_fact_checkers_user_id ON hakikisha.fact_checkers(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_author_id ON hakikisha.blog_articles(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON hakikisha.blog_articles(status)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON hakikisha.notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON hakikisha.notifications(is_read)',
      'CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON hakikisha.user_analytics(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_analytics_action ON hakikisha.user_analytics(action)',
      'CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON hakikisha.admin_activities(admin_id)',
      'CREATE INDEX IF NOT EXISTS idx_search_logs_user_id ON hakikisha.search_logs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON hakikisha.search_logs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON hakikisha.user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON hakikisha.user_sessions(session_token)',
      'CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON hakikisha.registration_requests(status)'
    ];

    for (const indexQuery of indexes) {
      try {
        await db.query(indexQuery);
      } catch (error) {
        console.log('⚠️ Index might already exist:', error.message);
      }
    }
    console.log('✅ All indexes created/verified');
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

  // Create default admin user - COMPLETE VERSION
  static async createDefaultAdmin() {
    try {
      const adminEmail = 'kellynyachiro@gmail.com';
      const adminPassword = 'Kelly@40125507';
      
      console.log(`👤 Setting up admin user: ${adminEmail}`);
      
      // Check if admin already exists and has password_hash
      const existingAdmin = await db.query(
        'SELECT id, email, password_hash, role FROM hakikisha.users WHERE email = $1',
        [adminEmail]
      );

      if (existingAdmin.rows.length > 0) {
        const admin = existingAdmin.rows[0];
        console.log(`📊 Found existing admin: ${admin.email}, role: ${admin.role}`);
        
        // Check if admin has password_hash set
        if (!admin.password_hash) {
          console.log('🔧 Admin user exists but missing password_hash. Setting it now...');
          
          // Hash password and update the existing admin
          const saltRounds = 12;
          const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
          
          await db.query(
            `UPDATE hakikisha.users 
             SET password_hash = $1, role = 'admin', is_verified = true, updated_at = NOW()
             WHERE email = $2`,
            [passwordHash, adminEmail]
          );
          
          console.log(`✅ Admin password set successfully for: ${adminEmail}`);
          console.log(`🔑 Password: ${adminPassword}`);
        } else {
          console.log('✅ Default admin user already exists with password');
          
          // Ensure the role is set to admin
          if (admin.role !== 'admin') {
            console.log('🔄 Updating user role to admin...');
            await db.query(
              `UPDATE hakikisha.users 
               SET role = 'admin', is_verified = true, updated_at = NOW()
               WHERE email = $1`,
              [adminEmail]
            );
            console.log('✅ User role updated to admin');
          }
        }
        
        return existingAdmin.rows[0];
      } else {
        // Create new admin user
        console.log('👤 Creating new admin user...');
        
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        // Create admin user
        const result = await db.query(
          `INSERT INTO hakikisha.users (email, password_hash, role, is_verified) 
           VALUES ($1, $2, $3, $4) 
           RETURNING id, email, role`,
          [adminEmail, passwordHash, 'admin', true]
        );

        const newAdmin = result.rows[0];
        console.log(`✅ Default admin user created: ${newAdmin.email}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log(`👑 Role: ${newAdmin.role}`);
        
        return newAdmin;
      }
    } catch (error) {
      console.error('❌ Error creating/updating default admin user:', error);
      throw error;
    }
  }

  // Additional utility method to verify database state
  static async verifyDatabaseState() {
    try {
      console.log('🔍 Verifying database state...');
      
      // Check if all tables exist
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'hakikisha' 
        ORDER BY table_name
      `);
      
      console.log(`📊 Found ${tables.rows.length} tables in hakikisha schema`);
      
      // Check if admin user exists and has password
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
      
      return {
        tableCount: tables.rows.length,
        adminExists: adminCheck.rows.length > 0,
        adminHasPassword: adminCheck.rows.length > 0 ? adminCheck.rows[0].has_password : false
      };
    } catch (error) {
      console.error('❌ Error verifying database state:', error);
      throw error;
    }
  }

  // Method to reset and reinitialize database (use with caution)
  static async resetDatabase() {
    try {
      console.log('🔄 Resetting database...');
      
      // Drop all tables in correct order to avoid foreign key constraints
      const tables = [
        'fact_checker_activities',
        'admin_activities',
        'user_analytics',
        'search_logs',
        'user_sessions',
        'registration_requests',
        'notifications',
        'verdicts',
        'fact_checkers',
        'ai_verdicts',
        'blog_articles',
        'trending_topics',
        'claims',
        'users'
      ];
      
      for (const table of tables) {
        try {
          await db.query(`DROP TABLE IF EXISTS hakikisha.${table} CASCADE`);
          console.log(`✅ Dropped table: ${table}`);
        } catch (error) {
          console.log(`⚠️ Could not drop table ${table}:`, error.message);
        }
      }
      
      // Reinitialize
      await this.initializeCompleteDatabase();
      console.log('🎉 Database reset and reinitialized successfully!');
      
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      throw error;
    }
  }
}

module.exports = DatabaseInitializer;