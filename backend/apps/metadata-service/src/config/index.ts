// ============================================
// Metadata Service — Configuration
// ============================================

import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

if (nodeEnv === 'production' && jwtSecret === 'dev-secret-change-me') {
  throw new Error('FATAL SECURITY ERROR: Default or insecure JWT_SECRET is not allowed in production mode. Set a strong JWT_SECRET in environment variables.');
}

export const config = {
  serviceName: 'metadata-service',
  port: parseInt(process.env.METADATA_SERVICE_PORT || '3003', 10),
  nodeEnv,
  logLevel: process.env.LOG_LEVEL || 'debug',

  jwt: {
    secret: jwtSecret,
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
