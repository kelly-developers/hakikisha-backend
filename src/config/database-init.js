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
      await this.runMigrations();
      await this.createDefaultAdmin();
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
      console.log('ℹ️ Schema might already exist:', error.message);
    }
  }

  static async initializeEssentialTables() {
    try {
      console.log('Creating essential database tables...');

      await this.createUsersTable();
      await this.createPointsTables();
      await this.createBlogTables();
      await this.createAdminTables();
      await this.createClaimsTable();
      await this.createAIVerdictsTable();
      await this.createVerdictsTable();
      await this.createFactCheckerActivitiesTable();
      await this.createNotificationSettingsTable();
      await this.createNotificationsTable();
      
      console.log('✅ Essential tables created/verified successfully!');
    } catch (error) {
      console.error('❌ Error creating essential tables:', error);
      throw error;
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
      console.log('✅ Notifications table created/verified');

      await this.createNotificationsIndexes();
      
    } catch (error) {
      console.error('❌ Error creating notifications table:', error);
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
          console.log(`✅ Created notification index: ${indexQuery.split(' ')[3]}`);
        } catch (error) {
          console.log(`ℹ️ Notification index might already exist: ${error.message}`);
        }
      }
      console.log('✅ All notification indexes created/verified');
    } catch (error) {
      console.error('❌ Error creating notification indexes:', error);
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
      console.log('✅ User points table created/verified');

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
      console.log('✅ Points history table created/verified');

    } catch (error) {
      console.error('❌ Error creating points tables:', error);
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
      console.log('✅ Users table created/verified');
    } catch (error) {
      console.error('❌ Error creating users table:', error);
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
      console.log('✅ User notification settings table created/verified');

      await this.initializeNotificationSettings();
      
    } catch (error) {
      console.error('❌ Error creating notification settings table:', error);
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

      console.log(`✅ Notification settings initialized for ${users.rows.length} users`);
    } catch (error) {
      console.error('❌ Error initializing notification settings:', error);
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
      console.log('✅ Blog categories table created/verified');

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
      console.log('✅ Blog articles table created/verified');

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
      console.log('✅ Blog comments table created/verified');

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
      const viewQuery = `
        CREATE OR REPLACE VIEW public.claims AS 
        SELECT * FROM hakikisha.claims
      `;
      await db.query(viewQuery);
      console.log('✅ Public schema claims view created');
    } catch (error) {
      console.log('ℹ️ Could not create public schema view:', error.message);
      
      try {
        const tableQuery = `
          CREATE TABLE IF NOT EXISTS public.claims (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            category VARCHAR(100),
            media_type VARCHAR(50) DEFAULT 'text',
            media_url TEXT,
            status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ai_processing', 'human_review', 'resolved', 'rejected', 'human_approved', 'ai_approved', 'completed', 'ai_processing_failed')),
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
        await db.query(tableQuery);
        console.log('✅ Public schema claims table created as fallback');
      } catch (fallbackError) {
        console.log('ℹ️ Could not create public schema table:', fallbackError.message);
      }
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
      console.log('✅ Fact Checker Activities table created/verified');
    } catch (error) {
      console.error('❌ Error creating fact checker activities table:', error);
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
      'CREATE INDEX IF NOT EXISTS idx_claims_created_at ON hakikisha.claims(created_at)',
      
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_claim_id ON hakikisha.ai_verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_verdict ON hakikisha.ai_verdicts(verdict)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_confidence ON hakikisha.ai_verdicts(confidence_score)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_edited ON hakikisha.ai_verdicts(is_edited_by_human)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_edited_by ON hakikisha.ai_verdicts(edited_by_fact_checker_id)',
      'CREATE INDEX IF NOT EXISTS idx_ai_verdicts_created_at ON hakikisha.ai_verdicts(created_at)',
      
      'CREATE INDEX IF NOT EXISTS idx_verdicts_claim_id ON hakikisha.verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_fact_checker_id ON hakikisha.verdicts(fact_checker_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_verdict ON hakikisha.verdicts(verdict)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_is_final ON hakikisha.verdicts(is_final)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_based_on_ai ON hakikisha.verdicts(based_on_ai_verdict)',
      
      'CREATE INDEX IF NOT EXISTS idx_fact_checker_activities_fact_checker_id ON hakikisha.fact_checker_activities(fact_checker_id)',
      'CREATE INDEX IF NOT EXISTS idx_fact_checker_activities_activity_type ON hakikisha.fact_checker_activities(activity_type)',
      'CREATE INDEX IF NOT EXISTS idx_fact_checker_activities_claim_id ON hakikisha.fact_checker_activities(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_fact_checker_activities_created_at ON hakikisha.fact_checker_activities(created_at)',
      
      'CREATE INDEX IF NOT EXISTS idx_users_email ON hakikisha.users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON hakikisha.users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON hakikisha.users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_status ON hakikisha.users(status)',
      'CREATE INDEX IF NOT EXISTS idx_users_registration_status ON hakikisha.users(registration_status)',
      
      'CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON hakikisha.admin_activities(admin_id)',
      'CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON hakikisha.admin_activities(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_registration_requests_user_id ON hakikisha.registration_requests(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_fact_checkers_user_id ON hakikisha.fact_checkers(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_fact_checkers_status ON hakikisha.fact_checkers(verification_status)',
      'CREATE INDEX IF NOT EXISTS idx_fact_checkers_active ON hakikisha.fact_checkers(is_active)',
      
      'CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON hakikisha.user_points(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_points_total ON hakikisha.user_points(total_points)',
      'CREATE INDEX IF NOT EXISTS idx_user_points_streak ON hakikisha.user_points(current_streak)',
      'CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON hakikisha.points_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON hakikisha.points_history(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_points_history_activity_type ON hakikisha.points_history(activity_type)',
      
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_author_id ON hakikisha.blog_articles(author_id)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_status ON hakikisha.blog_articles(status)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON hakikisha.blog_articles(category)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_published_at ON hakikisha.blog_articles(published_at)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_created_at ON hakikisha.blog_articles(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_view_count ON hakikisha.blog_articles(view_count)',
      'CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON hakikisha.blog_articles(slug)',
      'CREATE INDEX IF NOT EXISTS idx_blog_comments_blog_id ON hakikisha.blog_comments(blog_id)',
      'CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id ON hakikisha.blog_comments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_blog_likes_blog_id ON hakikisha.blog_likes(blog_id)',
      'CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON hakikisha.blog_likes(user_id)',
      
      'CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user ON hakikisha.user_notification_settings(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_claim_user ON hakikisha.verdicts(claim_id) INCLUDE (fact_checker_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_claims_user_created ON hakikisha.claims(user_id, created_at)'
    ];

    for (const indexQuery of essentialIndexes) {
      try {
        await db.query(indexQuery);
        console.log(`✅ Created index: ${indexQuery.split(' ')[3]}`);
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
      const adminEmail = 'kellynyachiro@gmail.com';
      const adminPassword = 'Kelly@40125507';
      
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
          `INSERT INTO hakikisha.users (email, username, password_hash, role, is_verified, registration_status, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING id, email, username, role, registration_status, status`,
          [adminEmail, 'admin', passwordHash, 'admin', true, 'approved', 'active']
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
      
      // Check verdicts table for the based_on_ai_verdict column
      const verdictsColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'verdicts'
        ORDER BY ordinal_position
      `);
      
      console.log(`Verdicts table columns: ${verdictsColumns.rows.length}`);
      const hasBasedOnAIVerdictColumn = verdictsColumns.rows.some(col => col.column_name === 'based_on_ai_verdict');
      console.log(`✅ Verdicts has based_on_ai_verdict column: ${hasBasedOnAIVerdictColumn}`);
      
      if (!hasBasedOnAIVerdictColumn) {
        console.log('⚠️ based_on_ai_verdict column missing, adding it now...');
        await this.ensureVerdictsColumns();
      }

      // Check AI verdicts table
      const aiVerdictsColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'ai_verdicts'
        ORDER BY ordinal_position
      `);
      
      console.log(`AI Verdicts table columns: ${aiVerdictsColumns.rows.length}`);
      const hasRequiredAIVerdictsColumns = aiVerdictsColumns.rows.some(col => col.column_name === 'is_edited_by_human') &&
                                         aiVerdictsColumns.rows.some(col => col.column_name === 'edited_by_fact_checker_id') &&
                                         aiVerdictsColumns.rows.some(col => col.column_name === 'edited_at');
      console.log(`✅ AI Verdicts has required columns: ${hasRequiredAIVerdictsColumns}`);

      // Check fact checker activities table
      const factCheckerActivitiesColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'fact_checker_activities'
        ORDER BY ordinal_position
      `);
      
      console.log(`Fact Checker Activities table columns: ${factCheckerActivitiesColumns.rows.length}`);
      const hasRequiredActivitiesColumns = factCheckerActivitiesColumns.rows.length > 0;
      console.log(`✅ Fact Checker Activities table exists: ${hasRequiredActivitiesColumns}`);

      // Check points tables
      const pointsColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'user_points'
        ORDER BY ordinal_position
      `);
      
      console.log(`User points table columns: ${pointsColumns.rows.length}`);
      const hasRequiredPointsColumns = pointsColumns.rows.some(col => col.column_name === 'total_points') &&
                                     pointsColumns.rows.some(col => col.column_name === 'current_streak') &&
                                     pointsColumns.rows.some(col => col.column_name === 'longest_streak');
      console.log(`✅ User points has required columns: ${hasRequiredPointsColumns}`);

      // Check notification settings table
      const notificationSettingsColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'user_notification_settings'
        ORDER BY ordinal_position
      `);
      
      console.log(`Notification settings table columns: ${notificationSettingsColumns.rows.length}`);
      const hasRequiredNotificationColumns = notificationSettingsColumns.rows.some(col => col.column_name === 'last_read_verdict') &&
                                           notificationSettingsColumns.rows.some(col => col.column_name === 'email_notifications');
      console.log(`✅ Notification settings has required columns: ${hasRequiredNotificationColumns}`);

      // Check notifications table
      const notificationsColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'notifications'
        ORDER BY ordinal_position
      `);
      
      console.log(`Notifications table columns: ${notificationsColumns.rows.length}`);
      const hasRequiredNotificationsColumns = notificationsColumns.rows.some(col => col.column_name === 'user_id') &&
                                            notificationsColumns.rows.some(col => col.column_name === 'type') &&
                                            notificationsColumns.rows.some(col => col.column_name === 'title') &&
                                            notificationsColumns.rows.some(col => col.column_name === 'message');
      console.log(`✅ Notifications table has required columns: ${hasRequiredNotificationsColumns}`);

      // Initialize points for users without points records
      const usersWithoutPoints = await db.query(`
        SELECT u.id, u.email 
        FROM hakikisha.users u 
        LEFT JOIN hakikisha.user_points up ON u.id = up.user_id 
        WHERE up.user_id IS NULL
      `);
      
      if (usersWithoutPoints.rows.length > 0) {
        console.log(`Found ${usersWithoutPoints.rows.length} users without points records`);
        for (const user of usersWithoutPoints.rows) {
          await db.query(
            'INSERT INTO hakikisha.user_points (user_id, total_points, current_streak, longest_streak) VALUES ($1, 0, 0, 0)',
            [user.id]
          );
          console.log(`✅ Initialized points for user: ${user.email}`);
        }
      }

      // Initialize notification settings for users without settings
      const usersWithoutNotificationSettings = await db.query(`
        SELECT u.id, u.email 
        FROM hakikisha.users u 
        LEFT JOIN hakikisha.user_notification_settings uns ON u.id = uns.user_id 
        WHERE uns.user_id IS NULL
      `);
      
      if (usersWithoutNotificationSettings.rows.length > 0) {
        console.log(`Found ${usersWithoutNotificationSettings.rows.length} users without notification settings`);
        for (const user of usersWithoutNotificationSettings.rows) {
          await db.query(
            'INSERT INTO hakikisha.user_notification_settings (user_id) VALUES ($1)',
            [user.id]
          );
          console.log(`✅ Initialized notification settings for user: ${user.email}`);
        }
      }

      return {
        verdictsTableHasBasedOnAI: hasBasedOnAIVerdictColumn,
        aiVerdictsTablesExist: hasRequiredAIVerdictsColumns,
        factCheckerActivitiesExist: hasRequiredActivitiesColumns,
        pointsTablesExist: hasRequiredPointsColumns,
        notificationSettingsExist: hasRequiredNotificationColumns,
        notificationsTableExist: hasRequiredNotificationsColumns,
        usersWithPoints: usersWithoutPoints.rows.length === 0,
        usersWithNotificationSettings: usersWithoutNotificationSettings.rows.length === 0
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
        { name: 'credentials', type: 'TEXT', defaultValue: "''", isUnique: false },
        { name: 'areas_of_expertise', type: 'JSONB', defaultValue: "'[]'::jsonb", isUnique: false },
        { name: 'verification_status', type: 'VARCHAR(50)', defaultValue: "'pending'", isUnique: false },
        { name: 'is_active', type: 'BOOLEAN', defaultValue: 'TRUE', isUnique: false },
        { name: 'suspension_reason', type: 'TEXT', defaultValue: 'NULL', isUnique: false },
        { name: 'suspended_at', type: 'TIMESTAMP', defaultValue: 'NULL', isUnique: false },
        { name: 'is_featured', type: 'BOOLEAN', defaultValue: 'FALSE', isUnique: false },
        { name: 'promoted_at', type: 'TIMESTAMP', defaultValue: 'NULL', isUnique: false },
        { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false },
        { name: 'updated_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('fact_checkers', column);
      }
      
      console.log('✅ All required columns verified in fact_checkers table');
    } catch (error) {
      console.error('❌ Error ensuring fact_checkers columns:', error);
      throw error;
    }
  }

  static async ensureAdminActivitiesColumns() {
    try {
      console.log('Checking for missing columns in admin_activities table...');
      
      const requiredColumns = [
        { name: 'admin_id', type: 'UUID', defaultValue: 'NULL', isUnique: false },
        { name: 'activity_type', type: 'VARCHAR(100)', defaultValue: "'general'", isUnique: false },
        { name: 'description', type: 'TEXT', defaultValue: "''", isUnique: false },
        { name: 'target_user_id', type: 'UUID', defaultValue: 'NULL', isUnique: false },
        { name: 'changes_made', type: 'JSONB', defaultValue: "'{}'::jsonb", isUnique: false },
        { name: 'ip_address', type: 'VARCHAR(45)', defaultValue: 'NULL', isUnique: false },
        { name: 'user_agent', type: 'TEXT', defaultValue: 'NULL', isUnique: false },
        { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('admin_activities', column);
      }
      
      console.log('✅ All required columns verified in admin_activities table');
    } catch (error) {
      console.error('❌ Error ensuring admin_activities columns:', error);
      throw error;
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
        
        if (column.isUnique) {
          alterQuery += ` UNIQUE`;
        }
        
        if (column.defaultValue !== 'NULL') {
          alterQuery += ` DEFAULT ${column.defaultValue}`;
        }
        
        await db.query(alterQuery);
        console.log(`✅ Column ${column.name} added to ${tableName} table`);
        
        if (column.defaultValue !== 'NULL' && !column.defaultValue.includes('random()')) {
          const updateQuery = `UPDATE hakikisha.${tableName} SET ${column.name} = ${column.defaultValue} WHERE ${column.name} IS NULL`;
          await db.query(updateQuery);
          console.log(`✅ Existing records updated with default ${column.name}`);
        }
      } else {
        console.log(`✅ Column ${column.name} already exists in ${tableName} table`);
      }
    } catch (error) {
      console.error(`❌ Error ensuring column ${column.name}:`, error.message);
    }
  }

  static async resetDatabase() {
    try {
      console.log('Resetting database...');
      
      const tables = [
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
      
      try {
        await db.query('DROP VIEW IF EXISTS public.claims CASCADE');
        await db.query('DROP TABLE IF EXISTS public.claims CASCADE');
        console.log('✅ Dropped public.claims');
      } catch (error) {
        console.log('ℹ️ Could not drop public.claims:', error.message);
      }
      
      await this.initializeCompleteDatabase();
      console.log('✅ Database reset and reinitialized successfully!');
      
    } catch (error) {
      console.error('❌ Error resetting database:', error);
      throw error;
    }
  }

  static async fixExistingDatabase() {
    try {
      console.log('Fixing existing database schema...');
      
      try {
        await db.query(`
          ALTER TABLE hakikisha.users 
          ALTER COLUMN username DROP NOT NULL
        `);
        console.log('✅ Made username column nullable');
      } catch (error) {
        console.log('ℹ️ Username column might already be nullable:', error.message);
      }
      
      await this.updateClaimsTableStatus();
      await this.updateVerdictsTableConstraints();
      
      await this.ensureRequiredColumns();
      await this.createPointsTables();
      await this.createBlogTables();
      await this.createAIVerdictsTable();
      await this.createFactCheckerActivitiesTable();
      await this.createNotificationSettingsTable();
      await this.createNotificationsTable();
      await this.ensureVerdictsColumns();
      await this.ensureFactCheckersColumns();
      await this.ensureAdminActivitiesColumns();
      await this.createIndexes();
      
      console.log('✅ Existing database fixed successfully!');
    } catch (error) {
      console.error('❌ Error fixing existing database:', error);
      throw error;
    }
  }

  static async updateClaimsTableStatus() {
    try {
      console.log('Updating claims table status constraint...');
      
      try {
        await db.query('ALTER TABLE hakikisha.claims DROP CONSTRAINT IF EXISTS claims_status_check');
        console.log('✅ Dropped existing claims_status_check constraint');
      } catch (error) {
        console.log('ℹ️ Could not drop constraint (might not exist):', error.message);
      }
      
      await db.query(`
        ALTER TABLE hakikisha.claims 
        ADD CONSTRAINT claims_status_check 
        CHECK (status IN ('pending', 'ai_processing', 'human_review', 'resolved', 'rejected', 'human_approved', 'ai_approved', 'completed', 'ai_processing_failed'))
      `);
      console.log('✅ Added updated claims_status_check constraint');
      
    } catch (error) {
      console.error('❌ Error updating claims table status constraint:', error);
      throw error;
    }
  }

  static async updateVerdictsTableConstraints() {
    try {
      console.log('Updating verdicts table constraints...');
      
      // Update AI verdicts table
      try {
        await db.query('ALTER TABLE hakikisha.ai_verdicts DROP CONSTRAINT IF EXISTS ai_verdicts_verdict_check');
        console.log('✅ Dropped existing ai_verdicts_verdict_check constraint');
      } catch (error) {
        console.log('ℹ️ Could not drop AI verdicts constraint:', error.message);
      }
      
      await db.query(`
        ALTER TABLE hakikisha.ai_verdicts 
        ADD CONSTRAINT ai_verdicts_verdict_check 
        CHECK (verdict IN ('true', 'false', 'misleading', 'needs_context', 'unverifiable'))
      `);
      console.log('✅ Added updated ai_verdicts_verdict_check constraint');
      
      // Update verdicts table
      try {
        await db.query('ALTER TABLE hakikisha.verdicts DROP CONSTRAINT IF EXISTS verdicts_verdict_check');
        console.log('✅ Dropped existing verdicts_verdict_check constraint');
      } catch (error) {
        console.log('ℹ️ Could not drop verdicts constraint:', error.message);
      }
      
      await db.query(`
        ALTER TABLE hakikisha.verdicts 
        ADD CONSTRAINT verdicts_verdict_check 
        CHECK (verdict IN ('true', 'false', 'misleading', 'needs_context', 'unverifiable'))
      `);
      console.log('✅ Added updated verdicts_verdict_check constraint');
      
    } catch (error) {
      console.error('❌ Error updating verdicts table constraints:', error);
      throw error;
    }
  }

  static async ensureRequiredColumns() {
    try {
      console.log('Ensuring all required columns exist...');
      await this.ensureUserColumns();
      await this.ensureVerdictsColumns();
      await this.ensureAIVerdictsColumns();
      await this.ensureNotificationSettingsColumns();
      await this.ensureNotificationsColumns();
    } catch (error) {
      console.error('❌ Error ensuring required columns:', error);
      throw error;
    }
  }

  static async ensureNotificationsColumns() {
    try {
      console.log('Checking for missing columns in notifications table...');
      
      const requiredColumns = [
        { name: 'user_id', type: 'UUID', defaultValue: 'NULL', isUnique: false },
        { name: 'type', type: 'VARCHAR(100)', defaultValue: "'general'", isUnique: false },
        { name: 'title', type: 'VARCHAR(500)', defaultValue: "''", isUnique: false },
        { name: 'message', type: 'TEXT', defaultValue: "''", isUnique: false },
        { name: 'related_entity_type', type: 'VARCHAR(100)', defaultValue: 'NULL', isUnique: false },
        { name: 'related_entity_id', type: 'UUID', defaultValue: 'NULL', isUnique: false },
        { name: 'is_read', type: 'BOOLEAN', defaultValue: 'FALSE', isUnique: false },
        { name: 'is_sent', type: 'BOOLEAN', defaultValue: 'FALSE', isUnique: false },
        { name: 'sent_at', type: 'TIMESTAMP WITH TIME ZONE', defaultValue: 'NULL', isUnique: false },
        { name: 'read_at', type: 'TIMESTAMP WITH TIME ZONE', defaultValue: 'NULL', isUnique: false },
        { name: 'metadata', type: 'JSONB', defaultValue: "'{}'::jsonb", isUnique: false },
        { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false },
        { name: 'updated_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('notifications', column);
      }
      
      console.log('✅ All required columns verified in notifications table');
    } catch (error) {
      console.error('❌ Error ensuring notifications columns:', error);
      throw error;
    }
  }

  static async ensureNotificationSettingsColumns() {
    try {
      console.log('Checking for missing columns in user_notification_settings table...');
      
      const requiredColumns = [
        { name: 'last_read_verdict', type: 'TIMESTAMP WITH TIME ZONE', defaultValue: "'1970-01-01'::timestamp", isUnique: false },
        { name: 'email_notifications', type: 'BOOLEAN', defaultValue: 'TRUE', isUnique: false },
        { name: 'push_notifications', type: 'BOOLEAN', defaultValue: 'TRUE', isUnique: false },
        { name: 'verdict_notifications', type: 'BOOLEAN', defaultValue: 'TRUE', isUnique: false },
        { name: 'system_notifications', type: 'BOOLEAN', defaultValue: 'TRUE', isUnique: false },
        { name: 'created_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false },
        { name: 'updated_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('user_notification_settings', column);
      }
      
      console.log('✅ All required columns verified in user_notification_settings table');
    } catch (error) {
      console.error('❌ Error ensuring notification settings columns:', error);
      throw error;
    }
  }

  static async runMigrations() {
    try {
      console.log('Running database migrations...');
      
      // Run verdict_responses table migration
      const verdictResponsesMigration = require('../../migrations/022_create_verdict_responses_table');
      await verdictResponsesMigration.up();
      
      // Run username unique constraint migration
      const usernameUniqueMigration = require('../../migrations/023_add_username_unique_constraint');
      await usernameUniqueMigration.up();
      
      // Run notification settings migration
      const notificationSettingsMigration = require('../../migrations/024_add_notification_settings_table');
      await notificationSettingsMigration.up();
      
      // Run notifications table migration
      const notificationsMigration = require('../../migrations/025_add_notifications_table');
      await notificationsMigration.up();
      
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.log('ℹ️ Migrations might have already run:', error.message);
    }
  }

  static async ensureAIVerdictsColumns() {
    try {
      console.log('Checking for missing columns in ai_verdicts table...');
      
      const requiredColumns = [
        { name: 'is_edited_by_human', type: 'BOOLEAN', defaultValue: 'false', isUnique: false },
        { name: 'edited_by_fact_checker_id', type: 'UUID', defaultValue: 'NULL', isUnique: false },
        { name: 'edited_at', type: 'TIMESTAMP WITH TIME ZONE', defaultValue: 'NULL', isUnique: false },
        { name: 'updated_at', type: 'TIMESTAMP', defaultValue: 'NOW()', isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('ai_verdicts', column);
      }
      
      console.log('✅ All required columns verified in ai_verdicts table');
    } catch (error) {
      console.error('❌ Error ensuring ai_verdicts columns:', error);
      throw error;
    }
  }

  static async ensureUserColumns() {
    try {
      console.log('Checking for missing columns in users table...');
      
      const requiredColumns = [
        { name: 'username', type: 'VARCHAR(255)', defaultValue: 'NULL', isUnique: true },
        { name: 'status', type: 'VARCHAR(50)', defaultValue: "'active'", isUnique: false },
        { name: 'registration_status', type: 'VARCHAR(50)', defaultValue: "'pending'", isUnique: false },
        { name: 'is_verified', type: 'BOOLEAN', defaultValue: 'FALSE', isUnique: false },
        { name: 'role', type: 'VARCHAR(50)', defaultValue: "'user'", isUnique: false },
        { name: 'phone', type: 'VARCHAR(50)', defaultValue: 'NULL', isUnique: false },
        { name: 'profile_picture', type: 'TEXT', defaultValue: 'NULL', isUnique: false },
        { name: 'two_factor_enabled', type: 'BOOLEAN', defaultValue: 'FALSE', isUnique: false },
        { name: 'two_factor_secret', type: 'VARCHAR(255)', defaultValue: 'NULL', isUnique: false },
        { name: 'login_count', type: 'INTEGER', defaultValue: '0', isUnique: false },
        { name: 'last_login', type: 'TIMESTAMP', defaultValue: 'NULL', isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('users', column);
      }
      
      console.log('✅ All required columns verified in users table');
    } catch (error) {
      console.error('❌ Error ensuring user columns:', error);
      throw error;
    }
  }

  static async ensureVerdictsColumns() {
    try {
      console.log('Checking for missing columns in verdicts table...');
      
      const requiredColumns = [
        { name: 'is_final', type: 'BOOLEAN', defaultValue: 'TRUE', isUnique: false },
        { name: 'approval_status', type: 'VARCHAR(50)', defaultValue: "'approved'", isUnique: false },
        { name: 'review_notes', type: 'TEXT', defaultValue: 'NULL', isUnique: false },
        { name: 'time_spent', type: 'INTEGER', defaultValue: '0', isUnique: false },
        { name: 'ai_verdict_id', type: 'UUID', defaultValue: 'NULL', isUnique: false },
        { name: 'based_on_ai_verdict', type: 'BOOLEAN', defaultValue: 'false', isUnique: false },
        { name: 'responsibility', type: 'VARCHAR(20)', defaultValue: "'creco'", isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('verdicts', column);
      }
      
      console.log(' All required columns verified in verdicts table');
    } catch (error) {
      console.error('❌ Error ensuring verdicts columns:', error);
      throw error;
    }
  }

  static async checkAdminActivitiesTable() {
    try {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'hakikisha' 
          AND table_name = 'admin_activities'
        )
      `);
      return result.rows[0].exists;
    } catch (error) {
      console.error('Error checking admin_activities table:', error);
      return false;
    }
  }
}

module.exports = DatabaseInitializer;