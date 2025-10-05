const express = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// User profile and activities
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/my-claims', userController.getMyClaims);
router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationAsRead);
router.get('/search-history', userController.getSearchHistory);
router.post('/search-history', userController.saveSearchHistory);

module.exports = router;