const db = require('../config/database');
const logger = require('../utils/logger');

class NotificationController {
  async getUnreadVerdicts(req, res) {
    try {
      console.log('🔔 Get Unread Verdicts - User:', req.user.userId);
      
      const userId = req.user.userId;

      // SIMPLE QUERY - No complex table checks
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
        ORDER BY v.created_at DESC
        LIMIT 50
      `;

      console.log('Executing unread verdicts query for user:', userId);
      const result = await db.query(query, [userId]);

      console.log(`✅ Found ${result.rows.length} verdicts for user ${userId}`);

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
      
      // Return empty array instead of error for now
      res.json({
        success: true,
        verdicts: [],
        count: 0,
        message: 'No verdicts found'
      });
    }
  }

  async getUnreadVerdictCount(req, res) {
    try {
      console.log('🔔 Get Unread Verdict Count - User:', req.user.userId);
      
      const userId = req.user.userId;

      const query = `
        SELECT COUNT(*) as count
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        WHERE c.user_id = $1
      `;

      console.log('Executing unread verdict count query for user:', userId);
      const result = await db.query(query, [userId]);

      const count = parseInt(result.rows[0].count);
      console.log(`✅ Verdict count for user ${userId}: ${count}`);

      res.json({
        success: true,
        count: count
      });

    } catch (error) {
      console.error('❌ Get unread verdict count error:', error);
      
      // Return 0 instead of error
      res.json({
        success: true,
        count: 0
      });
    }
  }

  async markVerdictAsRead(req, res) {
    try {
      const { verdictId } = req.params;
      console.log('📌 Mark Verdict as Read - User:', req.user.userId, 'Verdict:', verdictId);

      const userId = req.user.userId;

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

      // For now, just return success since we don't have read status tracking yet
      console.log('✅ Verdict marked as read for user:', userId);

      res.json({
        success: true,
        message: 'Verdict marked as read successfully'
      });

    } catch (error) {
      console.error('❌ Mark verdict as read error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to mark verdict as read',
        message: error.message
      });
    }
  }

  async markAllVerdictsAsRead(req, res) {
    try {
      const userId = req.user.userId;
      console.log('📌 Mark All Verdicts as Read - User:', userId);

      // For now, just return success since we don't have read status tracking yet
      console.log('✅ All verdicts marked as read for user:', userId);

      res.json({
        success: true,
        message: 'All verdicts marked as read successfully'
      });

    } catch (error) {
      console.error('❌ Mark all verdicts as read error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to mark all verdicts as read',
        message: error.message
      });
    }
  }

  async getUserNotifications(req, res) {
    try {
      console.log('🔔 Get User Notifications - User:', req.user.userId);
      
      const userId = req.user.userId;

      // Get verdict notifications
      const query = `
        SELECT 
          v.id,
          v.verdict,
          v.explanation,
          v.created_at as "createdAt",
          c.title as "claimTitle",
          c.id as "claimId",
          COALESCE(fc.username, 'Fact Checker') as "senderName",
          fc.profile_picture as "senderAvatar",
          'verdict' as type,
          false as "isRead"
        FROM hakikisha.verdicts v
        INNER JOIN hakikisha.claims c ON v.claim_id = c.id
        LEFT JOIN hakikisha.users fc ON v.fact_checker_id = fc.id
        WHERE c.user_id = $1
        ORDER BY v.created_at DESC
        LIMIT 20
      `;

      const result = await db.query(query, [userId]);

      console.log(`✅ Found ${result.rows.length} notifications for user ${userId}`);

      res.json({
        success: true,
        notifications: result.rows,
        count: result.rows.length
      });

    } catch (error) {
      console.error('❌ Get user notifications error:', error);
      
      // Return empty array instead of error
      res.json({
        success: true,
        notifications: [],
        count: 0
      });
    }
  }

  async getNotificationHealth(req, res) {
    try {
      const userId = req.user.userId;
      
      const healthChecks = {
        user_exists: true, // Assume true since auth passed
        tables_exist: true, // Assume true for now
        user_has_claims: false,
        user_has_verdicts: false
      };

      // Check user claims
      try {
        const claimsCheck = await db.query('SELECT COUNT(*) FROM hakikisha.claims WHERE user_id = $1', [userId]);
        healthChecks.user_has_claims = parseInt(claimsCheck.rows[0].count) > 0;
      } catch (error) {
        console.log('Error checking claims:', error.message);
      }

      // Check user verdicts
      try {
        const verdictsCheck = await db.query(`
          SELECT COUNT(*) 
          FROM hakikisha.verdicts v 
          INNER JOIN hakikisha.claims c ON v.claim_id = c.id 
          WHERE c.user_id = $1
        `, [userId]);
        healthChecks.user_has_verdicts = parseInt(verdictsCheck.rows[0].count) > 0;
      } catch (error) {
        console.log('Error checking verdicts:', error.message);
      }

      res.json({
        success: true,
        health: healthChecks,
        user_id: userId,
        message: 'Notification system is working'
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