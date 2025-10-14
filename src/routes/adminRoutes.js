const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, requireRole(['admin']));

// User management
router.get('/users', adminController.getAllUsers);
router.post('/register-fact-checker', adminController.registerFactChecker);
router.post('/user-action', adminController.userAction);

// Dashboard and analytics
router.get('/dashboard-stats', adminController.getDashboardStats);
router.get('/fact-checker-activity', adminController.getFactCheckerActivity);

// Registration management (existing)
router.get('/registrations', adminController.getRegistrationRequests);
router.post('/registrations/:requestId/approve', adminController.approveRegistration);
router.post('/registrations/:requestId/reject', adminController.rejectRegistration);

module.exports = router;
