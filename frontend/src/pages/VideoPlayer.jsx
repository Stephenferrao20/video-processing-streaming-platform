import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { videoService } from '../services/video.service';
import { socketService } from '../services/socket.service';
import { useAuth } from '../context/AuthContext';
import './VideoPlayer.css';

const VideoPlayer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [streamUrl, setStreamUrl] = useState('');

  useEffect(() => {
    fetchVideo();
  }, [id]);

  useEffect(() => {
    if (video) {
      // Listen for processing updates
      const handleProcessingUpdate = (data) => {
        if (data.videoId === video._id) {
          setVideo(prev => ({
            ...prev,
            processingStatus: data.status,
            processingProgress: data.progress,
            sensitivityStatus: data.sensitivityStatus || prev.sensitivityStatus,
            sensitivityReason: data.sensitivityReason || prev.sensitivityReason
          }));

          // Update stream URL if processing completed
          if (data.status === 'completed') {
            setStreamUrl(videoService.getVideoStreamUrl(video._id));
          }
        }
      };

      socketService.on('video-processing-update', handleProcessingUpdate);

      return () => {
        socketService.off('video-processing-update', handleProcessingUpdate);
      };
    }
  }, [video]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const fetchedVideo = await videoService.getVideo(id);
      setVideo(fetchedVideo);

      // Set stream URL if processing is completed
      if (fetchedVideo.processingStatus === 'completed') {
        setStreamUrl(videoService.getVideoStreamUrl(id));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      await videoService.deleteVideo(id);
      navigate('/videos');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete video');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="player-loading">Loading video...</div>;
  }

  if (error && !video) {
    return (
      <div className="player-error">
        <p>{error}</p>
        <Link to="/videos" className="back-link">Back to Videos</Link>
      </div>
    );
  }

  if (!video) {
    return null;
  }

  return (
    <div className="video-player-page">
      <Link to="/videos" className="back-link">← Back to Videos</Link>

      <div className="player-container">
        <div className="player-header">
          <h1>{video.originalName}</h1>
          <div className="player-badges">
            <span className={`badge ${video.processingStatus === 'completed' ? 'badge-success' : 'badge-warning'}`}>
              {video.processingStatus}
            </span>
            <span className={`badge ${video.sensitivityStatus === 'flagged' ? 'badge-danger' : 'badge-success'}`}>
              {video.sensitivityStatus}
            </span>
          </div>
        </div>

        {video.processingStatus !== 'completed' ? (
          <div className="processing-message">
            <h2>Video is still being processed</h2>
            {video.processingStatus === 'processing' && (
              <>
                <p>Progress: {video.processingProgress}%</p>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${video.processingProgress}%` }}
                  />
                </div>
              </>
            )}
            <p>Please wait for processing to complete before streaming.</p>
          </div>
        ) : (
          <div className="video-wrapper">
            <video
              controls
              src={streamUrl}
              className="video-element"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        <div className="video-details">
          <div className="detail-section">
            <h3>Video Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">File Size:</span>
                <span className="detail-value">{(video.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
              {video.duration > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Duration:</span>
                  <span className="detail-value">{formatDuration(video.duration)}</span>
                </div>
              )}
              {video.width > 0 && video.height > 0 && (
                <div className="detail-item">
                  <span className="detail-label">Resolution:</span>
                  <span className="detail-value">{video.width} × {video.height}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Uploaded:</span>
                <span className="detail-value">{formatDate(video.uploadedAt)}</span>
              </div>
              {video.processedAt && (
                <div className="detail-item">
                  <span className="detail-label">Processed:</span>
                  <span className="detail-value">{formatDate(video.processedAt)}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Uploaded By:</span>
                <span className="detail-value">
                  {video.uploadedBy?.name || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {video.sensitivityStatus === 'flagged' && video.sensitivityReason && (
            <div className="detail-section sensitivity-warning">
              <h3>⚠️ Sensitivity Analysis</h3>
              <p><strong>Status:</strong> Flagged</p>
              <p><strong>Reason:</strong> {video.sensitivityReason}</p>
            </div>
          )}

          {(user?.role === 'admin' || user?.role === 'editor') && (
            <div className="detail-section">
              <button onClick={handleDelete} className="delete-button">
                Delete Video
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
