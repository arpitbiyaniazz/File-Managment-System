// ============================================
// Metadata Service — Entry Point
// ============================================
// Manages file metadata, folder hierarchy,
// ownership, permissions, and file versions.
// Stores data in PostgreSQL.
// Business logic will be added in Module 5.
// ============================================

import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';

const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// Routes will be added in Module 5:
// app.use('/api/metadata', metadataRoutes);

addErrorHandling(app, logger);
startServer(app, config.port, logger, config.serviceName);
