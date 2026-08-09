// ============================================
// Auth Service — Configuration
// ============================================
// Centralizes all environment variable access.
// Validates required vars at startup (fail fast).
//
// 12-Factor App: config comes from the environment
// ============================================

import dotenv from 'dotenv';

// Load .env file from the backend root
dotenv.config({ path: '../../.env' });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

if (nodeEnv === 'production' && jwtSecret === 'dev-secret-change-me') {
  throw new Error('FATAL SECURITY ERROR: Default or insecure JWT_SECRET is not allowed in production mode. Set a strong JWT_SECRET in environment variables.');
}

export const config = {
  serviceName: 'auth-service',
  port: parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10),
  nodeEnv,
  logLevel: process.env.LOG_LEVEL || 'debug',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // PostgreSQL (used by Prisma via DATABASE_URL)
  database: {
    url: process.env.DATABASE_URL || 'postgresql://filemanager:filemanager_secret@localhost:5432/filemanager_db?schema=public',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
