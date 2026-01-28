import Video from '../models/Video.model.js';
import { processVideo } from '../services/video-processing.service.js';
import { createReadStream, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Upload video file
 */
export const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    // Admins and editors can optionally specify a tenantId to upload to
    // This allows them to upload videos that viewers in that tenant can access
    let tenantId = req.user.tenantId || req.user._id;
    
    if (req.body.tenantId && (req.user.role === 'admin' || req.user.role === 'editor')) {
      // Validate that the specified tenantId exists
      const User = (await import('../models/User.model.js')).default;
      const tenantUser = await User.findById(req.body.tenantId);
      if (tenantUser) {
        tenantId = req.body.tenantId;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid tenantId: User not found'
        });
      }
    }

    // Create video record
    const video = new Video({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user._id,
      tenantId: tenantId,
      processingStatus: 'pending'
    });

    await video.save();

    // Start processing asynchronously
    // Don't await - let it run in background
    processVideo(video._id, req.app.locals.io).catch(error => {
      console.error('Video processing error:', error);
    });

    res.status(201).json({
      success: true,
      message: 'Video uploaded successfully',
      data: { video }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all videos for authenticated user (with tenant isolation)
 */
export const getVideos = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user._id;
    const { status, sensitivityStatus, page = 1, limit = 10 } = req.query;

    // Build query with tenant isolation
    let query = {};

    // Admin can see all videos or filter by tenantId
    if (req.user.role === 'admin') {
      if (req.query.tenantId) {
        query.tenantId = req.query.tenantId;
      }
      // If no tenantId specified, admin sees all videos (empty query)
    } else {
      // Non-admin users only see videos from their tenant
      query.tenantId = tenantId;
    }

    if (status) {
      query.processingStatus = status;
    }

    if (sensitivityStatus) {
      query.sensitivityStatus = sensitivityStatus;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await Video.find(query)
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
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
 * Get single video by ID
 */
export const getVideo = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user._id;
    const video = await Video.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Enforce tenant isolation (admin can access all)
    if (req.user.role !== 'admin' && video.tenantId.toString() !== tenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { video }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream video with HTTP Range Request support
 * Supports token in query string for video element compatibility
 */
export const streamVideo = async (req, res, next) => {
  try {
    // Support token in query string for video element compatibility
    // The authenticate middleware handles Authorization header, but we also check query token
    let user = req.user;
    if (!user && req.query.token) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const User = (await import('../models/User.model.js')).default;
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        user = await User.findById(decoded.userId);
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid token'
          });
        }
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const tenantId = user.tenantId || user._id;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Enforce tenant isolation
    if (user.role !== 'admin' && video.tenantId.toString() !== tenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only allow streaming if processing is completed
    if (video.processingStatus !== 'completed') {
      return res.status(403).json({
        success: false,
        message: 'Video is still being processed'
      });
    }

    const videoPath = join(__dirname, '../../uploads', video.filename);
    const stat = statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = createReadStream(videoPath, { start, end });
      
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.mimeType,
      };
      
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType,
      };
      
      res.writeHead(200, head);
      createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete video
 */
export const deleteVideo = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || req.user._id;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Enforce tenant isolation and permissions
    if (req.user.role !== 'admin' && video.tenantId.toString() !== tenantId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Only admin and editor can delete
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete videos'
      });
    }

    // Delete file from filesystem
    const { unlink } = await import('fs/promises');
    try {
      await unlink(video.path);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    // Delete from database
    await Video.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
