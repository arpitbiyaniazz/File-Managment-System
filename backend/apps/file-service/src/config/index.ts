// ============================================
// File Service — Configuration
// ============================================
// Centralizes all environment variable access.
// Validates required vars at startup (fail fast).
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
  serviceName: 'file-service',
  port: parseInt(process.env.FILE_SERVICE_PORT || '3002', 10),
  nodeEnv,
  logLevel: process.env.LOG_LEVEL || 'debug',

  // JWT Configuration (for shared middleware)
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  },

  // MinIO Configuration
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'file-storage',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
