const express = require('express');
const adminController = require('../controllers/adminController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');
const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware, requireRole(['admin']));

// Dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

// Registration management
router.get('/registrations', adminController.getRegistrationRequests);
router.post('/registrations/:requestId/approve', adminController.approveRegistration);
router.post('/registrations/:requestId/reject', adminController.rejectRegistration);

// Fact-checker management
router.get('/fact-checkers/performance', adminController.getFactCheckerPerformance);
router.put('/fact-checkers/:userId/status', adminController.manageFactCheckerStatus);

module.exports = router;