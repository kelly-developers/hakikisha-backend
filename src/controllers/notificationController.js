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

      // First, ensure user has notification settings
      await this.ensureUserNotificationSettings(req.user.userId);

      // Query to get unread verdict notifications
      const query = `
        SELECT 
          v.id,
          v.verdict,
          v.explanation,
          v.created_at as "verdictDate",
          c.title as "claimTitle",
          c.id as "claimId",
          fc.username as "factCheckerName",
          fc.profile_picture as "factCheckerAvatar",
          'verdict' as type
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
        WHERE c.user_id = $1 
          AND v.created_at > COALESCE(
            (SELECT last_read_verdict FROM hakikisha.user_notification_settings WHERE user_id = $1),
            '1970-01-01'::timestamp
          )
        ORDER BY v.created_at DESC
        LIMIT 50
      `;

      console.log('Executing unread verdicts query for user:', req.user.userId);
      const result = await db.query(query, [req.user.userId]);

      console.log(`Found ${result.rows.length} unread verdicts for user`);

      const verdicts = result.rows.map(verdict => ({
        id: verdict.id,
        type: verdict.type,
        verdict: verdict.verdict,
        explanation: verdict.explanation,
        verdictDate: verdict.verdictDate,
        claimTitle: verdict.claimTitle,
        claimId: verdict.claimId,
        factCheckerName: verdict.factCheckerName || 'Fact Checker',
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
      logger.error('Get unread verdicts error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch unread verdicts',
        message: 'Internal server error',
        path: req.path
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

      // Ensure user has notification settings
      await this.ensureUserNotificationSettings(req.user.userId);

      // Query to count unread verdicts
      const query = `
        SELECT COUNT(*) as count
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        WHERE c.user_id = $1 
          AND v.created_at > COALESCE(
            (SELECT last_read_verdict FROM hakikisha.user_notification_settings WHERE user_id = $1),
            '1970-01-01'::timestamp
          )
      `;

      console.log('Executing unread verdict count query for user:', req.user.userId);
      const result = await db.query(query, [req.user.userId]);

      const count = parseInt(result.rows[0].count);
      console.log(`Unread verdict count: ${count}`);

      res.json({
        success: true,
        count: count
      });

    } catch (error) {
      console.error('❌ Get unread verdict count error:', error);
      logger.error('Get unread verdict count error:', error);
      
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

      // First, ensure user has notification settings
      await this.ensureUserNotificationSettings(req.user.userId);

      // Debug: Check if verdict exists and get details
      const verdictDetailsQuery = `
        SELECT v.id, v.claim_id, c.user_id as claim_user_id, c.title
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        WHERE v.id = $1
      `;

      const verdictDetails = await db.query(verdictDetailsQuery, [verdictId]);
      
      console.log('Verdict details:', {
        verdictId: verdictId,
        found: verdictDetails.rows.length > 0,
        details: verdictDetails.rows[0] || 'Not found'
      });

      if (verdictDetails.rows.length === 0) {
        console.log('❌ Verdict not found in database:', verdictId);
        return res.status(404).json({
          success: false,
          error: 'Verdict not found'
        });
      }

      const verdict = verdictDetails.rows[0];
      
      // Check if the verdict belongs to a claim by this user
      if (verdict.claim_user_id !== req.user.userId) {
        console.log('❌ Verdict access denied - User mismatch:', {
          verdictUserId: verdict.claim_user_id,
          requestUserId: req.user.userId,
          verdictId: verdictId
        });
        return res.status(403).json({
          success: false,
          error: 'Access denied to this verdict'
        });
      }

      console.log('✅ Verdict found and access granted:', {
        verdictId: verdict.id,
        claimId: verdict.claim_id,
        claimTitle: verdict.title
      });

      // Update user's last read verdict timestamp
      const updateQuery = `
        INSERT INTO hakikisha.user_notification_settings (user_id, last_read_verdict, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          last_read_verdict = NOW(),
          updated_at = NOW()
      `;

      await db.query(updateQuery, [req.user.userId]);
      console.log('✅ Verdict marked as read for user:', req.user.userId);

      res.json({
        success: true,
        message: 'Verdict marked as read successfully',
        verdictId: verdictId
      });

    } catch (error) {
      console.error('❌ Mark verdict as read error:', error);
      logger.error('Mark verdict as read error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to mark verdict as read',
        message: 'Internal server error'
      });
    }
  }

  async markAllVerdictsAsRead(req, res) {
    try {
      console.log('📌 Mark All Verdicts as Read - User:', req.user.userId);

      if (!req.user || !req.user.userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Ensure user has notification settings
      await this.ensureUserNotificationSettings(req.user.userId);

      // Update user's last read verdict timestamp to now
      const updateQuery = `
        INSERT INTO hakikisha.user_notification_settings (user_id, last_read_verdict, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          last_read_verdict = NOW(),
          updated_at = NOW()
      `;

      await db.query(updateQuery, [req.user.userId]);
      console.log('✅ All verdicts marked as read for user:', req.user.userId);

      res.json({
        success: true,
        message: 'All verdicts marked as read successfully'
      });

    } catch (error) {
      console.error('❌ Mark all verdicts as read error:', error);
      logger.error('Mark all verdicts as read error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to mark all verdicts as read',
        message: 'Internal server error'
      });
    }
  }

  // Get all notifications (including verdicts, system, etc.)
  async getUserNotifications(req, res) {
    try {
      console.log('🔔 Get User Notifications - User:', req.user.userId);
      
      const { type, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      // Ensure user has notification settings
      await this.ensureUserNotificationSettings(req.user.userId);

      let notifications = [];
      let totalCount = 0;

      if (!type || type === 'verdict') {
        // Get verdict notifications
        const verdictQuery = `
          SELECT 
            v.id,
            v.verdict,
            v.explanation,
            v.created_at as "createdAt",
            c.title as "claimTitle",
            c.id as "claimId",
            fc.username as "senderName",
            fc.profile_picture as "senderAvatar",
            'verdict' as type,
            (v.created_at <= COALESCE(
              (SELECT last_read_verdict FROM hakikisha.user_notification_settings WHERE user_id = $1),
              '1970-01-01'::timestamp
            )) as "isRead"
          FROM hakikisha.verdicts v
          INNER JOIN hakikisha.claims c ON v.claim_id = c.id
          LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
          WHERE c.user_id = $1
          ORDER BY v.created_at DESC
          LIMIT $2 OFFSET $3
        `;

        const countQuery = `
          SELECT COUNT(*) as count
          FROM hakikisha.verdicts v
          INNER JOIN hakikisha.claims c ON v.claim_id = c.id
          WHERE c.user_id = $1
        `;

        const [verdictResult, countResult] = await Promise.all([
          db.query(verdictQuery, [req.user.userId, limit, offset]),
          db.query(countQuery, [req.user.userId])
        ]);

        notifications = verdictResult.rows;
        totalCount = parseInt(countResult.rows[0].count);
      }

      console.log(`Found ${notifications.length} notifications for user`);

      res.json({
        success: true,
        notifications: notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      });

    } catch (error) {
      console.error('❌ Get user notifications error:', error);
      logger.error('Get user notifications error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        message: 'Internal server error',
        path: req.path
      });
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

  // Debug endpoint to check verdict existence
  async debugVerdict(req, res) {
    try {
      const { verdictId } = req.params;
      console.log('🔍 Debug Verdict - ID:', verdictId);

      if (!verdictId) {
        return res.status(400).json({
          success: false,
          error: 'Verdict ID is required'
        });
      }

      // Check if verdict exists
      const verdictQuery = `
        SELECT 
          v.id,
          v.verdict,
          v.created_at,
          c.id as claim_id,
          c.title as claim_title,
          c.user_id as claim_user_id,
          u.email as claim_user_email
        FROM hakikisha.verdicts v
        LEFT JOIN hakikisha.claims c ON v.claim_id = c.id
        LEFT JOIN hakikisha.users u ON c.user_id = u.id
        WHERE v.id = $1
      `;

      const verdictResult = await db.query(verdictQuery, [verdictId]);

      if (verdictResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Verdict not found in database',
          verdictId: verdictId
        });
      }

      const verdict = verdictResult.rows[0];

      res.json({
        success: true,
        verdict: verdict,
        exists: true,
        claim: {
          id: verdict.claim_id,
          title: verdict.claim_title,
          user_id: verdict.claim_user_id,
          user_email: verdict.claim_user_email
        }
      });

    } catch (error) {
      console.error('Debug verdict error:', error);
      res.status(500).json({
        success: false,
        error: 'Debug failed',
        message: error.message
      });
    }
  }

  // Get user's all verdicts for debugging
  async getUserVerdicts(req, res) {
    try {
      const userId = req.user.userId;
      console.log('🔍 Get User Verdicts - User:', userId);

      const query = `
        SELECT 
          v.id,
          v.verdict,
          v.created_at,
          c.id as claim_id,
          c.title as claim_title
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        WHERE c.user_id = $1
        ORDER BY v.created_at DESC
        LIMIT 50
      `;

      const result = await db.query(query, [userId]);

      console.log(`Found ${result.rows.length} verdicts for user ${userId}`);

      res.json({
        success: true,
        verdicts: result.rows,
        count: result.rows.length
      });

    } catch (error) {
      console.error('Get user verdicts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user verdicts',
        message: error.message
      });
    }
  }
}

module.exports = new NotificationController();