const logger = require('../utils/logger');
const Constants = require('../config/constants');

class RoleMiddleware {
  requireRole(requiredRoles) {
    return (req, res, next) => {
      if (!req.user) {
        logger.warn('Role check failed: No user in request', {
          path: req.path,
          method: req.method
        });
        return res.status(401).json({ error: Constants.ERROR_MESSAGES.UNAUTHORIZED });
      }

      const userRole = req.user.role;
      
      if (!requiredRoles.includes(userRole)) {
        logger.warn('Insufficient permissions', {
          userId: req.user.userId,
          userRole,
          requiredRoles,
          path: req.path,
          method: req.method
        });
        return res.status(403).json({ error: Constants.ERROR_MESSAGES.FORBIDDEN });
      }

      next();
    };
  }

  requireOwnershipOrRole(resourceOwnerPath, allowedRoles) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: Constants.ERROR_MESSAGES.UNAUTHORIZED });
        }

        const userRole = req.user.role;
        const userId = req.user.userId;

        // If user has allowed role, grant access
        if (allowedRoles.includes(userRole)) {
          return next();
        }

        // Check ownership
        const resourceId = req.params[resourceOwnerPath];
        if (!resourceId) {
          return res.status(400).json({ error: 'Resource ID required' });
        }

        // This would typically involve querying the database to check ownership
        const isOwner = await this.checkResourceOwnership(resourceId, userId);
        
        if (isOwner) {
          return next();
        }

        logger.warn('Ownership check failed', {
          userId,
          resourceId,
          path: req.path,
          method: req.method
        });

        return res.status(403).json({ error: Constants.ERROR_MESSAGES.FORBIDDEN });

      } catch (error) {
        logger.error('Ownership check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  async checkResourceOwnership(resourceId, userId) {
    // This would be implemented based on your resource types
    // For now, return a placeholder implementation
    try {
      // You would typically query your database here
      // Example: const resource = await Resource.findById(resourceId);
      // return resource.user_id === userId;
      
      return false; // Placeholder
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      return false;
    }
  }

  requireVerifiedEmail() {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: Constants.ERROR_MESSAGES.UNAUTHORIZED });
      }

      try {
        // This would check if the user's email is verified
        // const user = await User.findById(req.user.userId);
        // if (!user.is_verified) {
        //   return res.status(403).json({ error: 'Email verification required' });
        // }

        next();
      } catch (error) {
        logger.error('Email verification check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  requireActiveStatus() {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: Constants.ERROR_MESSAGES.UNAUTHORIZED });
      }

      try {
        // This would check if the user account is active
        // const user = await User.findById(req.user.userId);
        // if (!user.is_active) {
        //   return res.status(403).json({ error: 'Account is deactivated' });
        // }

        next();
      } catch (error) {
        logger.error('Active status check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  // Middleware for fact-checker specific permissions
  requireFactCheckerApproved() {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: Constants.ERROR_MESSAGES.UNAUTHORIZED });
      }

      try {
        // This would check if the fact-checker is approved
        // const factChecker = await FactChecker.findByUserId(req.user.userId);
        // if (!factChecker || factChecker.verification_status !== 'approved') {
        //   return res.status(403).json({ error: 'Fact-checker approval required' });
        // }

        next();
      } catch (error) {
        logger.error('Fact-checker approval check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  // Composite middleware for common permission patterns
  canManageClaims() {
    return [
      this.requireRole([Constants.ROLES.ADMIN, Constants.ROLES.FACT_CHECKER]),
      this.requireFactCheckerApproved()
    ];
  }

  canManageUsers() {
    return this.requireRole([Constants.ROLES.ADMIN]);
  }

  canPublishContent() {
    return [
      this.requireRole([Constants.ROLES.ADMIN, Constants.ROLES.FACT_CHECKER]),
      this.requireFactCheckerApproved()
    ];
  }

  // Dynamic role checking based on request parameters
  dynamicRoleCheck(roleResolver) {
    return (req, res, next) => {
      try {
        const requiredRoles = roleResolver(req);
        
        if (!requiredRoles || !Array.isArray(requiredRoles)) {
          return res.status(500).json({ error: 'Invalid role configuration' });
        }

        return this.requireRole(requiredRoles)(req, res, next);
      } catch (error) {
        logger.error('Dynamic role check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  // Permission-based access control
  checkPermission(permission) {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: Constants.ERROR_MESSAGES.UNAUTHORIZED });
      }

      try {
        // This would check against a permissions database
        // const hasPermission = await PermissionService.userHasPermission(
        //   req.user.userId, 
        //   permission
        // );
        
        // if (!hasPermission) {
        //   return res.status(403).json({ error: 'Insufficient permissions' });
        // }

        next();
      } catch (error) {
        logger.error('Permission check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    };
  }
}

module.exports = new RoleMiddleware();