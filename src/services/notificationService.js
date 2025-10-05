const Notification = require('../models/Notification');
const User = require('../models/User');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class NotificationService {
  async createNotification(notificationData) {
    try {
      const {
        user_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        priority = 'medium'
      } = notificationData;

      // Create notification
      const notification = await Notification.create({
        user_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        priority
      });

      // Send email notification if user has email notifications enabled
      await this.maybeSendEmailNotification(notification);

      // Send push notification if configured
      await this.maybeSendPushNotification(notification);

      logger.debug('Notification created successfully', {
        notificationId: notification.id,
        userId: user_id,
        type
      });

      return notification;

    } catch (error) {
      logger.error('Notification creation failed:', error);
      throw error;
    }
  }

  async createBatchNotifications(notificationsData) {
    try {
      const createdNotifications = await Notification.createBatch(notificationsData);

      // Process email notifications in background
      this.processBatchEmailNotifications(createdNotifications).catch(error => {
        logger.error('Batch email notification processing failed:', error);
      });

      logger.info('Batch notifications created', {
        count: createdNotifications.length,
        types: [...new Set(createdNotifications.map(n => n.type))]
      });

      return createdNotifications;

    } catch (error) {
      logger.error('Batch notification creation failed:', error);
      throw error;
    }
  }

  async getUserNotifications(userId, filters = {}) {
    try {
      const { unread, type, page = 1, limit = 20 } = filters;
      const offset = (page - 1) * limit;

      let notifications;
      let total;

      if (unread) {
        notifications = await Notification.findUnreadByUserId(userId, limit, offset, type);
        total = await Notification.countUnreadByUserId(userId, type);
      } else {
        notifications = await Notification.findByUserId(userId, limit, offset, type);
        total = await Notification.countByUserId(userId, type);
      }

      return {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unread_count: await Notification.getUnreadCount(userId)
      };

    } catch (error) {
      logger.error('User notifications retrieval failed:', error);
      throw error;
    }
  }

  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      if (notification.user_id !== userId) {
        throw new Error('Not authorized to modify this notification');
      }

      const updatedNotification = await Notification.markAsRead(notificationId);

      logger.debug('Notification marked as read', { notificationId, userId });

      return updatedNotification;

    } catch (error) {
      logger.error('Mark as read failed:', error);
      throw error;
    }
  }

  async markAllAsRead(userId, type = null) {
    try {
      const updatedCount = await Notification.markAllAsRead(userId, type);

      logger.info('All notifications marked as read', {
        userId,
        type,
        updatedCount
      });

      return updatedCount;

    } catch (error) {
      logger.error('Mark all as read failed:', error);
      throw error;
    }
  }

  async getNotificationPreferences(userId) {
    try {
      // This would typically come from a user preferences table
      // For now, return default preferences
      const defaultPreferences = {
        verdict_ready: true,
        claim_assigned: true,
        system_alert: true,
        blog_published: true,
        trending_topic: true,
        email_notifications: true,
        push_notifications: true,
        frequency: 'instant' // instant, daily_digest, weekly_digest
      };

      // You would merge with user-specific preferences here
      return defaultPreferences;

    } catch (error) {
      logger.error('Notification preferences retrieval failed:', error);
      throw error;
    }
  }

  async updateNotificationPreferences(userId, preferences) {
    try {
      // Validate preferences
      this.validateNotificationPreferences(preferences);

      // This would typically update a user preferences table
      // For now, just log the update
      logger.info('Notification preferences updated', { userId, preferences });

      return {
        success: true,
        message: 'Notification preferences updated successfully'
      };

    } catch (error) {
      logger.error('Notification preferences update failed:', error);
      throw error;
    }
  }

  async sendVerdictReadyNotification(claim, verdict) {
    try {
      const notification = await this.createNotification({
        user_id: claim.user_id,
        type: 'verdict_ready',
        title: 'Claim Verification Complete',
        message: `Your claim "${claim.title}" has been verified. Verdict: ${verdict.verdict}`,
        related_entity_type: 'claim',
        related_entity_id: claim.id,
        priority: 'high'
      });

      return notification;

    } catch (error) {
      logger.error('Verdict ready notification failed:', error);
      throw error;
    }
  }

  async sendClaimAssignedNotification(factCheckerId, claim) {
    try {
      const notification = await this.createNotification({
        user_id: factCheckerId,
        type: 'claim_assigned',
        title: 'New Claim Assigned',
        message: `You have been assigned a new claim to verify: "${claim.title}"`,
        related_entity_type: 'claim',
        related_entity_id: claim.id,
        priority: 'medium'
      });

      return notification;

    } catch (error) {
      logger.error('Claim assigned notification failed:', error);
      throw error;
    }
  }

  async sendSystemAlertNotification(userIds, title, message, priority = 'medium') {
    try {
      const notificationsData = userIds.map(user_id => ({
        user_id,
        type: 'system_alert',
        title,
        message,
        related_entity_type: 'system',
        priority
      }));

      const notifications = await this.createBatchNotifications(notificationsData);

      return notifications;

    } catch (error) {
      logger.error('System alert notification failed:', error);
      throw error;
    }
  }

  async maybeSendEmailNotification(notification) {
    try {
      const preferences = await this.getNotificationPreferences(notification.user_id);
      
      if (!preferences.email_notifications) {
        return;
      }

      // Check if this notification type should trigger email
      const emailEnabledTypes = ['verdict_ready', 'system_alert', 'claim_assigned'];
      if (!emailEnabledTypes.includes(notification.type)) {
        return;
      }

      // Get user email
      const user = await User.findById(notification.user_id);
      if (!user || !user.email) {
        return;
      }

      // Send email
      await emailService.sendNotificationEmail(
        user.email,
        notification.title,
        notification.message,
        this.getNotificationContext(notification)
      );

      logger.debug('Email notification sent', {
        notificationId: notification.id,
        userId: notification.user_id,
        email: user.email
      });

    } catch (error) {
      logger.error('Email notification failed:', error);
      // Don't throw error to avoid affecting main notification flow
    }
  }

  async maybeSendPushNotification(notification) {
    try {
      const preferences = await this.getNotificationPreferences(notification.user_id);
      
      if (!preferences.push_notifications) {
        return;
      }

      // This would integrate with a push notification service (FCM, APNS)
      // Placeholder implementation
      logger.debug('Push notification placeholder', {
        notificationId: notification.id,
        userId: notification.user_id,
        type: notification.type
      });

    } catch (error) {
      logger.error('Push notification failed:', error);
      // Don't throw error to avoid affecting main notification flow
    }
  }

  async processBatchEmailNotifications(notifications) {
    try {
      // Group notifications by user for digest emails
      const notificationsByUser = this.groupNotificationsByUser(notifications);

      for (const [userId, userNotifications] of Object.entries(notificationsByUser)) {
        const preferences = await this.getNotificationPreferences(userId);
        
        if (preferences.frequency === 'instant') {
          // Send individual emails
          for (const notification of userNotifications) {
            await this.maybeSendEmailNotification(notification);
          }
        } else {
          // Schedule digest email
          await this.scheduleDigestEmail(userId, userNotifications, preferences.frequency);
        }
      }

    } catch (error) {
      logger.error('Batch email notification processing failed:', error);
      throw error;
    }
  }

  groupNotificationsByUser(notifications) {
    return notifications.reduce((groups, notification) => {
      if (!groups[notification.user_id]) {
        groups[notification.user_id] = [];
      }
      groups[notification.user_id].push(notification);
      return groups;
    }, {});
  }

  async scheduleDigestEmail(userId, notifications, frequency) {
    try {
      // This would schedule a digest email based on the frequency
      // For now, just log the intention
      logger.debug('Digest email scheduled', {
        userId,
        notificationCount: notifications.length,
        frequency
      });

    } catch (error) {
      logger.error('Digest email scheduling failed:', error);
    }
  }

  getNotificationContext(notification) {
    // Provide context for email templates
    const contexts = {
      verdict_ready: {
        subject: 'Your Claim Has Been Verified',
        template: 'verdict_notification'
      },
      claim_assigned: {
        subject: 'New Claim Assigned',
        template: 'claim_assigned'
      },
      system_alert: {
        subject: 'System Alert',
        template: 'system_alert'
      },
      blog_published: {
        subject: 'New Blog Published',
        template: 'blog_published'
      }
    };

    return contexts[notification.type] || {
      subject: notification.title,
      template: 'general_notification'
    };
  }

  validateNotificationPreferences(preferences) {
    const validKeys = [
      'verdict_ready', 'claim_assigned', 'system_alert', 'blog_published',
      'trending_topic', 'email_notifications', 'push_notifications', 'frequency'
    ];

    const validFrequencies = ['instant', 'daily_digest', 'weekly_digest'];

    for (const key of Object.keys(preferences)) {
      if (!validKeys.includes(key)) {
        throw new Error(`Invalid preference key: ${key}`);
      }
    }

    if (preferences.frequency && !validFrequencies.includes(preferences.frequency)) {
      throw new Error(`Invalid frequency: ${preferences.frequency}`);
    }

    // Validate boolean values
    for (const key of validKeys.filter(k => k !== 'frequency')) {
      if (preferences[key] !== undefined && typeof preferences[key] !== 'boolean') {
        throw new Error(`Preference ${key} must be boolean`);
      }
    }
  }

  async cleanupOldNotifications(retentionDays = 90) {
    try {
      const deletedCount = await Notification.cleanupOld(retentionDays);
      
      logger.info('Old notifications cleaned up', {
        retentionDays,
        deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Notification cleanup failed:', error);
      throw error;
    }
  }

  async getNotificationStatistics(timeframe = '30 days') {
    try {
      const stats = await Notification.getStatistics(timeframe);

      return {
        total_notifications: stats.total,
        by_type: stats.by_type,
        delivery_rate: stats.delivery_rate,
        engagement_rate: stats.engagement_rate,
        timeframe
      };

    } catch (error) {
      logger.error('Notification statistics retrieval failed:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();