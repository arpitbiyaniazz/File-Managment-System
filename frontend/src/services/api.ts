// ============================================
// API Client — Axios Configuration
// ============================================

import axios from 'axios';

// Base URLs pointing to microservices (or Nginx API Gateway)
export const API_URLS = {
  AUTH: 'http://localhost:3001/api/auth',
  FILE: 'http://localhost:3002/api/files',
  METADATA: 'http://localhost:3003/api/metadata',
  SEARCH: 'http://localhost:3004/api/search',
};

// Create Axios instances
export const authApi = axios.create({ baseURL: API_URLS.AUTH });
export const fileApi = axios.create({ baseURL: API_URLS.FILE });
export const metadataApi = axios.create({ baseURL: API_URLS.METADATA });
export const searchApi = axios.create({ baseURL: API_URLS.SEARCH });

// Attach Authorization header automatically
const attachToken = (config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

authApi.interceptors.request.use(attachToken);
fileApi.interceptors.request.use(attachToken);
metadataApi.interceptors.request.use(attachToken);
searchApi.interceptors.request.use(attachToken);
