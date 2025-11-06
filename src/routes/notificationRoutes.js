const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Verdict notifications
router.get('/unread-verdicts', notificationController.getUnreadVerdicts);
router.get('/unread-verdicts/count', notificationController.getUnreadVerdictCount);
router.post('/verdicts/:verdictId/read', notificationController.markVerdictAsRead);
router.post('/verdicts/read-all', notificationController.markAllVerdictsAsRead);

// Health check
router.get('/health', notificationController.getNotificationHealth);

// General notifications
router.get('/', notificationController.getUserNotifications);

module.exports = router;