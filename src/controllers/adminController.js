const User = require('../models/User');
const Claim = require('../models/Claim');
const Verdict = require('../models/Verdict');
const FactChecker = require('../models/FactChecker');
const Blog = require('../models/Blog');
const RegistrationRequest = require('../models/RegistrationRequest');
const AdminActivity = require('../models/AdminActivity');
const authService = require('../services/authService');
const logger = require('../utils/logger');

// User management
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const offset = (page - 1) * limit;

    const users = await User.findAllWithPoints({ 
      role, 
      status, 
      search, 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });
    
    const total = await User.countWithFilters({ role, status, search });

    res.json({
      success: true,
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users: ' + error.message
    });
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdWithDetails(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user points
    const points = await User.getUserPoints(userId);
    
    // Get user claims count
    const claimsCount = await Claim.countByUserId(userId);
    
    // Get user activity
    const lastActivity = await User.getLastActivity(userId);

    res.json({
      success: true,
      user: {
        ...user,
        points: points || { total_points: 0, current_streak: 0, longest_streak: 0 },
        stats: {
          claims_count: claimsCount,
          last_activity: lastActivity
        }
      }
    });

  } catch (error) {
    logger.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details: ' + error.message
    });
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const passwordHash = await authService.hashPassword(newPassword);
    await User.update(userId, { password_hash: passwordHash });

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'password_reset',
      description: `Reset password for user ${user.email}`,
      target_user_id: userId,
      changes_made: { action: 'password_reset' }
    });

    logger.info(`Password reset for user: ${user.email} by admin ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Password reset successfully',
      user_id: userId
    });

  } catch (error) {
    logger.error('Reset user password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password: ' + error.message
    });
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (user.id === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    await User.delete(userId);

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'user_deletion',
      description: `Deleted user ${user.email}`,
      target_user_id: userId,
      changes_made: { action: 'user_deletion', email: user.email }
    });

    logger.info(`User deleted: ${user.email} by admin ${req.user.userId}`);

    res.json({
      success: true,
      message: 'User deleted successfully',
      user_id: userId
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user: ' + error.message
    });
  }
};

// Fact Checker Management
exports.getAllFactCheckers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    const factCheckers = await FactChecker.findAllWithDetails({
      status,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await FactChecker.countWithFilters({ status, search });

    res.json({
      success: true,
      fact_checkers: factCheckers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get all fact checkers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fact checkers: ' + error.message
    });
  }
};

exports.getFactCheckerDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const factChecker = await FactChecker.findByUserIdWithDetails(userId);
    if (!factChecker) {
      return res.status(404).json({
        success: false,
        error: 'Fact checker not found'
      });
    }

    // Get fact checker stats
    const stats = await FactChecker.getStats(userId);

    res.json({
      success: true,
      fact_checker: {
        ...factChecker,
        stats
      }
    });

  } catch (error) {
    logger.error('Get fact checker details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fact checker details: ' + error.message
    });
  }
};

exports.resetFactCheckerPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    const factChecker = await FactChecker.findByUserId(userId);
    if (!factChecker) {
      return res.status(404).json({
        success: false,
        error: 'Fact checker not found'
      });
    }

    const passwordHash = await authService.hashPassword(newPassword);
    await User.update(userId, { password_hash: passwordHash });

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'fact_checker_password_reset',
      description: `Reset password for fact checker ${factChecker.email}`,
      target_user_id: userId,
      changes_made: { action: 'password_reset' }
    });

    logger.info(`Password reset for fact checker: ${factChecker.email} by admin ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Fact checker password reset successfully',
      user_id: userId
    });

  } catch (error) {
    logger.error('Reset fact checker password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset fact checker password: ' + error.message
    });
  }
};

