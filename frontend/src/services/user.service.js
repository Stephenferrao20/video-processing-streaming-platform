import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class UserService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async getUsers(params = {}) {
    const response = await this.api.get('/users', { params });
    return response.data.data;
  }

  async getTenants() {
    const response = await this.api.get('/users/tenants');
    return response.data.data;
  }

  async updateUserRole(userId, role) {
    const response = await this.api.patch(`/users/${userId}/role`, { role });
    return response.data.data.user;
  }

  async updateUserTenant(userId, tenantId) {
    const response = await this.api.patch(`/users/${userId}/tenant`, { tenantId });
    return response.data.data.user;
  }
}

export const userService = new UserService();

