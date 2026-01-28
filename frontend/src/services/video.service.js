import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class VideoService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add token to requests
    const token = localStorage.getItem('token');
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Handle token updates
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async uploadVideo(file, { tenantId, onProgress } = {}) {
    const formData = new FormData();
    formData.append('video', file);
    if (tenantId) {
      formData.append('tenantId', tenantId);
    }

    const response = await this.api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });

    return response.data.data.video;
  }

  async getVideos(params = {}) {
    const response = await this.api.get('/videos', { params });
    return response.data.data;
  }

  async getVideo(id) {
    const response = await this.api.get(`/videos/${id}`);
    return response.data.data.video;
  }

  getVideoStreamUrl(id) {
    // For video streaming, we need to pass token in URL since HTML5 video can't send custom headers
    const token = localStorage.getItem('token');
    return `${API_URL}/videos/${id}/stream?token=${token}`;
  }

  async deleteVideo(id) {
    const response = await this.api.delete(`/videos/${id}`);
    return response.data;
  }
}

export const videoService = new VideoService();
