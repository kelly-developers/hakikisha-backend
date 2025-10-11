const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthController {
  async register(req, res) {
    try {
      const { email, password, phone, role = 'user' } = req.body;

      // Simple validation
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      // In a real app, you would create a user in the database
      // For now, just return success
      const token = jwt.sign(
        { userId: 'temp-user-id', email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return res.status(201).json({
        message: 'Registration successful',
        user: {
          id: 'temp-user-id',
          email,
          role,
          is_verified: false
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        error: 'Registration failed'
      });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      // In a real app, you would verify credentials
      const token = jwt.sign(
        { userId: 'temp-user-id', email, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return res.json({
        message: 'Login successful',
        user: {
          id: 'temp-user-id',
          email,
          role: 'user'
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        error: 'Login failed'
      });
    }
  }

  async logout(req, res) {
    try {
      return res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        error: 'Logout failed'
      });
    }
  }

  async getCurrentUser(req, res) {
    try {
      return res.json({
        user: req.user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      return res.status(500).json({
        error: 'Failed to get user profile'
      });
    }
  }
}

const authController = new AuthController();
module.exports = authController;