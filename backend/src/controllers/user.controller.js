import User from '../models/User.model.js';

/**
 * Get all users (admin only)
 */
export const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user by ID (admin only)
 */
export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!role || !['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role (admin, editor, viewer) is required'
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user tenant (admin only)
 * Allows admins to assign users to a tenant so they can share videos
 */
export const updateUserTenant = async (req, res, next) => {
  try {
    const { tenantId } = req.body;
    const { id } = req.params;

    // Validate tenantId if provided
    if (tenantId) {
      const tenantUser = await User.findById(tenantId);
      if (!tenantUser) {
        return res.status(400).json({
          success: false,
          message: 'Invalid tenantId: User not found'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      id,
      { tenantId: tenantId || null },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User tenant updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all tenants (users who can be tenant owners)
 * Admin only - helps admins see which users can be assigned as tenants
 * Returns list of users that can serve as tenant owners
 */
export const getTenants = async (req, res, next) => {
  try {
    const Video = (await import('../models/Video.model.js')).default;
    
    // Get all unique tenantIds from videos
    const videoTenants = await Video.distinct('tenantId');
    
    // Get all users (they can all be tenant owners)
    const allUsers = await User.find({})
      .select('_id name email role tenantId')
      .sort({ name: 1 });

    // For each user, count how many videos they have (as tenant owner)
    const tenantsWithStats = await Promise.all(
      allUsers.map(async (user) => {
        const videoCount = await Video.countDocuments({ tenantId: user._id });
        const memberCount = await User.countDocuments({ 
          tenantId: user._id,
          _id: { $ne: user._id } // Exclude the owner
        });
        
        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId || user._id,
          videoCount,
          memberCount,
          isActiveTenant: videoCount > 0 || memberCount > 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        tenants: tenantsWithStats,
        total: tenantsWithStats.length
      }
    });
  } catch (error) {
    next(error);
  }
};
