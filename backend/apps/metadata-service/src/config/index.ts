import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  serviceName: 'metadata-service',
  port: parseInt(process.env.METADATA_SERVICE_PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  // PostgreSQL (will be used in Module 3)
  database: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'filemanager',
    password: process.env.POSTGRES_PASSWORD || 'filemanager_secret',
    name: process.env.POSTGRES_DB || 'filemanager',
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
