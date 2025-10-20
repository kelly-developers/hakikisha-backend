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
  VERDICT_RECEIVED: 15,
  PROFILE_UPDATE: 5,
  PROFILE_PICTURE: 10,
  DAILY_ENGAGEMENT: 2
};

class PointsService {
  /**
   * Initialize points record for new user
   */
  static async initializeUserPoints(userId) {
    try {
      const result = await db.query(
        `INSERT INTO hakikisha.user_points (user_id, total_points, current_streak_days, longest_streak_days, last_activity_date, created_at)
         VALUES ($1, 0, 0, 0, CURRENT_DATE, NOW())
         ON CONFLICT (user_id) DO NOTHING
         RETURNING *`,
        [userId]
      );
      
      if (result.rows.length > 0) {
        logger.info(`Points initialized for user: ${userId}`);
      }
      
      return result.rows[0];
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
      console.log(`Awarding ${points} points to user ${userId} for ${actionType}`);

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
        userPoints = await this.initializeUserPoints(userId);
        if (!userPoints) {
          throw new Error('Failed to initialize user points');
        }
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
          console.log(`Streak continued: ${newStreak} days`);
        } else if (daysDifference > 1) {
          // Skipped day(s) - reset streak but keep points
          shouldResetPoints = true;
          newStreak = 1;
          console.log(`Streak broken after ${daysDifference - 1} day(s) gap. Reset to 1 day.`);
        } else if (daysDifference === 0) {
          // Same day - maintain current streak
          console.log(`Same day activity, streak remains: ${newStreak} days`);
        }
      } else {
        // First activity
        newStreak = 1;
        console.log(`First activity, streak started: ${newStreak} day`);
      }

      // Award streak bonuses only for consecutive days
      let streakBonus = 0;
      if (!shouldResetPoints && newStreak > 1) {
        if (newStreak === 3) {
          streakBonus = POINTS.STREAK_BONUS_3_DAYS;
          console.log(`3-day streak bonus: ${streakBonus} points`);
        } else if (newStreak === 7) {
          streakBonus = POINTS.STREAK_BONUS_7_DAYS;
          console.log(`7-day streak bonus: ${streakBonus} points`);
        } else if (newStreak === 30) {
          streakBonus = POINTS.STREAK_BONUS_30_DAYS;
          console.log(`30-day streak bonus: ${streakBonus} points`);
        }
      }

      const totalPointsAwarded = shouldResetPoints ? points : points + streakBonus;
      const newTotalPoints = shouldResetPoints ? points : (userPoints.total_points + totalPointsAwarded);
      const longestStreak = Math.max(newStreak, userPoints.longest_streak_days || 0);

      console.log(`Total points awarded: ${totalPointsAwarded} (base: ${points}, bonus: ${streakBonus})`);
      console.log(`New total points: ${newTotalPoints}, Streak: ${newStreak} days`);

      // Update user points
      const updateResult = await db.query(
        `UPDATE hakikisha.user_points
         SET total_points = $1,
             current_streak_days = $2,
             longest_streak_days = $3,
             last_activity_date = CURRENT_DATE,
             updated_at = NOW()
         WHERE user_id = $4
         RETURNING *`,
        [newTotalPoints, newStreak, longestStreak, userId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update user points');
      }

      // Record points history
      await db.query(
        `INSERT INTO hakikisha.points_history (user_id, points_awarded, action_type, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, totalPointsAwarded, actionType, description]
      );

      // If streak was reset, log the reset
      if (shouldResetPoints && userPoints.current_streak_days > 0) {
        await db.query(
          `INSERT INTO hakikisha.points_history (user_id, points_awarded, action_type, description, created_at)
           VALUES ($1, $2, 'STREAK_RESET', 'Streak reset after inactivity', NOW())`,
          [userId, -userPoints.current_streak_days]
        );
      }

      logger.info(`Awarded ${totalPointsAwarded} points to user ${userId} for ${actionType}. Total: ${newTotalPoints}, Streak: ${newStreak} days`);

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
      console.error('Points award error details:', error);
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
        // Initialize and return default points
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
      // Return default points instead of throwing error
      return {
        total_points: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        last_activity_date: null
      };
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
   * Award points for daily engagement (call this when user performs any meaningful action)
   */
  static async awardDailyEngagement(userId, actionDescription = 'Daily engagement') {
    return await this.awardPoints(
      userId, 
      POINTS.DAILY_ENGAGEMENT, 
      'DAILY_ENGAGEMENT', 
      actionDescription
    );
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
    // Award points for meaningful login (when user actually engages)
    return await this.awardPoints(
      userId, 
      POINTS.DAILY_LOGIN, 
      'DAILY_LOGIN', 
      'Daily login with engagement'
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
}

module.exports = { PointsService, POINTS };