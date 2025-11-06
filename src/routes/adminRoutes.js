const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, requireRole(['admin']));

// User Management Routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.post('/users/register-fact-checker', adminController.registerFactChecker);
router.post('/users/register-admin', adminController.registerAdmin);
router.post('/users/:userId/actions', adminController.userAction);
router.post('/users/:userId/reset-password', adminController.resetUserPassword);
router.delete('/users/:userId', adminController.deleteUser);
router.post('/users/approve-pending-fact-checkers', adminController.approvePendingFactCheckers);

// Fact Checker Management Routes
router.get('/fact-checkers', adminController.getAllFactCheckers);
router.get('/fact-checkers/:userId', adminController.getFactCheckerDetails);
router.get('/fact-checkers/:userId/claims', adminController.getFactCheckerClaims);
router.post('/fact-checkers/:userId/reset-password', adminController.resetFactCheckerPassword);
router.delete('/fact-checkers/:userId', adminController.deleteFactChecker);

// Admin Management Routes
router.get('/admins', adminController.getAllAdmins);
router.post('/admins/:userId/reset-password', adminController.resetAdminPassword);

// Dashboard & Analytics Routes
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/fact-checker-activity', adminController.getFactCheckerActivity);
router.get('/dashboard/users/overview', adminController.getUsersOverview);
router.get('/dashboard/claims/overview', adminController.getClaimsOverview);

// Registration Management Routes
router.get('/registrations', adminController.getRegistrationRequests);
router.post('/registrations/:requestId/approve', adminController.approveRegistration);
router.post('/registrations/:requestId/reject', adminController.rejectRegistration);

// System Management Routes
router.get('/system/health', adminController.getSystemHealth);

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