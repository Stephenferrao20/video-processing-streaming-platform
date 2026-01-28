import express from 'express';
import { uploadVideo, getVideos, getVideo, streamVideo, deleteVideo } from '../controllers/video.controller.js';
import { authenticate, authorize, enforceTenantIsolation } from '../middleware/auth.middleware.js';
import { upload } from '../utils/upload.util.js';

const router = express.Router();

// Stream video route - handle auth separately to support query token
router.get('/:id/stream', async (req, res, next) => {
  // Try to authenticate via header first
  if (req.headers.authorization) {
    return authenticate(req, res, next);
  }
  // If no header, continue to controller which will check query token
  next();
}, streamVideo);

// All other video routes require authentication
router.use(authenticate);
router.use(enforceTenantIsolation);

// Upload video (editor and admin only)
router.post('/upload', authorize('admin', 'editor'), upload.single('video'), uploadVideo);

// Get all videos
router.get('/', getVideos);

// Get single video
router.get('/:id', getVideo);

// Delete video (editor and admin only)
router.delete('/:id', authorize('admin', 'editor'), deleteVideo);

export default router;
