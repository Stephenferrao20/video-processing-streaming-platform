import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a token.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    next(error);
  }
};

/**
 * Middleware to check if user has required role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Required role: ' + roles.join(' or ')
      });
    }

    next();
  };
};

/**
 * Middleware to ensure multi-tenant isolation
 * Users can only access their own data or data from their tenant
 */
export const enforceTenantIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Admin can access all data
  if (req.user.role === 'admin') {
    return next();
  }

  // For other users, ensure tenantId matches
  // If tenantId is not set in query/params, use user's tenantId
  if (req.query.tenantId && req.query.tenantId !== req.user.tenantId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Tenant isolation violation'
    });
  }

  // Set tenantId from user if not provided
  req.tenantId = req.user.tenantId || req.user._id;
  next();
};
