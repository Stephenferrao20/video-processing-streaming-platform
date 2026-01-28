import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class AuthService {
  constructor() {
    this.token = null;
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add token to requests if available
    this.api.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle 401 errors (unauthorized)
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.token = null;
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token) {
    this.token = token;
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  async register(name, email, password, role) {
    const response = await this.api.post('/auth/register', {
      name,
      email,
      password,
      role
    });
    return response.data.data;
  }

  async login(email, password) {
    const response = await this.api.post('/auth/login', {
      email,
      password
    });
    return response.data.data;
  }

  async getProfile() {
    const response = await this.api.get('/auth/profile');
    return response.data.data.user;
  }
}

export const authService = new AuthService();
