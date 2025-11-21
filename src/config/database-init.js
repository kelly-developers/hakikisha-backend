const db = require('./database');
const bcrypt = require('bcryptjs');

class DatabaseInitializer {
  static async initializeCompleteDatabase() {
    try {
      console.log('Starting complete database initialization...');
      
      const isConnected = await this.checkDatabaseConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to database');
      }

      await this.createSchema();
      await this.initializeEssentialTables();
      await this.createIndexes();
      await this.createDefaultAdmin();
      await this.verifyDatabaseState();
      
      console.log('Database initialization completed successfully!');
      return true;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  static async createSchema() {
    try {
      await db.query('CREATE SCHEMA IF NOT EXISTS hakikisha');
      console.log('Schema created/verified');
    } catch (error) {
      console.log('ℹSchema might already exist:', error.message);
    }
  }

  static async initializeEssentialTables() {
    try {
      console.log('Creating essential database tables...');

      // Create tables in correct order to handle dependencies
      await this.createUsersTable();
      await this.createUserSessionsTable();
      await this.createPointsTables();
      await this.createBlogTables();
      await this.createAdminTables();
      await this.createClaimsTable();
      await this.createAIVerdictsTable();
      await this.createVerdictsTable();
      await this.createFactCheckerActivitiesTable();
      await this.createNotificationSettingsTable();
      await this.createNotificationsTable();
      await this.createOTPCodesTable();
      
      console.log('Essential tables created/verified successfully!');
    } catch (error) {
      console.error('Error creating essential tables:', error);
      throw error;
    }
  }

  static async createUserSessionsTable() {
    try {
      const query = `
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
        )
      `;
      await db.query(query);
      console.log('✅ User sessions table created/verified');

      // Create indexes for user_sessions table
      await this.createUserSessionsIndexes();
      
    } catch (error) {
      console.error('Error creating user sessions table:', error);
      throw error;
    }
  }

  static async createUserSessionsIndexes() {
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON hakikisha.user_sessions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON hakikisha.user_sessions(token)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON hakikisha.user_sessions(refresh_token)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON hakikisha.user_sessions(expires_at)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON hakikisha.user_sessions(is_active)',
        'CREATE INDEX IF NOT EXISTS idx_user_sessions_last_accessed ON hakikisha.user_sessions(last_accessed)'
      ];

      for (const indexQuery of indexes) {
        try {
          await db.query(indexQuery);
        } catch (error) {
          console.log(`ℹUser sessions index might already exist: ${error.message}`);
        }
      }
      console.log('All user sessions indexes created/verified');
    } catch (error) {
      console.error(' Error creating user sessions indexes:', error);
    }
  }

  static async createOTPCodesTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.otp_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
          code VARCHAR(10) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('email_verification', '2fa', 'password_reset')),
          purpose VARCHAR(50),
          used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('OTP codes table created/verified');

      // Add the purpose column if it doesn't exist (for existing tables)
      try {
        await db.query(`
          ALTER TABLE hakikisha.otp_codes 
          ADD COLUMN IF NOT EXISTS purpose VARCHAR(50)
        `);
        console.log('✅ Purpose column added/verified in otp_codes table');
      } catch (error) {
        console.log('ℹ Purpose column might already exist:', error.message);
      }

      // Create indexes for OTP codes table
      await this.createOTPCodesIndexes();
      
    } catch (error) {
      console.error('Error creating OTP codes table:', error);
      throw error;
    }
  }

  static async createOTPCodesIndexes() {
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON hakikisha.otp_codes(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_type ON hakikisha.otp_codes(type)',
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON hakikisha.otp_codes(purpose)',
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON hakikisha.otp_codes(expires_at)',
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_code ON hakikisha.otp_codes(code)',
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON hakikisha.otp_codes(used)',
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_user_type ON hakikisha.otp_codes(user_id, type, used)',
        'CREATE INDEX IF NOT EXISTS idx_otp_codes_user_purpose ON hakikisha.otp_codes(user_id, purpose, used)'
      ];

      for (const indexQuery of indexes) {
        try {
          await db.query(indexQuery);
        } catch (error) {
          console.log(`ℹOTP index might already exist: ${error.message}`);
        }
      }
      console.log('All OTP codes indexes created/verified');
    } catch (error) {
      console.error(' Error creating OTP codes indexes:', error);
    }
  }

  static async createNotificationsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
          type VARCHAR(100) NOT NULL,
          title VARCHAR(500) NOT NULL,
          message TEXT NOT NULL,
          related_entity_type VARCHAR(100),
          related_entity_id UUID,
          is_read BOOLEAN DEFAULT FALSE,
          is_sent BOOLEAN DEFAULT FALSE,
          sent_at TIMESTAMP WITH TIME ZONE,
          read_at TIMESTAMP WITH TIME ZONE,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('Notifications table created/verified');

      await this.createNotificationsIndexes();
      
    } catch (error) {
      console.error('Error creating notifications table:', error);
      throw error;
    }
  }

  static async createNotificationsIndexes() {
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON hakikisha.notifications(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_type ON hakikisha.notifications(type)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON hakikisha.notifications(is_read)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON hakikisha.notifications(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON hakikisha.notifications(related_entity_type, related_entity_id)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON hakikisha.notifications(user_id, is_read, created_at)'
      ];

      for (const indexQuery of indexes) {
        try {
          await db.query(indexQuery);
        } catch (error) {
          console.log(`Notification index might already exist: ${error.message}`);
        }
      }
      console.log('All notification indexes created/verified');
    } catch (error) {
      console.error('Error creating notification indexes:', error);
    }
  }

  static async createPointsTables() {
    try {
      console.log('Creating points system tables...');

      const userPointsQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.user_points (
          user_id UUID PRIMARY KEY REFERENCES hakikisha.users(id) ON DELETE CASCADE,
          total_points INTEGER DEFAULT 0,
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          last_activity_date TIMESTAMP WITH TIME ZONE,
          points_reset_date DATE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(userPointsQuery);
      console.log('User points table created/verified');

      const pointsHistoryQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.points_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES hakikisha.users(id) ON DELETE CASCADE,
          points INTEGER NOT NULL,
          activity_type VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(pointsHistoryQuery);
      console.log('Points history table created/verified');

    } catch (error) {
      console.error('Error creating points tables:', error);
      throw error;
    }
  }

  static async createUsersTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          phone VARCHAR(50),
          role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'fact_checker', 'admin')),
          profile_picture TEXT,
          is_verified BOOLEAN DEFAULT FALSE,
          registration_status VARCHAR(50) DEFAULT 'pending' CHECK (registration_status IN ('pending', 'approved', 'rejected')),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
          two_factor_enabled BOOLEAN DEFAULT FALSE,
          two_factor_secret VARCHAR(255),
          login_count INTEGER DEFAULT 0,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('Users table created/verified');
    } catch (error) {
      console.error('Error creating users table:', error);
      throw error;
    }
  }

  static async createNotificationSettingsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.user_notification_settings (
          user_id UUID PRIMARY KEY REFERENCES hakikisha.users(id) ON DELETE CASCADE,
          last_read_verdict TIMESTAMP WITH TIME ZONE DEFAULT '1970-01-01'::timestamp,
          email_notifications BOOLEAN DEFAULT TRUE,
          push_notifications BOOLEAN DEFAULT TRUE,
          verdict_notifications BOOLEAN DEFAULT TRUE,
          system_notifications BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('User notification settings table created/verified');

      await this.initializeNotificationSettings();
      
    } catch (error) {
      console.error('Error creating notification settings table:', error);
      throw error;
    }
  }

  static async initializeNotificationSettings() {
    try {
      console.log('Initializing notification settings for existing users...');
      
      const users = await db.query('SELECT id FROM hakikisha.users');
      
      for (const user of users.rows) {
        await db.query(`
          INSERT INTO hakikisha.user_notification_settings (user_id)
          VALUES ($1)
          ON CONFLICT (user_id) DO NOTHING
        `, [user.id]);
      }

      console.log(`Notification settings initialized for ${users.rows.length} users`);
    } catch (error) {
      console.error('Error initializing notification settings:', error);
    }
  }

  static async createBlogTables() {
    try {
      console.log('Creating blog tables...');

      const blogCategoriesQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.blog_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          color VARCHAR(7) DEFAULT '#0A864D',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(blogCategoriesQuery);
      console.log('Blog categories table created/verified');

      const blogArticlesQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.blog_articles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(500) NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          author_id UUID NOT NULL REFERENCES hakikisha.users(id),
          author_type VARCHAR(50) DEFAULT 'human' CHECK (author_type IN ('human', 'ai')),
          category VARCHAR(100) DEFAULT 'fact_check',
          featured_image TEXT,
          read_time INTEGER DEFAULT 5,
          view_count INTEGER DEFAULT 0,
          like_count INTEGER DEFAULT 0,
          share_count INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'pending_review')),
          source_claim_ids JSONB DEFAULT '[]',
          trending_topic_id UUID,
          meta_title VARCHAR(500),
          meta_description TEXT,
          slug VARCHAR(500) UNIQUE,
          published_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(blogArticlesQuery);
      console.log('Blog articles table created/verified');

      const blogCommentsQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.blog_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          blog_id UUID NOT NULL REFERENCES hakikisha.blog_articles(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES hakikisha.users(id),
          parent_comment_id UUID REFERENCES hakikisha.blog_comments(id),
          content TEXT NOT NULL,
          likes INTEGER DEFAULT 0,
          status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(blogCommentsQuery);
      console.log('Blog comments table created/verified');

      const blogLikesQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.blog_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          blog_id UUID NOT NULL REFERENCES hakikisha.blog_articles(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES hakikisha.users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(blog_id, user_id)
        )
      `;
      await db.query(blogLikesQuery);
      console.log('✅ Blog likes table created/verified');

    } catch (error) {
      console.error('❌ Error creating blog tables:', error);
      throw error;
    }
  }

  static async createAdminTables() {
    try {
      console.log('Creating admin tables...');

      const adminActivitiesQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.admin_activities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          admin_id UUID NOT NULL REFERENCES hakikisha.users(id),
          activity_type VARCHAR(100) NOT NULL,
          description TEXT NOT NULL,
          target_user_id UUID REFERENCES hakikisha.users(id),
          changes_made JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(adminActivitiesQuery);
      console.log('✅ Admin activities table created/verified');

      const registrationRequestsQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.registration_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES hakikisha.users(id),
          request_type VARCHAR(50) DEFAULT 'user',
          status VARCHAR(50) DEFAULT 'pending',
          admin_notes TEXT,
          reviewed_by UUID REFERENCES hakikisha.users(id),
          reviewed_at TIMESTAMP,
          submitted_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(registrationRequestsQuery);
      console.log('✅ Registration requests table created/verified');

      const factCheckersQuery = `
        CREATE TABLE IF NOT EXISTS hakikisha.fact_checkers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE REFERENCES hakikisha.users(id),
          credentials TEXT,
          areas_of_expertise JSONB,
          verification_status VARCHAR(50) DEFAULT 'pending',
          is_active BOOLEAN DEFAULT TRUE,
          suspension_reason TEXT,
          suspended_at TIMESTAMP,
          is_featured BOOLEAN DEFAULT FALSE,
          promoted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(factCheckersQuery);
      console.log('✅ Fact checkers table created/verified');

      await this.ensureFactCheckersColumns();
      await this.ensureAdminActivitiesColumns();
      
    } catch (error) {
      console.error('❌ Error creating admin tables:', error);
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
          video_url TEXT,
          source_url TEXT,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ai_processing', 'human_review', 'resolved', 'rejected', 'human_approved', 'ai_approved', 'completed', 'ai_processing_failed')),
          priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          submission_count INTEGER DEFAULT 1,
          is_trending BOOLEAN DEFAULT FALSE,
          trending_score DECIMAL(5,2) DEFAULT 0,
          ai_verdict_id UUID,
          human_verdict_id UUID,
          assigned_fact_checker_id UUID REFERENCES hakikisha.users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      
      await this.createPublicSchemaClaimsTable();
      
      console.log('✅ Claims table created/verified');
    } catch (error) {
      console.error('❌ Error creating claims table:', error);
      throw error;
    }
  }

  static async createPublicSchemaClaimsTable() {
    try {
      // Try to create a view first
      const viewQuery = `
        CREATE OR REPLACE VIEW public.claims AS 
        SELECT * FROM hakikisha.claims
      `;
      await db.query(viewQuery);
      console.log('✅ Public schema claims view created');
    } catch (error) {
      console.log('ℹ️ Could not create public schema view:', error.message);
    }
  }

  static async createAIVerdictsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.ai_verdicts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
          verdict VARCHAR(50) CHECK (verdict IN ('true', 'false', 'misleading', 'needs_context', 'unverifiable')),
          confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
          explanation TEXT,
          evidence_sources JSONB,
          ai_model_version VARCHAR(100),
          disclaimer TEXT DEFAULT 'This is an AI-generated response. CRECO is not responsible for any implications. Please verify with fact-checkers.',
          is_edited_by_human BOOLEAN DEFAULT false,
          edited_by_fact_checker_id UUID REFERENCES hakikisha.users(id) ON DELETE SET NULL,
          edited_at TIMESTAMP WITH TIME ZONE,
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
          verdict VARCHAR(50) NOT NULL CHECK (verdict IN ('true', 'false', 'misleading', 'needs_context', 'unverifiable')),
          explanation TEXT NOT NULL,
          evidence_sources JSONB,
          ai_verdict_id UUID REFERENCES hakikisha.ai_verdicts(id),
          based_on_ai_verdict BOOLEAN DEFAULT false,
          is_final BOOLEAN DEFAULT TRUE,
          approval_status VARCHAR(50) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
          review_notes TEXT,
          time_spent INTEGER DEFAULT 0,
          responsibility VARCHAR(20) DEFAULT 'creco' CHECK (responsibility IN ('creco', 'ai')),
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

  static async createFactCheckerActivitiesTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.fact_checker_activities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          fact_checker_id UUID NOT NULL REFERENCES hakikisha.users(id),
          activity_type VARCHAR(100) NOT NULL,
          claim_id UUID REFERENCES hakikisha.claims(id),
          verdict_id UUID REFERENCES hakikisha.verdicts(id),
          start_time TIMESTAMP WITH TIME ZONE,
          end_time TIMESTAMP WITH TIME ZONE,
          duration INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await db.query(query);
      console.log('Fact Checker Activities table created/verified');
    } catch (error) {
      console.error('Error creating fact checker activities table:', error);
      throw error;
    }
  }

  static async createIndexes() {
    const essentialIndexes = [
      // User sessions indexes
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON hakikisha.user_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON hakikisha.user_sessions(token)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON hakikisha.user_sessions(refresh_token)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON hakikisha.user_sessions(expires_at)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON hakikisha.user_sessions(is_active)',
      
      // Claims indexes
      'CREATE INDEX IF NOT EXISTS idx_claims_user_id ON hakikisha.claims(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_claims_status ON hakikisha.claims(status)',
      'CREATE INDEX IF NOT EXISTS idx_claims_category ON hakikisha.claims(category)',
      'CREATE INDEX IF NOT EXISTS idx_claims_trending ON hakikisha.claims(is_trending)',
      'CREATE INDEX IF NOT EXISTS idx_claims_trending_score ON hakikisha.claims(trending_score)',
      'CREATE INDEX IF NOT EXISTS idx_claims_created_at ON hakikisha.claims(created_at)',
      
      // AI Verdicts indexes
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_claim_id ON hakikisha.ai_verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_verdict ON hakikisha.ai_verdicts(verdict)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_confidence ON hakikisha.ai_verdicts(confidence_score)',
      
      // Verdicts indexes
      'CREATE INDEX IF NOT EXISTS idx_verdicts_claim_id ON hakikisha.verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_fact_checker_id ON hakikisha.verdicts(fact_checker_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_verdict ON hakikisha.verdicts(verdict)',
      
      // Users indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON hakikisha.users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON hakikisha.users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON hakikisha.users(role)',
      
      // Points indexes
      'CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON hakikisha.user_points(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON hakikisha.points_history(user_id)',
      
      // Blog indexes
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_author_id ON hakikisha.blog_articles(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON hakikisha.blog_articles(status)',
      
      // Notification indexes
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON hakikisha.notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user ON hakikisha.user_notification_settings(user_id)'
    ];

    for (const indexQuery of essentialIndexes) {
      try {
        await db.query(indexQuery);
      } catch (error) {
        console.log(`ℹ️ Index might already exist: ${error.message}`);
      }
    }
    console.log('✅ All essential indexes created/verified');
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
      const adminEmail = 'crecocommunication@gmail.com';
      const adminPassword = '12345678';
      
      console.log('Setting up admin user: ' + adminEmail);
      
      // First check if admin exists and get current state
      const existingAdmin = await db.query(
        'SELECT id, email, username, password_hash, role, registration_status, status FROM hakikisha.users WHERE email = $1',
        [adminEmail]
      );

      if (existingAdmin.rows.length > 0) {
        const admin = existingAdmin.rows[0];
        console.log('Found existing admin: ' + admin.email + ', role: ' + admin.role + ', status: ' + admin.registration_status);
        
        // Verify the password matches
        let passwordValid = false;
        if (admin.password_hash) {
          passwordValid = await bcrypt.compare(adminPassword, admin.password_hash);
        }
        
        if (!passwordValid || admin.registration_status !== 'approved' || admin.role !== 'admin') {
          console.log('Fixing admin user status and password...');
          
          const saltRounds = 12;
          const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
          
          await db.query(
            `UPDATE hakikisha.users 
             SET password_hash = $1, 
                 registration_status = 'approved', 
                 is_verified = true, 
                 role = 'admin',
                 status = 'active',
                 updated_at = NOW()
             WHERE email = $2`,
            [passwordHash, adminEmail]
          );
          
          console.log('✅ Admin user fixed and password set');
        } else {
          console.log('✅ Default admin user already exists with correct settings');
        }
        
        return existingAdmin.rows[0];
      } else {
        console.log('Creating new admin user...');
        
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        const result = await db.query(
          `INSERT INTO hakikisha.users (email, username, password_hash, role, is_verified, registration_status, status, full_name) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
           RETURNING id, email, username, role, registration_status, status, full_name`,
          [adminEmail, 'admin', passwordHash, 'admin', true, 'approved', 'active', 'Admin User']
        );

        const newAdmin = result.rows[0];
        
        console.log('✅ Default admin user created: ' + newAdmin.email);
        console.log('Username: ' + newAdmin.username);
        console.log('Role: ' + newAdmin.role);
        console.log('Registration Status: ' + newAdmin.registration_status);
        console.log('Status: ' + newAdmin.status);
        
        return newAdmin;
      }
    } catch (error) {
      console.error('❌ Error creating/updating default admin user:', error);
      throw error;
    }
  }

  static async verifyDatabaseState() {
    try {
      console.log('Verifying database state...');
      
      // Check if all essential tables exist
      const essentialTables = [
        'users', 'user_sessions', 'claims', 'ai_verdicts', 'verdicts', 
        'user_points', 'points_history', 'blog_articles',
        'user_notification_settings', 'notifications', 'otp_codes'
      ];
      
      let missingTables = [];
      
      for (const table of essentialTables) {
        const exists = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'hakikisha' 
            AND table_name = $1
          )
        `, [table]);
        
        if (!exists.rows[0].exists) {
          missingTables.push(table);
        }
      }
      
      if (missingTables.length > 0) {
        console.log('⚠️ Missing tables detected:', missingTables);
        // Recreate missing tables
        for (const table of missingTables) {
          console.log(`Recreating missing table: ${table}`);
          const methodName = `create${table.charAt(0).toUpperCase() + table.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase())}Table`;
          if (this[methodName]) {
            await this[methodName]();
          } else {
            console.log(`⚠️ Method ${methodName} not found for table ${table}`);
          }
        }
      }
      
      console.log('✅ Database state verified successfully');
      return {
        allTablesExist: missingTables.length === 0,
        missingTables: missingTables
      };
    } catch (error) {
      console.error('❌ Error verifying database state:', error);
      throw error;
    }
  }

  static async ensureFactCheckersColumns() {
    try {
      console.log('Checking for missing columns in fact_checkers table...');
      
      const requiredColumns = [
        { name: 'credentials', type: 'TEXT', defaultValue: "''" },
        { name: 'areas_of_expertise', type: 'JSONB', defaultValue: "'[]'::jsonb" },
        { name: 'verification_status', type: 'VARCHAR(50)', defaultValue: "'pending'" },
        { name: 'is_active', type: 'BOOLEAN', defaultValue: 'TRUE' },
        { name: 'suspension_reason', type: 'TEXT', defaultValue: 'NULL' },
        { name: 'suspended_at', type: 'TIMESTAMP', defaultValue: 'NULL' },
        { name: 'is_featured', type: 'BOOLEAN', defaultValue: 'FALSE' },
        { name: 'promoted_at', type: 'TIMESTAMP', defaultValue: 'NULL' }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('fact_checkers', column);
      }
      
      console.log('✅ All required columns verified in fact_checkers table');
    } catch (error) {
      console.error('❌ Error ensuring fact_checkers columns:', error);
    }
  }

  static async ensureAdminActivitiesColumns() {
    try {
      console.log('Checking for missing columns in admin_activities table...');
      
      const requiredColumns = [
        { name: 'admin_id', type: 'UUID', defaultValue: 'NULL' },
        { name: 'activity_type', type: 'VARCHAR(100)', defaultValue: "'general'" },
        { name: 'description', type: 'TEXT', defaultValue: "''" },
        { name: 'target_user_id', type: 'UUID', defaultValue: 'NULL' },
        { name: 'changes_made', type: 'JSONB', defaultValue: "'{}'::jsonb" },
        { name: 'ip_address', type: 'VARCHAR(45)', defaultValue: 'NULL' },
        { name: 'user_agent', type: 'TEXT', defaultValue: 'NULL' }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('admin_activities', column);
      }
      
      console.log('✅ All required columns verified in admin_activities table');
    } catch (error) {
      console.error('❌ Error ensuring admin_activities columns:', error);
    }
  }

  static async ensureColumnExists(tableName, column) {
    try {
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' 
        AND table_name = $1 
        AND column_name = $2
      `;
      const result = await db.query(checkQuery, [tableName, column.name]);
      
      if (result.rows.length === 0) {
        console.log(`Adding missing column ${column.name} to ${tableName} table...`);
        
        let alterQuery = `ALTER TABLE hakikisha.${tableName} ADD COLUMN ${column.name} ${column.type}`;
        
        if (column.defaultValue !== 'NULL') {
          alterQuery += ` DEFAULT ${column.defaultValue}`;
        }
        
        await db.query(alterQuery);
        console.log(`✅ Column ${column.name} added to ${tableName} table`);
      }
    } catch (error) {
      console.error(`❌ Error ensuring column ${column.name}:`, error.message);
    }
  }

  static async resetDatabase() {
    try {
      console.log('Resetting database...');
      
      const tables = [
        'otp_codes',
        'notifications',
        'user_notification_settings',
        'points_history',
        'user_points',
        'blog_likes',
        'blog_comments',
        'blog_articles',
        'fact_checker_activities',
        'verdicts',
        'ai_verdicts', 
        'claims',
        'user_sessions', // ADDED THIS
        'admin_activities',
        'registration_requests',
        'fact_checkers',
        'users'
      ];
      
      for (const table of tables) {
        try {
          await db.query(`DROP TABLE IF EXISTS hakikisha.${table} CASCADE`);
          console.log(`✅ Dropped table: ${table}`);
        } catch (error) {
          console.log(`ℹ️ Could not drop table ${table}:`, error.message);
        }
      }
      
      await this.initializeCompleteDatabase();
      console.log('✅ Database reset and reinitialized successfully!');
      
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      throw error;
    }
  }
}

module.exports = DatabaseInitializer;