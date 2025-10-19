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
      await this.createBlogTables();
      await this.createAdminTables();
      await this.createClaimsTable();
      await this.createAIVerdictsTable();
      await this.createVerdictsTable();
      
      console.log('✅ Essential tables created/verified successfully!');
    } catch (error) {
      console.error('❌ Error creating essential tables:', error);
      throw error;
    }
  }

  static async createBlogTables() {
    try {
      console.log('📝 Creating blog tables...');

      // Blog Categories Table
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

      // Blog Articles Table
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

      // Blog Comments Table
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

      // Blog Likes Table
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

  static async ensureUserColumns() {
    try {
      console.log('🔍 Checking for missing columns in users table...');
      
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

  static async createAdminTables() {
    try {
      console.log('🛠️ Creating admin tables...');

      // Admin Activities Table
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

      // Registration Requests Table
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

      // Fact Checkers Table
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

      // Ensure all fact_checkers columns exist
      await this.ensureFactCheckersColumns();
      
      // Ensure admin_activities columns exist
      await this.ensureAdminActivitiesColumns();
      
    } catch (error) {
      console.error('❌ Error creating admin tables:', error);
      throw error;
    }
  }

  static async ensureFactCheckersColumns() {
    try {
      console.log('🔍 Checking for missing columns in fact_checkers table...');
      
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
      console.log('🔍 Checking for missing columns in admin_activities table...');
      
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
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'ai_processing', 'human_review', 'resolved', 'rejected', 'human_approved', 'ai_approved')),
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
      
      // Also create the claims table in public schema for backward compatibility
      await this.createPublicSchemaClaimsTable();
      
      console.log('✅ Claims table created/verified');
    } catch (error) {
      console.error('❌ Error creating claims table:', error);
      throw error;
    }
  }

  static async createPublicSchemaClaimsTable() {
    try {
      // Create a view or table in public schema for backward compatibility
      const viewQuery = `
        CREATE OR REPLACE VIEW public.claims AS 
        SELECT * FROM hakikisha.claims
      `;
      await db.query(viewQuery);
      console.log('✅ Public schema claims view created');
    } catch (error) {
      console.log('⚠️ Could not create public schema view:', error.message);
      
      // Fallback: create table in public schema
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
            status VARCHAR(50) DEFAULT 'pending',
            priority VARCHAR(50) DEFAULT 'medium',
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
        console.log('⚠️ Could not create public schema table:', fallbackError.message);
      }
    }
  }

  static async createAIVerdictsTable() {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS hakikisha.ai_verdicts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          claim_id UUID NOT NULL REFERENCES hakikisha.claims(id) ON DELETE CASCADE,
          verdict VARCHAR(50) CHECK (verdict IN ('verified', 'false', 'misleading', 'needs_context', 'unverifiable')),
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
          verdict VARCHAR(50) NOT NULL CHECK (verdict IN ('verified', 'false', 'misleading', 'needs_context', 'unverifiable')),
          explanation TEXT NOT NULL,
          evidence_sources JSONB,
          ai_verdict_id UUID REFERENCES hakikisha.ai_verdicts(id),
          is_final BOOLEAN DEFAULT TRUE,
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

  static async ensureVerdictsColumns() {
    try {
      console.log('🔍 Checking for missing columns in verdicts table...');
      
      const requiredColumns = [
        { name: 'is_final', type: 'BOOLEAN', defaultValue: 'TRUE', isUnique: false },
        { name: 'approval_status', type: 'VARCHAR(50)', defaultValue: "'approved'", isUnique: false },
        { name: 'review_notes', type: 'TEXT', defaultValue: 'NULL', isUnique: false },
        { name: 'time_spent', type: 'INTEGER', defaultValue: '0', isUnique: false },
        { name: 'ai_verdict_id', type: 'UUID', defaultValue: 'NULL', isUnique: false }
      ];

      for (const column of requiredColumns) {
        await this.ensureColumnExists('verdicts', column);
      }
      
      console.log('✅ All required columns verified in verdicts table');
    } catch (error) {
      console.error('❌ Error ensuring verdicts columns:', error);
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
      'CREATE INDEX IF NOT EXISTS idx_verdicts_claim_id ON hakikisha.verdicts(claim_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_fact_checker_id ON hakikisha.verdicts(fact_checker_id)',
      'CREATE INDEX IF NOT EXISTS idx_verdicts_is_final ON hakikisha.verdicts(is_final)',
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
      
      // BLOG INDEXES
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
      'CREATE INDEX IF NOT EXISTS idx_blog_likes_user_id ON hakikisha.blog_likes(user_id)'
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
        'SELECT id, email, username, password_hash, role, registration_status, status FROM hakikisha.users WHERE email = $1',
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
                 status = 'active',
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
          `INSERT INTO hakikisha.users (email, username, password_hash, role, is_verified, registration_status, status) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) 
           RETURNING id, email, username, role, registration_status, status`,
          [adminEmail, 'admin', passwordHash, 'admin', true, 'approved', 'active']
        );

        const newAdmin = result.rows[0];
        
        console.log('Default admin user created: ' + newAdmin.email);
        console.log('Username: ' + newAdmin.username);
        console.log('Role: ' + newAdmin.role);
        console.log('Registration Status: ' + newAdmin.registration_status);
        console.log('Status: ' + newAdmin.status);
        
        return newAdmin;
      }
    } catch (error) {
      console.error('Error creating/updating default admin user:', error);
      throw error;
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
      const essentialTables = [
        'users', 
        'blog_articles',
        'blog_comments',  
        'blog_likes',
        'claims', 
        'ai_verdicts', 
        'verdicts', 
        'admin_activities', 
        'registration_requests', 
        'fact_checkers'
      ];
      
      for (const tableName of essentialTables) {
        try {
          const count = await db.query(`SELECT COUNT(*) FROM hakikisha.${tableName}`);
          console.log(`📋 ${tableName}: ${count.rows[0].count} records`);
        } catch (error) {
          console.log(`❌ ${tableName}: Table not accessible - ${error.message}`);
        }
      }

      // Verify blog articles table has required columns
      const blogColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'blog_articles'
        ORDER BY ordinal_position
      `);
      
      console.log(`📋 Blog articles table columns: ${blogColumns.rows.length}`);
      const hasRequiredColumns = blogColumns.rows.some(col => col.column_name === 'title') &&
                               blogColumns.rows.some(col => col.column_name === 'content') &&
                               blogColumns.rows.some(col => col.column_name === 'author_id');
      console.log(`   - has required columns: ${hasRequiredColumns}`);

      // Verify verdicts table columns
      const verdictsColumns = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'hakikisha' AND table_name = 'verdicts'
        ORDER BY ordinal_position
      `);
      
      console.log(`📋 Verdicts table columns: ${verdictsColumns.rows.length}`);
      const hasIsFinal = verdictsColumns.rows.some(col => col.column_name === 'is_final');
      console.log(`   - has is_final column: ${hasIsFinal}`);

      // Verify admin user and check all columns
      const adminCheck = await db.query(
        `SELECT email, username, role, status, registration_status, is_verified, 
                password_hash IS NOT NULL as has_password 
         FROM hakikisha.users WHERE email = $1`,
        ['kellynyachiro@gmail.com']
      );
      
      if (adminCheck.rows.length > 0) {
        const admin = adminCheck.rows[0];
        console.log(`👤 Admin status: ${admin.email}`);
        console.log(`   Username: ${admin.username}`);
        console.log(`   Role: ${admin.role}`);
        console.log(`   Status: ${admin.status}`);
        console.log(`   Registration Status: ${admin.registration_status}`);
        console.log(`   Is Verified: ${admin.is_verified}`);
        console.log(`   Has Password: ${admin.has_password}`);
      } else {
        console.log('❌ Admin user not found');
      }

      // Verify all required columns exist and have data
      const columnCheck = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(username) as users_with_username,
          COUNT(status) as users_with_status,
          COUNT(registration_status) as users_with_reg_status,
          COUNT(is_verified) as users_with_verified,
          COUNT(role) as users_with_role
        FROM hakikisha.users
      `);
      
      const stats = columnCheck.rows[0];
      console.log(`📊 Column completeness stats:`);
      console.log(`   Username: ${stats.users_with_username}/${stats.total_users}`);
      console.log(`   Status: ${stats.users_with_status}/${stats.total_users}`);
      console.log(`   Registration Status: ${stats.users_with_reg_status}/${stats.total_users}`);
      console.log(`   Is Verified: ${stats.users_with_verified}/${stats.total_users}`);
      console.log(`   Role: ${stats.users_with_role}/${stats.total_users}`);

      return {
        tableCount: tables.rows.length,
        adminExists: adminCheck.rows.length > 0,
        adminHasPassword: adminCheck.rows.length > 0 ? adminCheck.rows[0].has_password : false,
        verdictsHasIsFinal: hasIsFinal,
        blogTablesExist: hasRequiredColumns,
        allColumnsPresent: stats.users_with_username === stats.total_users && 
                          stats.users_with_status === stats.total_users
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
        'blog_likes',
        'blog_comments',
        'blog_articles',
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
          console.log(`Dropped table: ${table}`);
        } catch (error) {
          console.log(`Could not drop table ${table}:`, error.message);
        }
      }
      
      // Drop public schema claims view/table
      try {
        await db.query('DROP VIEW IF EXISTS public.claims CASCADE');
        await db.query('DROP TABLE IF EXISTS public.claims CASCADE');
        console.log('Dropped public.claims');
      } catch (error) {
        console.log('Could not drop public.claims:', error.message);
      }
      
      await this.initializeCompleteDatabase();
      console.log('✅ Database reset and reinitialized successfully!');
      
    } catch (error) {
      console.error('Error resetting database:', error);
      throw error;
    }
  }

  // New method to fix existing database without full reset
  static async fixExistingDatabase() {
    try {
      console.log('🔧 Fixing existing database schema...');
      
      // Make username nullable if it's currently NOT NULL
      try {
        await db.query(`
          ALTER TABLE hakikisha.users 
          ALTER COLUMN username DROP NOT NULL
        `);
        console.log('✅ Made username column nullable');
      } catch (error) {
        console.log('⚠️ Username column might already be nullable:', error.message);
      }
      
      // Ensure all required columns exist
      await this.ensureRequiredColumns();
      
      // Create blog tables if they don't exist
      await this.createBlogTables();
      
      // Ensure verdicts columns exist (including is_final)
      await this.ensureVerdictsColumns();
      
      // Ensure fact_checkers columns exist
      await this.ensureFactCheckersColumns();
      
      // Ensure admin_activities columns exist
      await this.ensureAdminActivitiesColumns();
      
      // Recreate indexes that might be missing
      await this.createIndexes();
      
      console.log('✅ Existing database fixed successfully!');
    } catch (error) {
      console.error('❌ Error fixing existing database:', error);
      throw error;
    }
  }

  static async ensureRequiredColumns() {
    try {
      console.log('🔍 Ensuring all required columns exist...');
      await this.ensureUserColumns();
      await this.ensureVerdictsColumns();
    } catch (error) {
      console.error('❌ Error ensuring required columns:', error);
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
        console.log(`🔄 Adding missing column ${column.name} to ${tableName} table...`);
        
        let alterQuery = `ALTER TABLE hakikisha.${tableName} ADD COLUMN ${column.name} ${column.type}`;
        
        if (column.isUnique) {
          alterQuery += ` UNIQUE`;
        }
        
        if (column.defaultValue !== 'NULL') {
          alterQuery += ` DEFAULT ${column.defaultValue}`;
        }
        
        await db.query(alterQuery);
        console.log(`✅ Column ${column.name} added to ${tableName} table`);
        
        // Update existing records if needed
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

  // New method to check if admin_activities table exists
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