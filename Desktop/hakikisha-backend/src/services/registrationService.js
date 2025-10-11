const User = require('../models/User');
const RegistrationRequest = require('../models/RegistrationRequest');
const FactChecker = require('../models/FactChecker');
const emailService = require('./emailService');
const authService = require('./authService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class RegistrationService {
  async registerUser(userData) {
    try {
      const { email, password, phone, role } = userData;

      // Validate input
      this.validateRegistrationData(userData);

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email address');
      }

      // Create user account
      const user = await this.createUserAccount(userData);

      // Create registration request if approval is required
      let registrationRequest;
      if (this.requiresApproval(role)) {
        registrationRequest = await this.createRegistrationRequest(user.id, role);
        
        // Notify admins about new registration request
        await this.notifyAdminsAboutRegistration(registrationRequest);
      } else {
        // Auto-approve if no approval required
        await User.update(user.id, { is_verified: true });
      }

      // Send verification email
      await this.sendVerificationEmail(user);

      logger.info('User registration completed', {
        userId: user.id,
        email: user.email,
        role: user.role,
        requiresApproval: this.requiresApproval(role)
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        requires_approval: this.requiresApproval(role),
        message: this.requiresApproval(role) ? 
          'Registration submitted for admin approval' : 
          'Registration completed successfully'
      };

    } catch (error) {
      logger.error('User registration failed:', error);
      throw error;
    }
  }

  async registerFactChecker(userId, applicationData) {
    try {
      const { expertise_areas, experience, qualifications, additional_info } = applicationData;

      // Validate application data
      this.validateFactCheckerApplication(applicationData);

      // Check if user already has a fact-checker application
      const existingApplication = await FactChecker.findByUserId(userId);
      if (existingApplication) {
        throw new Error('Fact-checker application already exists for this user');
      }

      // Create fact-checker application
      const factCheckerApp = await FactChecker.create({
        user_id: userId,
        expertise_areas: expertise_areas || [],
        experience: experience || '',
        qualifications: qualifications || '',
        additional_info: additional_info || '',
        verification_status: 'pending'
      });

      // Update user role to fact-checker (pending approval)
      await User.update(userId, { role: Constants.ROLES.FACT_CHECKER });

      // Notify admins about fact-checker application
      await this.notifyAdminsAboutFactCheckerApplication(factCheckerApp);

      logger.info('Fact-checker application submitted', {
        userId,
        applicationId: factCheckerApp.id
      });

      return {
        success: true,
        application_id: factCheckerApp.id,
        status: 'pending',
        message: 'Fact-checker application submitted for review'
      };

    } catch (error) {
      logger.error('Fact-checker registration failed:', error);
      throw error;
    }
  }

  async processRegistrationRequest(requestId, action, adminId, notes = '') {
    try {
      const request = await RegistrationRequest.findById(requestId);
      if (!request) {
        throw new Error('Registration request not found');
      }

      let result;
      if (action === 'approve') {
        result = await this.approveRegistration(request, adminId, notes);
      } else if (action === 'reject') {
        result = await this.rejectRegistration(request, adminId, notes);
      } else {
        throw new Error('Invalid action. Use "approve" or "reject"');
      }

      logger.info('Registration request processed', {
        requestId,
        action,
        adminId,
        userId: request.user_id
      });

      return result;

    } catch (error) {
      logger.error('Registration request processing failed:', error);
      throw error;
    }
  }

  async approveRegistration(request, adminId, notes) {
    // Update user verification status
    await User.update(request.user_id, { is_verified: true });

    // If it's a fact-checker registration, create fact-checker profile
    if (request.request_type === 'fact_checker') {
      await FactChecker.create({
        user_id: request.user_id,
        verification_status: 'approved'
      });
    }

    // Update request status
    await RegistrationRequest.updateStatus(request.id, 'approved', adminId, notes);

    // Notify user about approval
    await this.notifyUserAboutApproval(request.user_id, request.request_type);

    return {
      success: true,
      message: 'Registration approved successfully',
      user_id: request.user_id,
      request_type: request.request_type
    };
  }

  async rejectRegistration(request, adminId, notes) {
    // Update request status
    await RegistrationRequest.updateStatus(request.id, 'rejected', adminId, notes);

    // Notify user about rejection
    await this.notifyUserAboutRejection(request.user_id, request.request_type, notes);

    return {
      success: true,
      message: 'Registration rejected',
      user_id: request.user_id,
      request_type: request.request_type,
      reason: notes
    };
  }

  async getPendingRegistrations(filters = {}) {
    try {
      const { type, page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;

      const requests = await RegistrationRequest.findByStatus('pending', limit, offset, type);
      const total = await RegistrationRequest.countByStatus('pending', type);

      // Enhance requests with user details
      const enhancedRequests = await Promise.all(
        requests.map(async request => {
          const user = await User.findById(request.user_id);
          return {
            ...request,
            user_email: user.email,
            user_phone: user.phone
          };
        })
      );

      return {
        requests: enhancedRequests,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('Pending registrations retrieval failed:', error);
      throw error;
    }
  }

  async validateEmail(email) {
    try {
      // Check if email is already registered
      const existingUser = await User.findByEmail(email);
      
      return {
        valid: !existingUser,
        available: !existingUser,
        message: existingUser ? 'Email already registered' : 'Email available'
      };

    } catch (error) {
      logger.error('Email validation failed:', error);
      throw error;
    }
  }

  async resendVerificationEmail(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.is_verified) {
        throw new Error('User is already verified');
      }

      // Generate new verification token
      const verificationToken = await authService.generateVerificationToken(userId);

      // Send verification email
      await emailService.sendVerificationEmail(user.email, verificationToken);

      logger.info('Verification email resent', { userId });

      return {
        success: true,
        message: 'Verification email sent successfully'
      };

    } catch (error) {
      logger.error('Verification email resend failed:', error);
      throw error;
    }
  }

  validateRegistrationData(userData) {
    const { email, password, role } = userData;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (role && !Object.values(Constants.ROLES).includes(role)) {
      throw new Error('Invalid user role');
    }
  }

  validateFactCheckerApplication(applicationData) {
    const { expertise_areas, experience } = applicationData;

    if (!expertise_areas || expertise_areas.length === 0) {
      throw new Error('At least one expertise area is required');
    }

    if (!experience || experience.length < 50) {
      throw new Error('Please provide detailed experience information (minimum 50 characters)');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  requiresApproval(role) {
    // Fact-checker registrations always require approval
    // Regular users might not require approval based on configuration
    return role === Constants.ROLES.FACT_CHECKER || 
           process.env.REGISTRATION_APPROVAL_REQUIRED === 'true';
  }

  async createUserAccount(userData) {
    const { email, password, phone, role } = userData;

    // Hash password
    const password_hash = await authService.hashPassword(password);

    // Create user
    return await User.create({
      email,
      password_hash,
      phone,
      role: role || Constants.ROLES.USER,
      is_verified: !this.requiresApproval(role) // Auto-verify if no approval required
    });
  }

  async createRegistrationRequest(userId, role) {
    return await RegistrationRequest.create({
      user_id: userId,
      request_type: role,
      status: 'pending'
    });
  }

  async sendVerificationEmail(user) {
    const verificationToken = await authService.generateVerificationToken(user.id);
    await emailService.sendVerificationEmail(user.email, verificationToken);
  }

  async notifyAdminsAboutRegistration(registrationRequest) {
    // This would notify admins about new registration requests
    // Implementation would depend on your notification system
    logger.info('Admin notification placeholder for new registration', {
      requestId: registrationRequest.id,
      userId: registrationRequest.user_id
    });
  }

  async notifyAdminsAboutFactCheckerApplication(application) {
    // Notify admins about fact-checker applications
    logger.info('Admin notification placeholder for fact-checker application', {
      applicationId: application.id,
      userId: application.user_id
    });
  }

  async notifyUserAboutApproval(userId, requestType) {
    const user = await User.findById(userId);
    
    let subject, message;
    if (requestType === 'fact_checker') {
      subject = 'Fact-Checker Application Approved';
      message = 'Your fact-checker application has been approved. You can now start verifying claims.';
    } else {
      subject = 'Registration Approved';
      message = 'Your account registration has been approved. You can now access all features.';
    }

    await emailService.sendNotificationEmail(user.email, subject, message);
  }

  async notifyUserAboutRejection(userId, requestType, reason) {
    const user = await User.findById(userId);
    
    let subject, message;
    if (requestType === 'fact_checker') {
      subject = 'Fact-Checker Application Decision';
      message = `Your fact-checker application has been reviewed. Unfortunately, it was not approved at this time.`;
    } else {
      subject = 'Registration Decision';
      message = `Your account registration has been reviewed. Unfortunately, it was not approved at this time.`;
    }

    if (reason) {
      message += ` Reason: ${reason}`;
    }

    await emailService.sendNotificationEmail(user.email, subject, message);
  }

  async getRegistrationStatistics(timeframe = '30 days') {
    try {
      const stats = await RegistrationRequest.getStatistics(timeframe);

      return {
        timeframe,
        total_requests: stats.total,
        approved: stats.approved,
        rejected: stats.rejected,
        pending: stats.pending,
        approval_rate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0,
        average_processing_time: stats.average_processing_time
      };

    } catch (error) {
      logger.error('Registration statistics retrieval failed:', error);
      throw error;
    }
  }

  async cleanupOldRegistrationData(retentionDays = 90) {
    try {
      const deletedCount = await RegistrationRequest.cleanupOldRequests(retentionDays);
      
      logger.info('Old registration data cleaned up', {
        retentionDays,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Registration data cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = new RegistrationService();