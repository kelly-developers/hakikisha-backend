const User = require('../models/User');
const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const FactChecker = require('../models/FactChecker');
const RegistrationRequest = require('../models/RegistrationRequest');
const AdminActivity = require('../models/AdminActivity');
const authService = require('../services/authService');
const logger = require('../utils/logger');

// User management
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const offset = (page - 1) * limit;

    // FIXED: Use correct count method
    const users = await User.findAll({ role, limit, offset });
    const total = await User.count({ where: { role } }); // FIXED: Changed from countAll to count

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get all users error:', error);
    next(error);
  }
};

// FIXED: Register new fact checker - automatically approve since admin is creating
exports.registerFactChecker = async (req, res, next) => {
  try {
    const { email, username, password, credentials, areasOfExpertise } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email, username, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User already exists with this email address' 
      });
    }

    // Create new user with APPROVED status
    const newUser = await User.create({
      email: email,
      username: username,
      password_hash: await authService.hashPassword(password),
      role: 'fact_checker',
      is_verified: true, // Auto-verify since admin is creating
      registration_status: 'approved', // FIX: Set to approved immediately
      status: 'active'
    });

    // Create fact checker profile
    const factChecker = await FactChecker.create({
      user_id: newUser.id,
      credentials: credentials || '',
      areas_of_expertise: areasOfExpertise || [],
      verification_status: 'approved', // FIX: Auto-approve verification
      is_active: true
    });

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'fact_checker_registration',
      description: `Registered new fact checker: ${email}`,
      target_user_id: newUser.id,
      changes_made: { 
        fact_checker_id: factChecker.id,
        email: email,
        username: username,
        auto_approved: true
      }
    });

    logger.info(`New fact checker registered and auto-approved: ${email} by admin ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Fact checker registered and approved successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        registration_status: newUser.registration_status,
        is_verified: newUser.is_verified
      },
      fact_checker: factChecker
    });

  } catch (error) {
    logger.error('Register fact checker error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register fact checker: ' + error.message 
    });
  }
};

// FIXED: Register admin user - automatically approve
exports.registerAdmin = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email, username, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User already exists with this email address' 
      });
    }

    // Create new admin user with APPROVED status
    const newUser = await User.create({
      email: email,
      username: username,
      password_hash: await authService.hashPassword(password),
      role: 'admin',
      is_verified: true,
      registration_status: 'approved', // FIX: Set to approved immediately
      status: 'active'
    });

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'admin_registration',
      description: `Registered new admin: ${email}`,
      target_user_id: newUser.id,
      changes_made: { 
        email: email,
        username: username,
        auto_approved: true
      }
    });

    logger.info(`New admin registered and auto-approved: ${email} by admin ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Admin registered and approved successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        registration_status: newUser.registration_status,
        is_verified: newUser.is_verified
      }
    });

  } catch (error) {
    logger.error('Register admin error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to register admin: ' + error.message 
    });
  }
};

