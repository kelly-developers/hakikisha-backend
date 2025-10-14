const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// All routes require authentication
router.use(authMiddleware);

// User profile endpoints
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile-picture', upload.single('image'), userController.uploadProfilePicture);
router.post('/change-password', userController.changePassword);

// User claims and activities
router.get('/my-claims', userController.getMyClaims);
router.get('/notifications', userController.getNotifications);
router.put('/notifications/:id/read', userController.markNotificationAsRead);
router.get('/search-history', userController.getSearchHistory);
router.post('/search-history', userController.saveSearchHistory);

module.exports = router;
