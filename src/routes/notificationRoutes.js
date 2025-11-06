const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all notifications for user
router.get('/', notificationController.getUserNotifications);

// Get specific notification
router.get('/:id', notificationController.getNotification);

// Get unread notification count
router.get('/unread/count', notificationController.getUnreadCount);

// Get unread verdicts count
router.get('/unread-verdicts', async (req, res) => {
  try {
    const db = require('../config/database');
    const result = await db.query(
      `SELECT COUNT(*) as count 
       FROM hakikisha.notifications 
       WHERE user_id = $1 
       AND type = 'verdict_ready' 
       AND is_read = false`,
      [req.user.userId]
    );
    
    res.json({
      success: true,
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Get unread verdicts count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get unread verdicts count'
    });
  }
});

// Mark specific verdict as read
router.post('/verdicts/:claimId/read', async (req, res) => {
  try {
    const { claimId } = req.params;
    const db = require('../config/database');
    
    await db.query(
      `UPDATE hakikisha.notifications 
       SET is_read = true, read_at = NOW() 
       WHERE user_id = $1 
       AND related_entity_id = $2 
       AND type = 'verdict_ready'`,
      [req.user.userId, claimId]
    );
    
    res.json({
      success: true,
      message: 'Verdict notification marked as read'
    });
  } catch (error) {
    console.error('Mark verdict as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark verdict as read'
    });
  }
});

// Mark as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all as read
router.put('/read/all', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.deleteNotification);

// Clear all notifications
router.delete('/clear/all', notificationController.clearAllNotifications);

// Get notification preferences
router.get('/preferences/settings', notificationController.getNotificationPreferences);

// Update notification preferences
router.put('/preferences/settings', notificationController.updateNotificationPreferences);

// Create notification (admin only)
router.post('/create', notificationController.createNotification);

module.exports = router;
