// ============================================
// API Client — Base Configuration
// ============================================
// WHY a centralized API client?
// - Single place to configure base URL, headers, interceptors
// - Automatic JWT token attachment
// - Centralized error handling
// - Request/response logging in development
//
// All API calls go through this client:
//   import { api } from '@/services/api';
//   const users = await api.get('/auth/me');
// ============================================

import axios from 'axios';

/**
 * Axios instance configured for the File Manager API.
 *
 * In development, Vite proxy handles routing:
 *   /api/* → http://localhost:80 (Nginx gateway)
 *
 * In production, the API base URL is set via env variable.
 */
export const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---- Request Interceptor ----
// Automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ---- Response Interceptor ----
// Handle common error cases globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — redirect to login
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
