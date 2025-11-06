const db = require('../config/database');
const logger = require('../utils/logger');

class NotificationController {
  async getUnreadVerdicts(req, res) {
    try {
      console.log('🔔 Get Unread Verdicts - User:', req.user.userId);
      
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.userId;

      // First, ensure all required tables exist
      await this.ensureRequiredTables();
      
      // Ensure user has notification settings
      await this.ensureUserNotificationSettings(userId);

      // SIMPLIFIED QUERY - Fixed version
      const query = `
        SELECT 
          v.id,
          v.verdict,
          v.explanation,
          v.created_at as "verdictDate",
          c.title as "claimTitle",
          c.id as "claimId",
          COALESCE(fc.username, 'Fact Checker') as "factCheckerName",
          fc.profile_picture as "factCheckerAvatar",
          'verdict' as type
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
        WHERE c.user_id = $1 
          AND (
            v.created_at > COALESCE(
              (SELECT last_read_verdict FROM hakikisha.user_notification_settings WHERE user_id = $1),
              '1970-01-01'::timestamp
            )
            OR NOT EXISTS (
              SELECT 1 FROM hakikisha.user_notification_settings WHERE user_id = $1
            )
          )
        ORDER BY v.created_at DESC
        LIMIT 50
      `;

      console.log('Executing unread verdicts query for user:', userId);
      const result = await db.query(query, [userId]);

      console.log(`Found ${result.rows.length} unread verdicts for user ${userId}`);

      const verdicts = result.rows.map(verdict => ({
        id: verdict.id,
        type: verdict.type,
        verdict: verdict.verdict,
        explanation: verdict.explanation,
        verdictDate: verdict.verdictDate,
        claimTitle: verdict.claimTitle,
        claimId: verdict.claimId,
        factCheckerName: verdict.factCheckerName,
        factCheckerAvatar: verdict.factCheckerAvatar,
        isRead: false
      }));

      res.json({
        success: true,
        verdicts: verdicts,
        count: verdicts.length
      });

    } catch (error) {
      console.error('❌ Get unread verdicts error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        detail: error.detail
      });
      
      // More specific error response
      if (error.code === '42P01') { // Table doesn't exist
        return res.status(500).json({
          success: false,
          error: 'Database tables not properly initialized',
          message: 'Please contact administrator to initialize database tables',
          code: 'TABLE_MISSING'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unread verdicts',
        message: 'Database query failed',
        path: req.path,
        code: 'DATABASE_ERROR'
      });
    }
  }

