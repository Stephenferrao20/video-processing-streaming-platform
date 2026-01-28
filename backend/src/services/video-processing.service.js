import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Video from '../models/Video.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract video metadata using FFmpeg
 */
export const extractVideoMetadata = (videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      
      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        size: metadata.format.size || 0
      });
    });
  });
};

/**
 * Dummy sensitivity analysis based on rules
 */
export const analyzeSensitivity = (video) => {
  // Rule-based dummy analysis
  const rules = [];

  // Rule 1: Check filename for keywords
  const flaggedKeywords = ['test', 'sample', 'demo', 'temp'];
  const lowerFilename = video.originalName.toLowerCase();
  if (flaggedKeywords.some(keyword => lowerFilename.includes(keyword))) {
    rules.push('Filename contains flagged keyword');
  }

  // Rule 2: Check duration (very short or very long videos)
  if (video.duration < 5) {
    rules.push('Video duration is suspiciously short');
  }
  if (video.duration > 3600) {
    rules.push('Video duration exceeds 1 hour');
  }

  // Rule 3: Random classification (30% chance of being flagged)
  if (Math.random() < 0.3) {
    rules.push('Random classification flag');
  }

  // Rule 4: Check file size (very large files)
  if (video.size > 400 * 1024 * 1024) {
    rules.push('File size exceeds 400MB');
  }

  return {
    status: rules.length > 0 ? 'flagged' : 'safe',
    reason: rules.length > 0 ? rules.join('; ') : null
  };
};

/**
 * Process video through sensitivity analysis pipeline
 * Emits real-time updates via Socket.io
 */
export const processVideo = async (videoId, io) => {
  try {
    const video = await Video.findById(videoId);
    if (!video) {
      throw new Error('Video not found');
    }

    // Update status to processing
    video.processingStatus = 'processing';
    video.processingProgress = 0;
    await video.save();

    // Emit progress update
    io.to(`tenant-${video.tenantId}`).emit('video-processing-update', {
      videoId: video._id.toString(),
      status: 'processing',
      progress: 0,
      stage: 'Upload received'
    });

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stage 1: Metadata extraction (25%)
    video.processingProgress = 25;
    await video.save();

    io.to(`tenant-${video.tenantId}`).emit('video-processing-update', {
      videoId: video._id.toString(),
      status: 'processing',
      progress: 25,
      stage: 'Extracting metadata'
    });

    // Extract metadata
    const metadata = await extractVideoMetadata(video.path);
    video.duration = metadata.duration;
    video.width = metadata.width;
    video.height = metadata.height;
    video.processingProgress = 50;
    await video.save();

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stage 2: Sensitivity check (75%)
    video.processingProgress = 75;
    await video.save();

    io.to(`tenant-${video.tenantId}`).emit('video-processing-update', {
      videoId: video._id.toString(),
      status: 'processing',
      progress: 75,
      stage: 'Running sensitivity analysis'
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Perform sensitivity analysis
    const sensitivityResult = analyzeSensitivity({
      originalName: video.originalName,
      duration: video.duration,
      size: video.size
    });

    video.sensitivityStatus = sensitivityResult.status;
    video.sensitivityReason = sensitivityResult.reason;
    video.processingStatus = 'completed';
    video.processingProgress = 100;
    video.processedAt = new Date();
    await video.save();

    // Emit completion
    io.to(`tenant-${video.tenantId}`).emit('video-processing-update', {
      videoId: video._id.toString(),
      status: 'completed',
      progress: 100,
      stage: 'Processing completed',
      sensitivityStatus: video.sensitivityStatus,
      sensitivityReason: video.sensitivityReason
    });

    return video;
  } catch (error) {
    // Update video status to failed
    const video = await Video.findById(videoId);
    if (video) {
      video.processingStatus = 'failed';
      await video.save();

      io.to(`tenant-${video.tenantId}`).emit('video-processing-update', {
        videoId: video._id.toString(),
        status: 'failed',
        progress: 0,
        stage: 'Processing failed',
        error: error.message
      });
    }

    throw error;
  }
};
