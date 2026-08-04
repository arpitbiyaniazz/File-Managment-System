import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  serviceName: 'search-service',
  port: parseInt(process.env.SEARCH_SERVICE_PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Elasticsearch (will be used in Module 6)
  elasticsearch: {
    host: process.env.ELASTICSEARCH_HOST || 'http://localhost:9200',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
