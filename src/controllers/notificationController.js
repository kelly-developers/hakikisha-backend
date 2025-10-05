const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const Constants = require('../config/constants');

class NotificationController {
  async getUserNotifications(req, res, next) {
    try {
      const { unread, type, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let notifications;
      let total;

      if (unread === 'true') {
        notifications = await Notification.findUnreadByUserId(req.user.userId, limit, offset, type);
        total = await Notification.countUnreadByUserId(req.user.userId, type);
      } else {
        notifications = await Notification.findByUserId(req.user.userId, limit, offset, type);
        total = await Notification.countByUserId(req.user.userId, type);
      }

      res.json({
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      logger.error('Get user notifications error:', error);
      next(error);
    }
  }

  async getNotification(req, res, next) {
    try {
      const { id } = req.params;

      const notification = await Notification.findById(id);
      if (!notification) {
        return res.status(404).json({ error: Constants.ERROR_MESSAGES.NOT_FOUND });
      }

      // Verify ownership
      if (notification.user_id !== req.user.userId) {
        return res.status(403).json({ error: Constants.ERROR_MESSAGES.FORBIDDEN });
      }

      res.json({
        notification
      });

    } catch (error) {
      logger.error('Get notification error:', error);
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;

      const notification = await Notification.markAsRead(id);
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      // Verify ownership
      if (notification.user_id !== req.user.userId) {
        return res.status(403).json({ error: Constants.ERROR_MESSAGES.FORBIDDEN });
      }

      res.json({
        message: 'Notification marked as read',
        notification
      });

    } catch (error) {
      logger.error('Mark notification as read error:', error);
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      const { type } = req.body;

      const updatedCount = await Notification.markAllAsRead(req.user.userId, type);

      res.json({
        message: `Marked ${updatedCount} notifications as read`,
        updated_count: updatedCount
      });

    } catch (error) {
      logger.error('Mark all notifications as read error:', error);
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const { type } = req.query;

      const unreadCount = await Notification.getUnreadCount(req.user.userId, type);

      res.json({
        unread_count: unreadCount
      });

    } catch (error) {
      logger.error('Get unread notification count error:', error);
      next(error);
    }
  }

  async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;

      const notification = await Notification.findById(id);
      if (!notification) {
        return res.status(404).json({ error: Constants.ERROR_MESSAGES.NOT_FOUND });
      }

      // Verify ownership
      if (notification.user_id !== req.user.userId) {
        return res.status(403).json({ error: Constants.ERROR_MESSAGES.FORBIDDEN });
      }

      await Notification.delete(id);

      res.json({
        message: 'Notification deleted successfully'
      });

    } catch (error) {
      logger.error('Delete notification error:', error);
      next(error);
    }
  }

  async clearAllNotifications(req, res, next) {
    try {
      const { type } = req.body;

      const deletedCount = await Notification.clearAllByUserId(req.user.userId, type);

      res.json({
        message: `Cleared ${deletedCount} notifications`,
        deleted_count: deletedCount
      });

    } catch (error) {
      logger.error('Clear all notifications error:', error);
      next(error);
    }
  }

  async getNotificationPreferences(req, res, next) {
    try {
      const user = await User.findById(req.user.userId);
      const preferences = await Notification.getUserPreferences(req.user.userId);

      res.json({
        preferences: preferences || this.getDefaultPreferences(),
        email: user.email,
        push_enabled: true // This would come from a separate configuration
      });

    } catch (error) {
      logger.error('Get notification preferences error:', error);
      next(error);
    }
  }

  async updateNotificationPreferences(req, res, next) {
    try {
      const { preferences } = req.body;

      if (!preferences || typeof preferences !== 'object') {
        return res.status(400).json({ error: 'Valid preferences object is required' });
      }

      await Notification.updateUserPreferences(req.user.userId, preferences);

      res.json({
        message: 'Notification preferences updated successfully',
        preferences
      });

    } catch (error) {
      logger.error('Update notification preferences error:', error);
      next(error);
    }
  }

  async createNotification(req, res, next) {
    try {
      // This endpoint is typically for admins to send system-wide notifications
      if (req.user.role !== Constants.ROLES.ADMIN) {
        return res.status(403).json({ error: Constants.ERROR_MESSAGES.FORBIDDEN });
      }

      const { user_ids, type, title, message, related_entity_type, related_entity_id } = req.body;

      if (!title || !message || !type) {
        return res.status(400).json({ error: 'Title, message, and type are required' });
      }

      const notifications = [];
      const batchSize = 100; // Process in batches to avoid overwhelming the system

      // If user_ids is provided, send to specific users, otherwise send to all users
      const targetUserIds = user_ids || await this.getAllUserIds();

      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize);
        const batchNotifications = batch.map(user_id => ({
          user_id,
          type,
          title,
          message,
          related_entity_type,
          related_entity_id
        }));

        const created = await Notification.createBatch(batchNotifications);
        notifications.push(...created);
      }

      logger.info(`Admin created ${notifications.length} notifications of type: ${type}`);

      res.status(201).json({
        message: `Notifications created successfully for ${notifications.length} users`,
        notifications_count: notifications.length,
        type
      });

    } catch (error) {
      logger.error('Create notification error:', error);
      next(error);
    }
  }

  async getAllUserIds() {
    // This would typically query the database for all active user IDs
    // For now, return an empty array as a placeholder
    return [];
  }

  getDefaultPreferences() {
    return {
      verdict_ready: true,
      claim_assigned: true,
      system_alert: true,
      blog_published: true,
      trending_topic: true,
      email_notifications: true,
      push_notifications: true
    };
  }
}

module.exports = new NotificationController();