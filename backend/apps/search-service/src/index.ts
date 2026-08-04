// ============================================
// Search Service — Entry Point
// ============================================
// Provides file/folder search and full-text search.
// Uses Elasticsearch for fast indexing and querying.
// Business logic will be added in Module 6.
// ============================================

import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';

const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// Routes will be added in Module 6:
// app.use('/api/search', searchRoutes);

addErrorHandling(app, logger);
startServer(app, config.port, logger, config.serviceName);
