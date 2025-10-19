const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, requireRole(['admin']));

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.post('/users/register-fact-checker', adminController.registerFactChecker);
router.post('/users/register-admin', adminController.registerAdmin);
router.post('/users/action', adminController.userAction);
router.post('/users/approve-pending-fact-checkers', adminController.approvePendingFactCheckers); // NEW

// Dashboard & Analytics Routes
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/fact-checker-activity', adminController.getFactCheckerActivity);

// Registration Management Routes
router.get('/registrations', adminController.getRegistrationRequests);
router.post('/registrations/:requestId/approve', adminController.approveRegistration);
router.post('/registrations/:requestId/reject', adminController.rejectRegistration);

// System Management Routes
router.get('/system/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware for admin routes
router.use((error, req, res, next) => {
  console.error('Admin route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error in admin route',
    message: error.message
  });
});

// 404 handler for admin routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Admin route not found',
    message: `Route ${req.originalUrl} not found in admin routes`
  });
});

module.exports = router;