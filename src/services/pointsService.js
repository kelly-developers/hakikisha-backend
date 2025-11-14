const db = require('../config/database');
const logger = require('../utils/logger');

class PointsService {
  static POINTS = {
    DAILY_LOGIN: 10,
    CLAIM_SUBMISSION: 5,
    PROFILE_COMPLETION: 15,
    VERDICT_RECEIVED: 5,
    STREAK_BONUS: 25
  };

  static async initializeUserPoints(userId) {
    try {
      const existingPoints = await db.query(
        'SELECT user_id FROM hakikisha.user_points WHERE user_id = $1',
        [userId]
      );

      if (existingPoints.rows.length === 0) {
        await db.query(
          'INSERT INTO hakikisha.user_points (user_id, total_points, current_streak, longest_streak) VALUES ($1, 0, 0, 0)',
          [userId]
        );
        console.log(`Initialized points for user: ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error initializing user points:', error);
      throw error;
    }
  }

  static async awardPointsForDailyLogin(userId) {
    try {
      await this.initializeUserPoints(userId);

      const userPoints = await db.query(
        'SELECT current_streak, longest_streak, last_activity_date FROM hakikisha.user_points WHERE user_id = $1',
        [userId]
      );

      const pointsRecord = userPoints.rows[0];
      const today = new Date().toDateString();
      const lastActivityDate = pointsRecord.last_activity_date ? new Date(pointsRecord.last_activity_date).toDateString() : null;

      let newStreak = pointsRecord.current_streak;
      let pointsAwarded = this.POINTS.DAILY_LOGIN;

      if (lastActivityDate === today) {
        return { pointsAwarded: 0, newStreak: newStreak, message: 'Already logged in today' };
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (lastActivityDate === yesterdayStr) {
        newStreak += 1;
      } else if (lastActivityDate && lastActivityDate !== today && lastActivityDate !== yesterdayStr) {
        newStreak = 1;
      } else if (!lastActivityDate) {
        newStreak = 1;
      }

      const newLongestStreak = Math.max(pointsRecord.longest_streak, newStreak);

      if (newStreak >= 7) {
        pointsAwarded += this.POINTS.STREAK_BONUS;
      }

      await db.query(
        `UPDATE hakikisha.user_points 
         SET total_points = total_points + $1, 
             current_streak = $2, 
             longest_streak = $3, 
             last_activity_date = NOW(),
             updated_at = NOW()
         WHERE user_id = $4`,
        [pointsAwarded, newStreak, newLongestStreak, userId]
      );

      await db.query(
        `INSERT INTO hakikisha.points_history (user_id, points, activity_type, description)
         VALUES ($1, $2, $3, $4)`,
        [userId, pointsAwarded, 'DAILY_LOGIN', `Daily login - Streak: ${newStreak} days`]
      );

      console.log(`Awarded ${pointsAwarded} points to user ${userId}. New streak: ${newStreak}`);

      return {
        pointsAwarded,
        newStreak,
        newLongestStreak,
        message: `Daily login points awarded. Current streak: ${newStreak} days`
      };
    } catch (error) {
      console.error('Error awarding daily login points:', error);
      throw error;
    }
  }

  static async awardPoints(userId, points, activityType, description) {
    try {
      await this.initializeUserPoints(userId);

      await db.query(
        `UPDATE hakikisha.user_points 
         SET total_points = total_points + $1, 
             updated_at = NOW()
         WHERE user_id = $2`,
        [points, userId]
      );

      await db.query(
        `INSERT INTO hakikisha.points_history (user_id, points, activity_type, description)
         VALUES ($1, $2, $3, $4)`,
        [userId, points, activityType, description]
      );

      console.log(`Awarded ${points} points to user ${userId} for ${activityType}`);

      return {
        pointsAwarded: points,
        activityType,
        description
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  static async getUserPoints(userId) {
    try {
      await this.initializeUserPoints(userId);

      const result = await db.query(
        `SELECT 
          total_points as points,
          current_streak,
          longest_streak,
          last_activity_date
         FROM hakikisha.user_points 
         WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          points: 0,
          current_streak: 0,
          longest_streak: 0,
          last_activity_date: null
        };
      }

      const pointsData = result.rows[0];
      
      return {
        points: Number(pointsData.points) || 0,
        current_streak: Number(pointsData.current_streak) || 0,
        longest_streak: Number(pointsData.longest_streak) || 0,
        last_activity_date: pointsData.last_activity_date
      };
    } catch (error) {
      console.error('Error getting user points:', error);
      throw error;
    }
  }

  static async getPointsHistory(userId, limit = 20, offset = 0) {
    try {
      const result = await db.query(
        `SELECT points, activity_type, description, created_at
         FROM hakikisha.points_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await db.query(
        'SELECT COUNT(*) FROM hakikisha.points_history WHERE user_id = $1',
        [userId]
      );

      return {
        history: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      };
    } catch (error) {
      console.error('Error getting points history:', error);
      throw error;
    }
  }

  static async resetUserPoints(userId) {
    try {
      await db.query(
        `UPDATE hakikisha.user_points 
         SET total_points = 0, 
             current_streak = 0,
             updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );

      await db.query(
        'DELETE FROM hakikisha.points_history WHERE user_id = $1',
        [userId]
      );

      console.log(`Reset points for user: ${userId}`);

      return { success: true, message: 'User points reset successfully' };
    } catch (error) {
      console.error('Error resetting user points:', error);
      throw error;
    }
  }

  static async getLeaderboard(limit = 50) {
    try {
      const result = await db.query(
        `SELECT 
          u.username,
          u.profile_picture,
          up.total_points as points,
          up.current_streak,
          up.longest_streak
         FROM hakikisha.user_points up
         JOIN hakikisha.users u ON up.user_id = u.id
         WHERE u.status = 'active' AND u.registration_status = 'approved'
         ORDER BY up.total_points DESC, up.current_streak DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows.map((row, index) => ({
        rank: index + 1,
        username: row.username,
        profile_picture: row.profile_picture,
        points: Number(row.points) || 0,
        current_streak: Number(row.current_streak) || 0,
        longest_streak: Number(row.longest_streak) || 0
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }
}

module.exports = { PointsService, POINTS: PointsService.POINTS };