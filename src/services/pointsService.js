const db = require('../config/database');
const logger = require('../utils/logger');

// Points configuration
const POINTS = {
  REGISTRATION: 100,
  DAILY_LOGIN: 10,
  PROFILE_COMPLETION: 50,
  CLAIM_SUBMISSION: 20,
  CLAIM_VERIFIED: 30,
  SOCIAL_SHARE: 5,
  STREAK_BONUS: 25,
  PROFILE_UPDATE: 5,
  PROFILE_PICTURE: 10
};

class PointsService {
  // Initialize user points record if it doesn't exist
  static async initializeUserPoints(userId) {
    try {
      console.log('Initializing points for user:', userId);
      
      // Check if user points record exists
      const existing = await db.query(
        'SELECT user_id FROM hakikisha.user_points WHERE user_id = $1',
        [userId]
      );

      if (existing.rows.length === 0) {
        // Create initial points record
        await db.query(
          `INSERT INTO hakikisha.user_points 
           (user_id, total_points, current_streak, longest_streak, current_streak_days, longest_streak_days, last_activity_date, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())`,
          [userId, POINTS.REGISTRATION, 0, 0, 0, 0]
        );
        
        // Log registration points
        await db.query(
          `INSERT INTO hakikisha.points_history 
           (user_id, points, activity_type, description, created_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [userId, POINTS.REGISTRATION, 'REGISTRATION', 'Points for account registration']
        );
        
        console.log('Initial points record created for user:', userId, 'with', POINTS.REGISTRATION, 'points');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing user points:', error);
      throw error;
    }
  }

  // Award points to user
  static async awardPoints(userId, points, activityType, description = '') {
    try {
      // Ensure points record exists
      await this.initializeUserPoints(userId);

      // Update points
      const result = await db.query(
        `UPDATE hakikisha.user_points 
         SET total_points = total_points + $1,
             updated_at = NOW()
         WHERE user_id = $2
         RETURNING total_points, current_streak, longest_streak`,
        [points, userId]
      );

      // Log points activity
      await db.query(
        `INSERT INTO hakikisha.points_history 
         (user_id, points, activity_type, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, points, activityType, description]
      );

      console.log(`Awarded ${points} points to user ${userId} for ${activityType}`);

      return {
        pointsAwarded: points,
        newTotal: result.rows[0]?.total_points || 0,
        activityType: activityType
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  // Award points for daily login and manage streaks
  static async awardPointsForDailyLogin(userId) {
    try {
      await this.initializeUserPoints(userId);

      const today = new Date().toDateString();
      
      // Get user's current points and last activity
      const userPoints = await db.query(
        'SELECT * FROM hakikisha.user_points WHERE user_id = $1',
        [userId]
      );

      if (userPoints.rows.length === 0) {
        throw new Error('User points record not found');
      }

      const currentData = userPoints.rows[0];
      const lastActivity = currentData.last_activity_date 
        ? new Date(currentData.last_activity_date).toDateString() 
        : null;

      let pointsToAward = POINTS.DAILY_LOGIN;
      let newStreak = 1;
      let newLongestStreak = currentData.longest_streak || 0;

      // Check if this is consecutive day login
      if (lastActivity === today) {
        // Already logged in today, no points
        return { pointsAwarded: 0, streakMaintained: true };
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (lastActivity === yesterdayStr) {
        // Consecutive day - increment streak
        newStreak = (currentData.current_streak || 0) + 1;
        if (newStreak > newLongestStreak) {
          newLongestStreak = newStreak;
        }
        
        // Add streak bonus for every 7 days
        if (newStreak % 7 === 0) {
          pointsToAward += POINTS.STREAK_BONUS;
        }
      } else if (lastActivity && lastActivity !== today && lastActivity !== yesterdayStr) {
        // Streak broken - reset to 1
        newStreak = 1;
      }

      // Update points and streak
      const result = await db.query(
        `UPDATE hakikisha.user_points 
         SET total_points = total_points + $1,
             current_streak = $2,
             longest_streak = $3,
             current_streak_days = $2,
             longest_streak_days = $3,
             last_activity_date = NOW(),
             updated_at = NOW()
         WHERE user_id = $4
         RETURNING total_points, current_streak, longest_streak`,
        [pointsToAward, newStreak, newLongestStreak, userId]
      );

      // Log the activity
      await db.query(
        `INSERT INTO hakikisha.points_history 
         (user_id, points, activity_type, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, pointsToAward, 'DAILY_LOGIN', `Daily login - Streak: ${newStreak}`]
      );

      console.log(`Daily login: Awarded ${pointsToAward} points to user ${userId}, streak: ${newStreak}`);

      return {
        pointsAwarded: pointsToAward,
        newStreak: newStreak,
        newLongestStreak: newLongestStreak,
        activityType: 'DAILY_LOGIN'
      };
    } catch (error) {
      console.error('Error awarding daily login points:', error);
      throw error;
    }
  }

  // Get user points
  static async getUserPoints(userId) {
    try {
      await this.initializeUserPoints(userId);

      const result = await db.query(
        `SELECT 
          total_points,
          COALESCE(current_streak, 0) as current_streak,
          COALESCE(longest_streak, 0) as longest_streak,
          COALESCE(current_streak_days, 0) as current_streak_days,
          COALESCE(longest_streak_days, 0) as longest_streak_days,
          last_activity_date
         FROM hakikisha.user_points 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          current_streak_days: 0,
          longest_streak_days: 0,
          last_activity_date: null
        };
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user points:', error);
      throw error;
    }
  }

  // Get points history
  static async getPointsHistory(userId, limit = 20) {
    try {
      const result = await db.query(
        `SELECT points, activity_type, description, created_at
         FROM hakikisha.points_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting points history:', error);
      throw error;
    }
  }

  // Get leaderboard
  static async getLeaderboard(limit = 100) {
    try {
      const result = await db.query(
        `SELECT 
          up.user_id,
          u.username,
          u.profile_picture,
          up.total_points,
          up.current_streak,
          up.longest_streak,
          up.last_activity_date
         FROM hakikisha.user_points up
         JOIN hakikisha.users u ON up.user_id = u.id
         WHERE u.status = 'active'
         ORDER BY up.total_points DESC, up.current_streak DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  // Get user rank
  static async getUserRank(userId) {
    try {
      const result = await db.query(
        `SELECT rank FROM (
          SELECT 
            user_id,
            RANK() OVER (ORDER BY total_points DESC, current_streak DESC) as rank
          FROM hakikisha.user_points
        ) ranked WHERE user_id = $1`,
        [userId]
      );

      return result.rows[0]?.rank || 0;
    } catch (error) {
      console.error('Error getting user rank:', error);
      return 0;
    }
  }

  // Reset user points (admin function)
  static async resetUserPoints(userId, reason = 'Admin reset') {
    try {
      await db.query(
        `UPDATE hakikisha.user_points 
         SET total_points = 0,
             current_streak = 0,
             longest_streak = 0,
             current_streak_days = 0,
             longest_streak_days = 0,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      // Log the reset
      await db.query(
        `INSERT INTO hakikisha.points_history 
         (user_id, points, activity_type, description, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, 0, 'RESET', `Points reset: ${reason}`]
      );

      console.log(`Points reset for user ${userId}: ${reason}`);

      return { success: true, message: 'Points reset successfully' };
    } catch (error) {
      console.error('Error resetting user points:', error);
      throw error;
    }
  }

  // Get points statistics
  static async getPointsStatistics() {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) as total_users,
          SUM(total_points) as total_points_awarded,
          AVG(total_points) as average_points,
          MAX(total_points) as max_points,
          COUNT(CASE WHEN current_streak > 0 THEN 1 END) as users_with_streaks,
          AVG(current_streak) as average_streak
         FROM hakikisha.user_points`
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error getting points statistics:', error);
      throw error;
    }
  }
}

module.exports = {
  PointsService,
  POINTS
};