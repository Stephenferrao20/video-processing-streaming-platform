import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { socketService } from '../services/socket.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    // Check if user is already logged in
    if (token) {
      authService.setToken(token);
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const userData = await authService.getProfile();
      setUser(userData);
      
      // Initialize socket connection
      socketService.connect(token);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const { user: userData, token: newToken } = response;
      
      setUser(userData);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      authService.setToken(newToken);
      
      // Initialize socket connection
      socketService.connect(newToken);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const response = await authService.register(name, email, password, role);
      const { user: userData, token: newToken } = response;
      
      setUser(userData);
      setToken(newToken);
      localStorage.setItem('token', newToken);
      authService.setToken(newToken);
      
      // Initialize socket connection
      socketService.connect(newToken);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    authService.setToken(null);
    socketService.disconnect();
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
