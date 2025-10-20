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
  STREAK_BONUS_30_DAYS: 100,
  COMMENT_ON_BLOG: 8,
  LIKE_BLOG: 2,
  SHARE_BLOG: 5,
  READ_BLOG_ARTICLE: 3,
  VERDICT_RECEIVED: 15
};

class PointsService {
  /**
   * Initialize points record for new user
   */
  static async initializeUserPoints(userId) {
    try {
      await db.query(
        `INSERT INTO hakikisha.user_points (user_id, total_points, current_streak_days, last_activity_date, created_at)
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
   * Award points to user and update their record with streak management
   */
  static async awardPoints(userId, points, actionType, description = '') {
    try {
      // Don't award points for actions that don't involve engagement
      if (this.shouldSkipPointsAward(actionType)) {
        logger.info(`Skipping points award for action: ${actionType}`);
        return {
          pointsAwarded: 0,
          totalPoints: 0,
          currentStreak: 0,
          wasReset: false,
          message: 'No points awarded for this action type'
        };
      }

      // Get current user points record
      const userPointsResult = await db.query(
        'SELECT * FROM hakikisha.user_points WHERE user_id = $1',
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

      // Check streak logic
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

      // Award streak bonuses only for consecutive days
      let streakBonus = 0;
      if (!shouldResetPoints && newStreak > 1) {
        if (newStreak === 3) streakBonus = POINTS.STREAK_BONUS_3_DAYS;
        if (newStreak === 7) streakBonus = POINTS.STREAK_BONUS_7_DAYS;
        if (newStreak === 30) streakBonus = POINTS.STREAK_BONUS_30_DAYS;
      }

      const totalPointsAwarded = shouldResetPoints ? points : points + streakBonus;
      const newTotalPoints = shouldResetPoints ? totalPointsAwarded : (userPoints.total_points + totalPointsAwarded);
      const longestStreak = Math.max(newStreak, userPoints.longest_streak_days || 0);

      // Update user points
      await db.query(
        `UPDATE hakikisha.user_points
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
        `INSERT INTO hakikisha.points_history (user_id, points_awarded, action_type, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, totalPointsAwarded, actionType, description]
      );

      // If points were reset, log the reset
      if (shouldResetPoints && userPoints.total_points > 0) {
        await db.query(
          `INSERT INTO hakikisha.points_history (user_id, points_awarded, action_type, description, created_at)
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
   * Determine if points should be skipped for certain actions
   */
  static shouldSkipPointsAward(actionType) {
    const skipActions = [
      'LOGIN_ONLY', // User logged in but did nothing
      'PASSIVE_ACTION', // Any passive action that doesn't involve engagement
      'PROFILE_VIEW' // Just viewing profile
    ];
    
    return skipActions.includes(actionType);
  }

  /**
   * Get user's current points and streaks
   */
  static async getUserPoints(userId) {
    try {
      const result = await db.query(
        `SELECT total_points, current_streak_days, longest_streak_days, last_activity_date
         FROM hakikisha.user_points WHERE user_id = $1`,
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
         FROM hakikisha.points_history
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

      // Find users who were active before yesterday but not today
      const result = await db.query(
        `UPDATE hakikisha.user_points
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
          `INSERT INTO hakikisha.points_history (user_id, points_awarded, action_type, description, created_at)
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
        `SELECT u.id, u.email, u.username, up.total_points, up.current_streak_days, up.longest_streak_days
         FROM hakikisha.user_points up
         JOIN hakikisha.users u ON up.user_id = u.id
         WHERE u.role = 'user' AND u.status = 'active'
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

  /**
   * Award points for specific engagement actions
   */
  static async awardPointsForClaimSubmission(userId, claimId) {
    return await this.awardPoints(
      userId, 
      POINTS.CLAIM_SUBMISSION, 
      'CLAIM_SUBMISSION', 
      `Submitted claim: ${claimId}`
    );
  }

  static async awardPointsForClaimVerified(userId, claimId) {
    return await this.awardPoints(
      userId, 
      POINTS.CLAIM_VERIFIED, 
      'CLAIM_VERIFIED', 
      `Claim verified: ${claimId}`
    );
  }

  static async awardPointsForDailyLogin(userId) {
    // Only award login points if user actually engages with content
    // This should be called when user performs an action after login
    return await this.awardPoints(
      userId, 
      POINTS.DAILY_LOGIN, 
      'DAILY_LOGIN', 
      'Daily login engagement'
    );
  }

  static async awardPointsForBlogComment(userId, blogId) {
    return await this.awardPoints(
      userId, 
      POINTS.COMMENT_ON_BLOG, 
      'BLOG_COMMENT', 
      `Commented on blog: ${blogId}`
    );
  }

  static async awardPointsForBlogLike(userId, blogId) {
    return await this.awardPoints(
      userId, 
      POINTS.LIKE_BLOG, 
      'BLOG_LIKE', 
      `Liked blog: ${blogId}`
    );
  }

  static async awardPointsForBlogShare(userId, blogId) {
    return await this.awardPoints(
      userId, 
      POINTS.SHARE_BLOG, 
      'BLOG_SHARE', 
      `Shared blog: ${blogId}`
    );
  }

  static async awardPointsForBlogRead(userId, blogId) {
    return await this.awardPoints(
      userId, 
      POINTS.READ_BLOG_ARTICLE, 
      'BLOG_READ', 
      `Read blog article: ${blogId}`
    );
  }

  static async awardPointsForVerdictReceived(userId, claimId) {
    return await this.awardPoints(
      userId, 
      POINTS.VERDICT_RECEIVED, 
      'VERDICT_RECEIVED', 
      `Received verdict for claim: ${claimId}`
    );
  }

  /**
   * Reset user points (admin function)
   */
  static async resetUserPoints(userId, reason = 'Admin reset') {
    try {
      await db.query(
        `UPDATE hakikisha.user_points
         SET total_points = 0,
             current_streak_days = 0,
             points_reset_date = CURRENT_DATE,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      await db.query(
        `INSERT INTO hakikisha.points_history (user_id, points_awarded, action_type, description, created_at)
         VALUES ($1, $2, 'MANUAL_RESET', $3, NOW())`,
        [userId, 0, reason]
      );

      logger.info(`Manually reset points for user: ${userId}`);
      
      return { success: true, message: 'User points reset successfully' };
    } catch (error) {
      logger.error('Error resetting user points:', error);
      throw error;
    }
  }

  /**
   * Get user's rank based on points
   */
  static async getUserRank(userId) {
    try {
      const result = await db.query(
        `SELECT position FROM (
          SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_points DESC, current_streak_days DESC) as position
          FROM hakikisha.user_points
          JOIN hakikisha.users ON user_points.user_id = users.id
          WHERE users.role = 'user' AND users.status = 'active'
        ) ranked_users
        WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0] ? result.rows[0].position : null;
    } catch (error) {
      logger.error('Error getting user rank:', error);
      throw error;
    }
  }

  /**
   * Get points statistics for dashboard
   */
  static async getPointsStatistics() {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(total_points) as total_points_awarded,
          AVG(total_points) as average_points,
          MAX(total_points) as max_points,
          COUNT(CASE WHEN current_streak_days >= 7 THEN 1 END) as users_with_7_day_streak,
          COUNT(CASE WHEN current_streak_days >= 30 THEN 1 END) as users_with_30_day_streak
        FROM hakikisha.user_points
        JOIN hakikisha.users ON user_points.user_id = users.id
        WHERE users.role = 'user' AND users.status = 'active'
      `);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting points statistics:', error);
      throw error;
    }
  }
}

module.exports = { PointsService, POINTS };