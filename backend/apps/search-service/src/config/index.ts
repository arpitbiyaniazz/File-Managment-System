// ============================================
// Search Service — Configuration
// ============================================

import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-me';

if (nodeEnv === 'production' && jwtSecret === 'dev-secret-change-me') {
  throw new Error('FATAL SECURITY ERROR: Default or insecure JWT_SECRET is not allowed in production mode. Set a strong JWT_SECRET in environment variables.');
}

export const config = {
  serviceName: 'search-service',
  port: parseInt(process.env.SEARCH_SERVICE_PORT || '3004', 10),
  nodeEnv,
  logLevel: process.env.LOG_LEVEL || 'debug',

  jwt: {
    secret: jwtSecret,
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: 'search_items',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