exports.deleteFactChecker = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const factChecker = await FactChecker.findByUserId(userId);
    if (!factChecker) {
      return res.status(404).json({
        success: false,
        error: 'Fact checker not found'
      });
    }

    await FactChecker.deleteByUserId(userId);

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'fact_checker_deletion',
      description: `Deleted fact checker ${factChecker.email}`,
      target_user_id: userId,
      changes_made: { action: 'fact_checker_deletion', email: factChecker.email }
    });

    logger.info(`Fact checker deleted: ${factChecker.email} by admin ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Fact checker deleted successfully',
      user_id: userId
    });

  } catch (error) {
    logger.error('Delete fact checker error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete fact checker: ' + error.message
    });
  }
};

// Get fact checker's claims and activity
exports.getFactCheckerClaims = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;

    const db = require('../config/database');

    // Get claims verified by this fact checker
    let query = `
      SELECT 
        c.id,
        c.title,
        c.description,
        c.category,
        c.status,
        c.created_at as submitted_date,
        v.verdict,
        v.explanation,
        v.explanation as verdict_text,
        v.explanation as verdictDescription,
        v.explanation as human_explanation,
        v.created_at as verdict_date,
        v.time_spent,
        u.username as submitter_username,
        u.email as submitter_email
      FROM hakikisha.claims c
      JOIN hakikisha.verdicts v ON c.id = v.claim_id
      JOIN hakikisha.users u ON c.user_id = u.id
      WHERE v.fact_checker_id = $1
    `;

    const params = [userId];

    if (status) {
      query += ` AND c.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY v.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM hakikisha.claims c
      JOIN hakikisha.verdicts v ON c.id = v.claim_id
      WHERE v.fact_checker_id = $1
    `;
    const countParams = [userId];

    if (status) {
      countQuery += ` AND c.status = $2`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      claims: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get fact checker claims error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fact checker claims: ' + error.message
    });
  }
};

// Admin Management
exports.getAllAdmins = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const admins = await User.findAll({ 
      role: 'admin', 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });

    const total = await User.count({ role: 'admin' });

    res.json({
      success: true,
      admins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admins: ' + error.message
    });
  }
};

exports.resetAdminPassword = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    const admin = await User.findById(userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Prevent admin from resetting their own password via this endpoint
    if (admin.id === req.user.userId) {
      return res.status(400).json({
        success: false,
        error: 'Use profile settings to change your own password'
      });
    }

    const passwordHash = await authService.hashPassword(newPassword);
    await User.update(userId, { password_hash: passwordHash });

    // Log admin activity
    await AdminActivity.create({
      admin_id: req.user.userId,
      activity_type: 'admin_password_reset',
      description: `Reset password for admin ${admin.email}`,
      target_user_id: userId,
      changes_made: { action: 'password_reset' }
    });

    logger.info(`Password reset for admin: ${admin.email} by admin ${req.user.userId}`);

    res.json({
      success: true,
      message: 'Admin password reset successfully',
      user_id: userId
    });

  } catch (error) {
    logger.error('Reset admin password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset admin password: ' + error.message
    });
  }
};

// FIXED: Register new fact checker - automatically approve since admin is creating
exports.registerFactChecker = async (req, res, next) => {
  try {
    const { email, username, password, phone, credentials, areasOfExpertise } = req.body;

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
      phone: phone || null,
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
    const { email, username, password, phone } = req.body;

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
      phone: phone || null,
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
    const { userId } = req.params;
    const { action, reason } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
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
        return res.status(400).json({ 
          success: false,
          error: 'Invalid action' 
        });
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
      success: true,
      message: `User ${action} successfully`,
      user_id: userId,
      action: action
    });

  } catch (error) {
    logger.error('User action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform user action: ' + error.message
    });
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
      verifiedFalseClaims,
      activeFactCheckers,
      pendingRegistrations,
      totalBlogs,
      totalAdmins
    ] = await Promise.all([
      User.countAll(),
      Claim.countAll(),
      Claim.countByStatus('pending'),
      Claim.countVerifiedFalse(),
      FactChecker.countActive(),
      User.countByRegistrationStatus('pending'),
      Blog.countAll(),
      User.countByRole('admin')
    ]);

    // Get recent activity
    const recentUsers = await User.getRecentRegistrations(timeframe);
    const recentClaims = await Claim.getRecentClaims(timeframe);

    res.json({
      success: true,
      stats: {
        total_users: totalUsers,
        total_claims: totalClaims,
        pending_claims: pendingClaims,
        verified_false_claims: verifiedFalseClaims,
        active_fact_checkers: activeFactCheckers,
        pending_registrations: pendingRegistrations,
        total_blogs: totalBlogs,
        total_admins: totalAdmins
      },
      recent_activity: {
        new_users: recentUsers,
        new_claims: recentClaims
      },
      timeframe
    });

  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats: ' + error.message
    });
  }
};

exports.getUsersOverview = async (req, res, next) => {
  try {
    const { timeframe = '30 days' } = req.query;

    const overview = await User.getOverviewStats(timeframe);

    res.json({
      success: true,
      overview,
      timeframe
    });

  } catch (error) {
    logger.error('Get users overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users overview: ' + error.message
    });
  }
};

exports.getClaimsOverview = async (req, res, next) => {
  try {
    const { timeframe = '30 days' } = req.query;

    const overview = await Claim.getOverviewStats(timeframe);

    res.json({
      success: true,
      overview,
      timeframe
    });

  } catch (error) {
    logger.error('Get claims overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch claims overview: ' + error.message
    });
  }
};

exports.getFactCheckerActivity = async (req, res, next) => {
  try {
    const { timeframe = '7 days', userId } = req.query;

    let activity;
    if (userId) {
      // Get activity for specific fact checker
      activity = await FactChecker.getActivityStats(userId, timeframe);
    } else {
      // Get overall fact checker activity  
      activity = await FactChecker.getAllActivity(timeframe);
    }

    res.json({
      success: true,
      activity,
      timeframe,
      user_id: userId || 'all'
    });

  } catch (error) {
    logger.error('Get fact checker activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fact checker activity: ' + error.message
    });
  }
};

// Registration management
exports.getRegistrationRequests = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const requests = await RegistrationRequest.findByStatus(status, limit, offset);
    const total = await RegistrationRequest.countByStatus(status);

    res.json({
      success: true,
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
    res.status(500).json({
      success: false,
      error: 'Failed to fetch registration requests: ' + error.message
    });
  }
};

exports.approveRegistration = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { notes = '' } = req.body;

    const request = await RegistrationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false,
        error: 'Registration request not found' 
      });
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
      success: true,
      message: 'Registration approved successfully',
      request_id: requestId
    });

  } catch (error) {
    logger.error('Approve registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve registration: ' + error.message
    });
  }
};

exports.rejectRegistration = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await RegistrationRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ 
        success: false,
        error: 'Registration request not found' 
      });
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
      success: true,
      message: 'Registration rejected successfully',
      request_id: requestId
    });

  } catch (error) {
    logger.error('Reject registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject registration: ' + error.message
    });
  }
};

exports.getSystemHealth = async (req, res, next) => {
  try {
    const db = require('../config/database');
    const { isAvailable } = require('../config/redis');
    
    const dbStatus = await db.query('SELECT 1').then(() => 'healthy').catch(() => 'unhealthy');
    const redisStatus = isAvailable() ? 'healthy' : 'unhealthy';
    
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      success: true,
      health: {
        database: dbStatus,
        redis: redisStatus,
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
        },
        uptime: `${Math.round(uptime)}s`
      }
    });

  } catch (error) {
    logger.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health: ' + error.message
    });
  }
};