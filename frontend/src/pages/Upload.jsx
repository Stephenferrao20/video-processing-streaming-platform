import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { videoService } from '../services/video.service';
import { socketService } from '../services/socket.service';
import { userService } from '../services/user.service';
import './Upload.css';

const Upload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    // Listen for video processing updates
    const handleProcessingUpdate = (data) => {
      if (uploadedVideo && data.videoId === uploadedVideo._id) {
        setProcessingProgress(data.progress);
        setProcessingStatus(data.stage);
        
        if (data.status === 'completed') {
          setTimeout(() => {
            navigate(`/videos/${uploadedVideo._id}`);
          }, 2000);
        } else if (data.status === 'failed') {
          setError(data.error || 'Processing failed');
        }
      }
    };

    socketService.on('video-processing-update', handleProcessingUpdate);

    return () => {
      socketService.off('video-processing-update', handleProcessingUpdate);
    };
  }, [uploadedVideo, navigate]);

  useEffect(() => {
    const fetchTenants = async () => {
      if (user?.role !== 'admin') return;
      try {
        const res = await userService.getTenants();
        setTenants(res.tenants || []);
      } catch (e) {
        console.error('Failed to load tenants:', e);
      }
    };
    fetchTenants();
  }, [user?.role]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      const allowedExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
      const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();

      if (!allowedTypes.includes(selectedFile.type) && !allowedExtensions.includes(ext)) {
        setError('Invalid file type. Only video files (mp4, mov, avi, webm, mkv) are allowed.');
        return;
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        setError('File size exceeds 500MB limit.');
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingStatus('');

    try {
      const video = await videoService.uploadVideo(file, {
        tenantId: user?.role === 'admin' && tenantId ? tenantId : undefined,
        onProgress: (progress) => setUploadProgress(progress)
      });

      setUploadedVideo(video);
      setProcessingStatus('Upload received');
      setProcessingProgress(0);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadedVideo(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingStatus('');
    setError('');
    setTenantId('');
  };

  if (user?.role !== 'admin' && user?.role !== 'editor') {
    return (
      <div className="upload-container">
        <div className="error-message">
          You don't have permission to upload videos. Required role: editor or admin.
        </div>
      </div>
    );
  }

  return (
    <div className="upload-container">
      <h1>Upload Video</h1>

      {!uploadedVideo ? (
        <div className="upload-form">
          {error && <div className="error-message">{error}</div>}

          {user?.role === 'admin' && (
            <div className="tenant-section">
              <label htmlFor="tenant-select" className="tenant-label">
                Upload to tenant (admin only)
              </label>
              <select
                id="tenant-select"
                className="tenant-select"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                disabled={uploading}
              >
                <option value="">Self (my tenant)</option>
                {tenants.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.email}) — videos: {t.videoCount}, members: {t.memberCount}
                  </option>
                ))}
              </select>
              <p className="tenant-help">
                Tip: assign a viewer to this tenant in <strong>Admin → Users</strong> to share videos.
              </p>
            </div>
          )}

          <div className="file-input-wrapper">
            <input
              type="file"
              id="video-file"
              accept="video/*"
              onChange={handleFileChange}
              disabled={uploading}
              className="file-input"
            />
            <label htmlFor="video-file" className="file-label">
              {file ? file.name : 'Choose Video File'}
            </label>
          </div>

          {file && (
            <div className="file-info">
              <p><strong>File:</strong> {file.name}</p>
              <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Type:</strong> {file.type}</p>
            </div>
          )}

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="progress-section">
              <p>Uploading... {uploadProgress}%</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="upload-actions">
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="upload-button"
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </button>
            {file && (
              <button
                onClick={handleReset}
                disabled={uploading}
                className="reset-button"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="processing-status">
          <h2>Upload Successful!</h2>
          <p>Your video is being processed...</p>

          {processingStatus && (
            <div className="processing-info">
              <p><strong>Status:</strong> {processingStatus}</p>
              {processingProgress > 0 && (
                <>
                  <p><strong>Progress:</strong> {processingProgress}%</p>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {processingProgress === 100 && (
            <div className="success-message">
              Processing completed! Redirecting to video...
            </div>
          )}

          <button onClick={handleReset} className="reset-button">
            Upload Another Video
          </button>
        </div>
      )}
    </div>
  );
};

export default Upload;
