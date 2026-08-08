// ============================================
// Search Service — Configuration
// ============================================

import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  serviceName: 'search-service',
  port: parseInt(process.env.SEARCH_SERVICE_PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
  },

  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    index: 'search_items',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
