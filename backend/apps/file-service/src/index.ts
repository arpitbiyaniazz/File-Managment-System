// ============================================
// File Service — Entry Point
// ============================================
// Handles file upload, download, delete, rename, move, copy.
// Stores files in MinIO (S3-compatible object storage).
// Business logic will be added in Module 4.
// ============================================

import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';

const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// Routes will be added in Module 4:
// app.use('/api/files', fileRoutes);

addErrorHandling(app, logger);
startServer(app, config.port, logger, config.serviceName);
