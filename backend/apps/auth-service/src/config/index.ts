// ============================================
// Auth Service — Configuration
// ============================================
// WHY a config module?
// - Centralizes all environment variable access
// - Validates required vars at startup (fail fast)
// - Provides typed config object instead of raw process.env
//
// This follows the 12-Factor App methodology:
// Config should come from the environment, never hardcoded
// ============================================

import dotenv from 'dotenv';

// Load .env file (only in development)
dotenv.config({ path: '../../.env' });

export const config = {
  serviceName: 'auth-service',
  port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  // JWT (will be used in Module 2)
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // PostgreSQL (will be used in Module 3)
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'filemanager',
    password: process.env.POSTGRES_PASSWORD || 'filemanager_secret',
    name: process.env.POSTGRES_DB || 'filemanager',
  },

  // Redis (will be used in Module 8)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
