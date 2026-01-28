import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { videoService } from '../services/video.service';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    processing: 0,
    completed: 0,
    flagged: 0
  });
  const [recentVideos, setRecentVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { videos, pagination } = await videoService.getVideos({ limit: 5 });
      setRecentVideos(videos);

      // Calculate stats
      const allVideos = await videoService.getVideos({ limit: 1000 });
      const total = allVideos.pagination.total;
      const processing = allVideos.videos.filter(v => v.processingStatus === 'processing' || v.processingStatus === 'pending').length;
      const completed = allVideos.videos.filter(v => v.processingStatus === 'completed').length;
      const flagged = allVideos.videos.filter(v => v.sensitivityStatus === 'flagged').length;

      setStats({ total, processing, completed, flagged });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      <p className="dashboard-welcome">Welcome back, {user?.name}!</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Videos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.processing}</div>
          <div className="stat-label">Processing</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.flagged}</div>
          <div className="stat-label">Flagged</div>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Videos</h2>
          <Link to="/videos" className="view-all-link">
            View All →
          </Link>
        </div>

        {recentVideos.length === 0 ? (
          <div className="empty-state">
            <p>No videos yet. {(user?.role === 'admin' || user?.role === 'editor') && (
              <Link to="/upload">Upload your first video</Link>
            )}</p>
          </div>
        ) : (
          <div className="video-grid">
            {recentVideos.map((video) => (
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
                  <h3>{video.originalName}</h3>
                  <p className="video-meta">
                    {video.duration > 0 && `${Math.round(video.duration)}s • `}
                    {(video.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {video.processingStatus === 'processing' && (
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${video.processingProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {(user?.role === 'admin' || user?.role === 'editor') && (
        <div className="dashboard-actions">
          <Link to="/upload" className="action-button">
            Upload New Video
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
