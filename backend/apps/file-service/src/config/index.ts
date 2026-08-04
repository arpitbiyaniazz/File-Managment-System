import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export const config = {
  serviceName: 'file-service',
  port: parseInt(process.env.FILE_SERVICE_PORT || '3002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'debug',

  // MinIO / S3 (will be used in Module 4)
  storage: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'file-storage',
  },

  // File upload limits
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
} as const;
