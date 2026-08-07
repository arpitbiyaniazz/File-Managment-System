// ============================================
// Metadata Service — Configuration
// ============================================

import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  serviceName: 'metadata-service',
  port: parseInt(process.env.METADATA_SERVICE_PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
