const User = require('../models/User');
const Claim = require('../models/Claim');
const Notification = require('../models/Notification');
const UserSession = require('../models/UserSession');
const authService = require('./authService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class UserService {
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive information
      const { password_hash, verification_token, ...userProfile } = user;

      // Get additional profile statistics
      const stats = await this.getUserStatistics(userId);

      return {
        user: userProfile,
        statistics: stats,
        preferences: await this.getUserPreferences(userId)
      };

    } catch (error) {
      logger.error('User profile retrieval failed:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, updates) {
    try {
      const allowedUpdates = ['phone', 'profile_picture', 'notification_preferences'];
      const filteredUpdates = {};

      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const updatedUser = await User.update(userId, filteredUpdates);

      // Remove sensitive information
      const { password_hash, verification_token, ...userProfile } = updatedUser;

      logger.info('User profile updated', { userId, updatedFields: Object.keys(filteredUpdates) });

      return {
        success: true,
        user: userProfile,
        message: 'Profile updated successfully'
      };

    } catch (error) {
      logger.error('User profile update failed:', error);
      throw error;
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Verify current password
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const validPassword = await authService.verifyPassword(currentPassword, user.password_hash);
      if (!validPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash new password
      const newPasswordHash = await authService.hashPassword(newPassword);

      // Update password
      await User.updatePassword(userId, newPasswordHash);

      // Invalidate all existing sessions (except current one if possible)
      await UserSession.invalidateAllUserSessions(userId);

      logger.info('Password changed successfully', { userId });

      return {
        success: true,
        message: 'Password changed successfully'
      };

    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  async getUserStatistics(userId) {
    try {
      const [
        claimsSubmitted,
        verdictsReceived,
        notificationsUnread,
        activeSessions
      ] = await Promise.all([
        Claim.countByUser(userId),
        this.getVerdictsReceivedCount(userId),
        Notification.getUnreadCount(userId),
        UserSession.getActiveSessions(userId)
      ]);

      return {
        claims_submitted: claimsSubmitted,
        verdicts_received: verdictsReceived,
        unread_notifications: notificationsUnread,
        active_sessions: activeSessions.length,
        account_created: await this.getAccountAge(userId)
      };

    } catch (error) {
      logger.error('User statistics retrieval failed:', error);
      throw error;
    }
  }

  async getAccountAge(userId) {
    const user = await User.findById(userId);
    if (!user || !user.created_at) return 'Unknown';

    const created = new Date(user.created_at);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} days`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
  }

  async getVerdictsReceivedCount(userId) {
    // This would count verdicts for claims submitted by the user
    // Placeholder implementation
    const claims = await Claim.findByUser(userId);
    return claims.filter(claim => claim.status === 'human_approved').length;
  }

  async getUserPreferences(userId) {
    try {
      // This would typically come from a user preferences table
      // For now, return default preferences
      const defaultPreferences = {
        notifications: {
          email: true,
          push: true,
          verdict_ready: true,
          claim_assigned: true,
          system_alerts: true
        },
        privacy: {
          profile_public: false,
          show_activity: true
        },
        language: 'en',
        timezone: 'UTC'
      };

      // You would merge with user-specific preferences here
      return defaultPreferences;

    } catch (error) {
      logger.error('User preferences retrieval failed:', error);
      return {};
    }
  }

  async updateUserPreferences(userId, preferences) {
    try {
      // Validate preferences structure
      this.validatePreferences(preferences);

      // This would update a user preferences table
      // For now, just update the user record with a preferences JSON field
      await User.update(userId, {
        preferences: JSON.stringify(preferences)
      });

      logger.info('User preferences updated', { userId });

      return {
        success: true,
        message: 'Preferences updated successfully',
        preferences: preferences
      };

    } catch (error) {
      logger.error('User preferences update failed:', error);
      throw error;
    }
  }

  async getActiveSessions(userId) {
    try {
      const sessions = await UserSession.getActiveSessions(userId);

      return sessions.map(session => ({
        id: session.id,
        login_time: session.login_time,
        last_activity: session.last_activity,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        duration: session.duration
      }));

    } catch (error) {
      logger.error('Active sessions retrieval failed:', error);
      throw error;
    }
  }

  async terminateSession(userId, sessionId) {
    try {
      const session = await UserSession.findById(sessionId);
      if (!session || session.user_id !== userId) {
        throw new Error('Session not found or access denied');
      }

      await UserSession.invalidateSession(sessionId);

      logger.info('User session terminated', { userId, sessionId });

      return {
        success: true,
        message: 'Session terminated successfully'
      };

    } catch (error) {
      logger.error('Session termination failed:', error);
      throw error;
    }
  }

  async terminateAllSessions(userId, exceptSessionId = null) {
    try {
      const terminatedCount = await UserSession.invalidateAllUserSessions(userId, exceptSessionId);

      logger.info('All user sessions terminated', { userId, terminatedCount });

      return {
        success: true,
        message: `Terminated ${terminatedCount} sessions`,
        terminated_count: terminatedCount
      };

    } catch (error) {
      logger.error('Session termination failed:', error);
      throw error;
    }
  }

  async deactivateAccount(userId, reason = '') {
    try {
      // In a real implementation, you might want to soft delete or anonymize data
      // For now, we'll mark the account as inactive
      await User.update(userId, {
        is_active: false,
        deactivated_at: new Date(),
        deactivation_reason: reason
      });

      // Terminate all active sessions
      await UserSession.invalidateAllUserSessions(userId);

      logger.warn('User account deactivated', { userId, reason });

      return {
        success: true,
        message: 'Account deactivated successfully'
      };

    } catch (error) {
      logger.error('Account deactivation failed:', error);
      throw error;
    }
  }

  async exportUserData(userId) {
    try {
      const [
        userProfile,
        userClaims,
        userNotifications,
        userSessions
      ] = await Promise.all([
        this.getUserProfile(userId),
        Claim.findByUser(userId, null, 1000, 0), // Get all claims
        Notification.findByUserId(userId, 1000, 0), // Get all notifications
        UserSession.getUserSessions(userId, 1000, 0) // Get session history
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_profile: userProfile,
        claims_submitted: userClaims,
        notifications: userNotifications,
        session_history: userSessions
      };

      return exportData;

    } catch (error) {
      logger.error('User data export failed:', error);
      throw error;
    }
  }

  validatePassword(password) {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain uppercase, lowercase, number, and special character');
    }
  }

  validatePreferences(preferences) {
    const validStructure = {
      notifications: {
        email: 'boolean',
        push: 'boolean',
        verdict_ready: 'boolean',
        claim_assigned: 'boolean',
        system_alerts: 'boolean'
      },
      privacy: {
        profile_public: 'boolean',
        show_activity: 'boolean'
      },
      language: 'string',
      timezone: 'string'
    };

    // Basic validation - in production, use a proper validation library
    for (const [category, fields] of Object.entries(validStructure)) {
      if (!preferences[category]) {
        throw new Error(`Missing preferences category: ${category}`);
      }

      for (const [field, type] of Object.entries(fields)) {
        if (preferences[category][field] !== undefined) {
          if (typeof preferences[category][field] !== type) {
            throw new Error(`Invalid type for ${category}.${field}. Expected ${type}`);
          }
        }
      }
    }
  }

  async searchUsers(searchParams) {
    try {
      const { query, role, is_verified, is_active, page = 1, limit = 20 } = searchParams;
      const offset = (page - 1) * limit;

      // This would be a proper user search implementation
      // For now, return placeholder
      const users = await User.searchUsers({
        query,
        role,
        is_verified,
        is_active,
        limit,
        offset
      });

      const total = await User.countUsers({
        query,
        role,
        is_verified,
        is_active
      });

      return {
        users: users.map(user => {
          const { password_hash, verification_token, ...safeUser } = user;
          return safeUser;
        }),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      logger.error('User search failed:', error);
      throw error;
    }
  }

  async getUserActivity(userId, timeframe = '30 days') {
    try {
      // This would get user activity from an analytics system
      // Placeholder implementation
      return {
        timeframe,
        claims_submitted: await Claim.countByUser(userId, timeframe),
        verdicts_received: await this.getVerdictsReceivedCount(userId, timeframe),
        sessions: await UserSession.getSessionsInTimeframe(userId, timeframe),
        last_active: await this.getLastActiveTime(userId)
      };

    } catch (error) {
      logger.error('User activity retrieval failed:', error);
      throw error;
    }
  }

  async getLastActiveTime(userId) {
    const sessions = await UserSession.getActiveSessions(userId);
    if (sessions.length === 0) return null;

    return Math.max(...sessions.map(s => new Date(s.last_activity || s.login_time)));
  }

  async cleanupInactiveUsers(inactiveDays = 365) {
    try {
      // This would find and deactivate users who haven't been active for a long time
      const inactiveUsers = await User.findInactiveUsers(inactiveDays);
      
      const results = await Promise.allSettled(
        inactiveUsers.map(user => 
          this.deactivateAccount(user.id, `Inactive for more than ${inactiveDays} days`)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;

      logger.info('Inactive users cleanup completed', {
        total_inactive: inactiveUsers.length,
        deactivated: successful,
        failed: results.length - successful
      });

      return {
        total_inactive: inactiveUsers.length,
        deactivated: successful,
        failed: results.length - successful
      };

    } catch (error) {
      logger.error('Inactive users cleanup failed:', error);
      throw error;
    }
  }
}

module.exports = new UserService();