import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { videoService } from '../services/video.service';
import { socketService } from '../services/socket.service';
import './VideoLibrary.css';

const VideoLibrary = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    sensitivityStatus: '',
    page: 1
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchVideos();
  }, [filters]);

  useEffect(() => {
    // Listen for real-time processing updates
    const handleProcessingUpdate = (data) => {
      setVideos(prevVideos =>
        prevVideos.map(video =>
          video._id === data.videoId
            ? {
                ...video,
                processingStatus: data.status,
                processingProgress: data.progress,
                sensitivityStatus: data.sensitivityStatus || video.sensitivityStatus,
                sensitivityReason: data.sensitivityReason || video.sensitivityReason
              }
            : video
        )
      );
    };

    socketService.on('video-processing-update', handleProcessingUpdate);

    return () => {
      socketService.off('video-processing-update', handleProcessingUpdate);
    };
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await videoService.getVideos({
        ...filters,
        limit: pagination.limit
      });
      setVideos(response.videos);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      processing: 'badge-info',
      completed: 'badge-success',
      failed: 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  const getSensitivityBadge = (status) => {
    return status === 'flagged' ? 'badge-danger' : 'badge-success';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && videos.length === 0) {
    return <div className="library-loading">Loading videos...</div>;
  }

  return (
    <div className="video-library">
      <div className="library-header">
        <h1>Video Library</h1>
      </div>

      <div className="filters">
        <div className="filter-group">
          <label htmlFor="status-filter">Status:</label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sensitivity-filter">Sensitivity:</label>
          <select
            id="sensitivity-filter"
            value={filters.sensitivityStatus}
            onChange={(e) => handleFilterChange('sensitivityStatus', e.target.value)}
          >
            <option value="">All</option>
            <option value="safe">Safe</option>
            <option value="flagged">Flagged</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <p>No videos found.</p>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {videos.map((video) => (
              <Link
                key={video._id}
                to={`/videos/${video._id}`}
                className="video-card"
              >
                <div className="video-card-header">
                  <span className={`badge ${getStatusBadge(video.processingStatus)}`}>
                    {video.processingStatus}
                  </span>
                  <span className={`badge ${getSensitivityBadge(video.sensitivityStatus)}`}>
                    {video.sensitivityStatus}
                  </span>
                </div>
                <div className="video-card-body">
                  <h3 title={video.originalName}>{video.originalName}</h3>
                  <p className="video-meta">
                    {video.duration > 0 && `${Math.round(video.duration)}s • `}
                    {(video.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="video-date">{formatDate(video.uploadedAt)}</p>
                  {video.processingStatus === 'processing' && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${video.processingProgress}%` }}
                      />
                    </div>
                  )}
                  {video.sensitivityStatus === 'flagged' && video.sensitivityReason && (
                    <p className="sensitivity-reason" title={video.sensitivityReason}>
                      ⚠️ {video.sensitivityReason.substring(0, 50)}...
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="page-button"
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="page-button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VideoLibrary;
