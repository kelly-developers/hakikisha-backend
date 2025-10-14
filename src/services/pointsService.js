const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Points awarded for different actions
 */
const POINTS = {
  CLAIM_SUBMISSION: 10,
  CLAIM_VERIFIED: 20,
  DAILY_LOGIN: 5,
  SHARE_CLAIM: 3,
  REPORT_MISINFORMATION: 15,
  COMPLETE_PROFILE: 25,
  FIRST_CLAIM: 50,
  STREAK_BONUS_3_DAYS: 10,
  STREAK_BONUS_7_DAYS: 25,
  STREAK_BONUS_30_DAYS: 100
};

class PointsService {
  /**
   * Initialize points record for new user
   */
  static async initializeUserPoints(userId) {
    try {
      await db.query(
        `INSERT INTO user_points (user_id, total_points, current_streak_days, last_activity_date, created_at)
         VALUES ($1, 0, 0, CURRENT_DATE, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      logger.info(`Points initialized for user: ${userId}`);
    } catch (error) {
      logger.error('Error initializing user points:', error);
      throw error;
    }
  }

  /**
   * Award points to user and update their record
   */
  static async awardPoints(userId, points, actionType, description = '') {
    try {
      // Get current user points record
      const userPointsResult = await db.query(
        'SELECT * FROM user_points WHERE user_id = $1',
        [userId]
      );

      let userPoints = userPointsResult.rows[0];

      // Initialize if doesn't exist
      if (!userPoints) {
        await this.initializeUserPoints(userId);
        userPoints = {
          user_id: userId,
          total_points: 0,
          current_streak_days: 0,
          longest_streak_days: 0,
          last_activity_date: null
        };
      }

      const today = new Date().toISOString().split('T')[0];
      const lastActivityDate = userPoints.last_activity_date 
        ? new Date(userPoints.last_activity_date).toISOString().split('T')[0]
        : null;

      let newStreak = userPoints.current_streak_days || 0;
      let shouldResetPoints = false;

      // Check if user skipped a day
      if (lastActivityDate) {
        const lastDate = new Date(lastActivityDate);
        const todayDate = new Date(today);
        const daysDifference = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        if (daysDifference === 1) {
          // Consecutive day - increment streak
          newStreak += 1;
        } else if (daysDifference > 1) {
          // Skipped day(s) - reset points and streak
          shouldResetPoints = true;
          newStreak = 1;
          logger.info(`User ${userId} skipped ${daysDifference - 1} day(s). Points reset.`);
        }
        // If daysDifference === 0, same day, don't change streak
      } else {
        // First activity
        newStreak = 1;
      }

      // Award streak bonuses
      let streakBonus = 0;
      if (newStreak === 3) streakBonus = POINTS.STREAK_BONUS_3_DAYS;
      if (newStreak === 7) streakBonus = POINTS.STREAK_BONUS_7_DAYS;
      if (newStreak === 30) streakBonus = POINTS.STREAK_BONUS_30_DAYS;

      const totalPointsAwarded = shouldResetPoints ? points : points + streakBonus;
      const newTotalPoints = shouldResetPoints ? totalPointsAwarded : (userPoints.total_points + totalPointsAwarded);
      const longestStreak = Math.max(newStreak, userPoints.longest_streak_days || 0);

      // Update user points
      await db.query(
        `UPDATE user_points
         SET total_points = $1,
             current_streak_days = $2,
             longest_streak_days = $3,
             last_activity_date = CURRENT_DATE,
             updated_at = NOW()
         WHERE user_id = $4`,
        [newTotalPoints, newStreak, longestStreak, userId]
      );

      // Record points history
      await db.query(
        `INSERT INTO points_history (user_id, points_awarded, action_type, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, totalPointsAwarded, actionType, description]
      );

      if (shouldResetPoints) {
        await db.query(
          `INSERT INTO points_history (user_id, points_awarded, action_type, description, created_at)
           VALUES ($1, $2, 'POINTS_RESET', 'Points reset due to inactivity', NOW())`,
          [userId, -userPoints.total_points]
        );
      }

      logger.info(`Awarded ${totalPointsAwarded} points to user ${userId} for ${actionType}`);

      return {
        pointsAwarded: totalPointsAwarded,
        totalPoints: newTotalPoints,
        currentStreak: newStreak,
        longestStreak,
        streakBonus,
        wasReset: shouldResetPoints
      };
    } catch (error) {
      logger.error('Error awarding points:', error);
      throw error;
    }
  }

  /**
   * Get user's current points and streaks
   */
  static async getUserPoints(userId) {
    try {
      const result = await db.query(
        `SELECT total_points, current_streak_days, longest_streak_days, last_activity_date
         FROM user_points WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        await this.initializeUserPoints(userId);
        return {
          total_points: 0,
          current_streak_days: 0,
          longest_streak_days: 0,
          last_activity_date: null
        };
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting user points:', error);
      throw error;
    }
  }

  /**
   * Get user's points history
   */
  static async getPointsHistory(userId, limit = 50) {
    try {
      const result = await db.query(
        `SELECT points_awarded, action_type, description, created_at
         FROM points_history
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting points history:', error);
      throw error;
    }
  }

  /**
   * Check and reset points for users who haven't been active
   * This should run daily via cron job
   */
  static async checkAndResetInactiveUsers() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Find users who were active yesterday but not today
      const result = await db.query(
        `UPDATE user_points
         SET total_points = 0,
             current_streak_days = 0,
             points_reset_date = CURRENT_DATE,
             updated_at = NOW()
         WHERE last_activity_date < $1 AND total_points > 0
         RETURNING user_id, total_points`,
        [yesterdayStr]
      );

      // Log resets
      for (const user of result.rows) {
        await db.query(
          `INSERT INTO points_history (user_id, points_awarded, action_type, description, created_at)
           VALUES ($1, $2, 'AUTO_RESET', 'Automatic reset due to 24h inactivity', NOW())`,
          [user.user_id, -user.total_points]
        );
      }

      logger.info(`Reset points for ${result.rows.length} inactive users`);
      return result.rows.length;
    } catch (error) {
      logger.error('Error checking inactive users:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard (top users by points)
   */
  static async getLeaderboard(limit = 100) {
    try {
      const result = await db.query(
        `SELECT u.id, u.email, up.total_points, up.current_streak_days, up.longest_streak_days
         FROM user_points up
         JOIN users u ON up.user_id = u.id
         WHERE u.role = 'user'
         ORDER BY up.total_points DESC, up.current_streak_days DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting leaderboard:', error);
      throw error;
    }
  }
}

module.exports = { PointsService, POINTS };