// NEW: Bulk approve existing pending fact checkers
exports.approvePendingFactCheckers = async (req, res, next) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    const results = [];
    
    for (const userId of userIds) {
      try {
        // Update user registration status to approved
        await User.update(userId, {
          registration_status: 'approved',
          is_verified: true,
          status: 'active'
        });

        // Update fact checker verification status
        await FactChecker.updateByUserId(userId, {
          verification_status: 'approved',
          is_active: true
        });

        // Log admin activity
        await AdminActivity.create({
          admin_id: req.user.userId,
          activity_type: 'bulk_fact_checker_approval',
          description: `Approved pending fact checker: ${userId}`,
          target_user_id: userId,
          changes_made: { 
            registration_status: 'approved',
            verification_status: 'approved'
          }
        });

        results.push({
          user_id: userId,
          status: 'approved',
          success: true
        });

        logger.info(`Approved pending fact checker: ${userId} by admin ${req.user.userId}`);

      } catch (userError) {
        results.push({
          user_id: userId,
          status: 'failed',
          success: false,
          error: userError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${userIds.length} fact checkers`,
      results: results
    });

  } catch (error) {
    logger.error('Bulk approve fact checkers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve fact checkers: ' + error.message
    });
  }
};

exports.userAction = async (req, res, next) => {
  try {
    const { userId, action, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let updateData = {};
    let description = '';

    switch (action) {
      case 'suspend':
        updateData = { status: 'suspended' };
        description = `Suspended user ${userId}`;
        break;
      case 'activate':
        updateData = { status: 'active' };
        description = `Activated user ${userId}`;
        break;
      case 'deactivate':
        updateData = { status: 'inactive' };
        description = `Deactivated user ${userId}`;
        break;
      case 'approve': // NEW: Manual approval action
        updateData = { 
          registration_status: 'approved',
          is_verified: true,
          status: 'active'
        };
        description = `Approved user registration ${userId}`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    await User.update(userId, updateData);

    // If approving a fact checker, also update their fact checker profile
    if (action === 'approve' && user.role === 'fact_checker') {
      await FactChecker.updateByUserId(userId, {
        verification_status: 'approved',
        is_active: true
      });
    }

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'user_management',
      description: `${description}: ${reason || 'No reason provided'}`,
      target_user_id: userId,
      changes_made: { action, reason, previous_status: user.status, new_status: updateData.status }
    });

    logger.info(`User action performed: ${action} on user ${userId} by admin ${req.user.userId}`);

    res.json({
      message: `User ${action} successfully`,
      user_id: userId,
      action: action
    });

  } catch (error) {
    logger.error('User action error:', error);
    next(error);
  }
};

// FIXED: Dashboard and analytics - corrected count methods
exports.getDashboardStats = async (req, res, next) => {
  try {
    const { timeframe = '7 days' } = req.query;

    // Get various statistics - FIXED all count methods
    const [
      totalUsers,
      totalClaims,
      pendingClaims,
      activeFactCheckers,
      pendingRegistrations
    ] = await Promise.all([
      User.count(), // FIXED: Changed from countAll() to count()
      Claim.count(), // FIXED: Changed from countAll(timeframe) to count()
      Claim.count({ where: { status: 'pending' } }), // FIXED: Changed from countByStatus()
      FactChecker.count({ where: { is_active: true } }), // FIXED: Changed from countActive()
      User.count({ where: { registration_status: 'pending' } }) // FIXED: Changed from countByRegistrationStatus()
    ]);

    res.json({
      stats: {
        total_users: totalUsers,
        total_claims: totalClaims,
        pending_claims: pendingClaims,
        active_fact_checkers: activeFactCheckers,
        pending_registrations: pendingRegistrations
      },
      timeframe
    });

  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    next(error);
  }
};

exports.getFactCheckerActivity = async (req, res, next) => {
  try {
    const { timeframe = '7 days', userId } = req.query;

    let activity;
    if (userId) {
      // Get activity for specific fact checker
      // FIXED: You'll need to implement this method in your FactChecker model
      activity = await FactChecker.getActivityStats(userId, timeframe);
    } else {
      // Get overall fact checker activity  
      // FIXED: You'll need to implement this method in your FactChecker model
      activity = await FactChecker.getAllActivity(timeframe);
    }

    res.json({
      activity,
      timeframe,
      user_id: userId || 'all'
    });

  } catch (error) {
    logger.error('Get fact checker activity error:', error);
    next(error);
  }
};

// Registration management
exports.getRegistrationRequests = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // FIXED: These methods need to be implemented in your RegistrationRequest model
    const requests = await RegistrationRequest.findByStatus(status, limit, offset);
    const total = await RegistrationRequest.count({ where: { status } }); // FIXED: Changed from countByStatus()

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get registration requests error:', error);
    next(error);
  }
};

exports.approveRegistration = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { notes = '' } = req.body;

    const request = await RegistrationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    // Approve the request
    await RegistrationRequest.approve(requestId, req.user.userId, notes);

    // Update user verification status and registration status
    await User.update(request.user_id, { 
      is_verified: true,
      registration_status: 'approved',
      status: 'active'
    });

    // If it's a fact-checker registration, create fact-checker profile
    if (request.request_type === 'fact_checker') {
      await FactChecker.create({
        user_id: request.user_id,
        verification_status: 'approved'
      });
    }

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'registration_approval',
      description: `Approved ${request.request_type} registration for user ${request.user_id}`,
      target_user_id: request.user_id,
      changes_made: { status: 'approved', notes }
    });

    logger.info(`Registration approved: ${requestId} by admin ${req.user.userId}`);

    res.json({
      message: 'Registration approved successfully',
      request_id: requestId
    });

  } catch (error) {
    logger.error('Approve registration error:', error);
    next(error);
  }
};

exports.rejectRegistration = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await RegistrationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    await RegistrationRequest.reject(requestId, req.user.userId, reason);

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'registration_rejection',
      description: `Rejected ${request.request_type} registration for user ${request.user_id}`,
      target_user_id: request.user_id,
      changes_made: { status: 'rejected', reason }
    });

    logger.info(`Registration rejected: ${requestId} by admin ${req.user.userId}`);

    res.json({
      message: 'Registration rejected successfully',
      request_id: requestId
    });

  } catch (error) {
    logger.error('Reject registration error:', error);
    next(error);
  }
};