  async getUnreadVerdictCount(req, res) {
    try {
      console.log('🔔 Get Unread Verdict Count - User:', req.user.userId);
      
      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userId = req.user.userId;

      // Ensure tables exist
      await this.ensureRequiredTables();
      await this.ensureUserNotificationSettings(userId);

      // SIMPLIFIED COUNT QUERY
      const query = `
        SELECT COUNT(*) as count
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        WHERE c.user_id = $1 
          AND (
            v.created_at > COALESCE(
              (SELECT last_read_verdict FROM hakikisha.user_notification_settings WHERE user_id = $1),
              '1970-01-01'::timestamp
            )
            OR NOT EXISTS (
              SELECT 1 FROM hakikisha.user_notification_settings WHERE user_id = $1
            )
          )
      `;

      console.log('Executing unread verdict count query for user:', userId);
      const result = await db.query(query, [userId]);

      const count = parseInt(result.rows[0].count);
      console.log(`Unread verdict count for user ${userId}: ${count}`);

      res.json({
        success: true,
        count: count
      });

    } catch (error) {
      console.error('❌ Get unread verdict count error:', error);
      console.error('Error details:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unread verdict count',
        message: 'Internal server error',
        path: req.path
      });
    }
  }

  async markVerdictAsRead(req, res) {
    try {
      const { verdictId } = req.params;
      console.log('📌 Mark Verdict as Read - User:', req.user.userId, 'Verdict:', verdictId);

      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      if (!verdictId) {
        return res.status(400).json({
          success: false,
          error: 'Verdict ID is required'
        });
      }

      const userId = req.user.userId;

      // Ensure tables exist
      await this.ensureRequiredTables();
      await this.ensureUserNotificationSettings(userId);

      // Check if verdict exists and belongs to user
      const verdictCheckQuery = `
        SELECT v.id 
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        WHERE v.id = $1 AND c.user_id = $2
      `;

      const verdictCheck = await db.query(verdictCheckQuery, [verdictId, userId]);
      
      if (verdictCheck.rows.length === 0) {
        console.log('Verdict not found or access denied:', { verdictId, userId });
        return res.status(404).json({
          success: false,
          error: 'Verdict not found or access denied'
        });
      }

      // Update last read timestamp
      const updateQuery = `
        INSERT INTO hakikisha.user_notification_settings (user_id, last_read_verdict, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          last_read_verdict = NOW(),
          updated_at = NOW()
      `;

      await db.query(updateQuery, [userId]);
      console.log('✅ Verdict marked as read for user:', userId);

      res.json({
        success: true,
        message: 'Verdict marked as read successfully'
      });

    } catch (error) {
      console.error('❌ Mark verdict as read error:', error);
      console.error('Error details:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Failed to mark verdict as read',
        message: 'Internal server error'
      });
    }
  }

  async markAllVerdictsAsRead(req, res) {
    try {
      const userId = req.user.userId;
      console.log('📌 Mark All Verdicts as Read - User:', userId);

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Ensure tables exist
      await this.ensureRequiredTables();
      await this.ensureUserNotificationSettings(userId);

      // Update last read timestamp to now
      const updateQuery = `
        INSERT INTO hakikisha.user_notification_settings (user_id, last_read_verdict, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          last_read_verdict = NOW(),
          updated_at = NOW()
      `;

      await db.query(updateQuery, [userId]);
      console.log('✅ All verdicts marked as read for user:', userId);

      res.json({
        success: true,
        message: 'All verdicts marked as read successfully'
      });

    } catch (error) {
      console.error('❌ Mark all verdicts as read error:', error);
      console.error('Error details:', error.message);
      
      res.status(500).json({
        success: false,
        error: 'Failed to mark all verdicts as read',
        message: 'Internal server error'
      });
    }
  }

  // Helper method to ensure required tables exist
  async ensureRequiredTables() {
    try {
      console.log('🔧 Ensuring required tables exist...');
      
      // Check if verdicts table exists
      const verdictsCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'hakikisha' 
          AND table_name = 'verdicts'
        )
      `);
      
      const claimsCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'hakikisha' 
          AND table_name = 'claims'
        )
      `);
      
      const settingsCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'hakikisha' 
          AND table_name = 'user_notification_settings'
        )
      `);

      console.log('Table existence check:', {
        verdicts: verdictsCheck.rows[0].exists,
        claims: claimsCheck.rows[0].exists,
        notification_settings: settingsCheck.rows[0].exists
      });

      if (!verdictsCheck.rows[0].exists || !claimsCheck.rows[0].exists) {
        throw new Error('Required database tables are missing. Please run database initialization.');
      }

      // Create notification settings table if it doesn't exist
      if (!settingsCheck.rows[0].exists) {
        console.log('Creating missing user_notification_settings table...');
        await db.query(`
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
        `);
        console.log('✅ user_notification_settings table created');
      }

    } catch (error) {
      console.error('❌ Error ensuring required tables:', error);
      throw error;
    }
  }

  // Helper method to ensure user has notification settings
  async ensureUserNotificationSettings(userId) {
    try {
      const checkQuery = `
        SELECT user_id FROM hakikisha.user_notification_settings WHERE user_id = $1
      `;
      const result = await db.query(checkQuery, [userId]);

      if (result.rows.length === 0) {
        console.log('Creating notification settings for user:', userId);
        const insertQuery = `
          INSERT INTO hakikisha.user_notification_settings (user_id) VALUES ($1)
        `;
        await db.query(insertQuery, [userId]);
        console.log('✅ Notification settings created for user:', userId);
      }
    } catch (error) {
      console.error('Error ensuring user notification settings:', error);
      throw error;
    }
  }

  // Health check endpoint for notifications
  async getNotificationHealth(req, res) {
    try {
      const userId = req.user.userId;
      
      const healthChecks = {
        user_exists: false,
        tables_exist: false,
        notification_settings_exist: false,
        user_has_claims: false,
        user_has_verdicts: false
      };

      // Check user exists
      const userCheck = await db.query('SELECT id FROM hakikisha.users WHERE id = $1', [userId]);
      healthChecks.user_exists = userCheck.rows.length > 0;

      // Check tables exist
      const tables = ['verdicts', 'claims', 'user_notification_settings'];
      for (const table of tables) {
        const tableCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'hakikisha' AND table_name = $1
          )
        `, [table]);
        healthChecks.tables_exist = tableCheck.rows[0].exists;
        if (!healthChecks.tables_exist) break;
      }

      // Check notification settings
      const settingsCheck = await db.query('SELECT user_id FROM hakikisha.user_notification_settings WHERE user_id = $1', [userId]);
      healthChecks.notification_settings_exist = settingsCheck.rows.length > 0;

      // Check user claims
      const claimsCheck = await db.query('SELECT COUNT(*) FROM hakikisha.claims WHERE user_id = $1', [userId]);
      healthChecks.user_has_claims = parseInt(claimsCheck.rows[0].count) > 0;

      // Check user verdicts
      const verdictsCheck = await db.query(`
        SELECT COUNT(*) 
        FROM hakikisha.verdicts v 
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id 
        WHERE c.user_id = $1
      `, [userId]);
      healthChecks.user_has_verdicts = parseInt(verdictsCheck.rows[0].count) > 0;

      res.json({
        success: true,
        health: healthChecks,
        user_id: userId
      });

    } catch (error) {
      console.error('Notification health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  }
}

module.exports = new NotificationController();