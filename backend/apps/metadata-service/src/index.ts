// ============================================
// Metadata Service — Entry Point
// ============================================
// Manages file metadata, folder hierarchy,
// ownership, permissions, and sharing.
// ============================================

import 'dotenv/config';
import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';
import metadataRoutes from './routes/metadata.routes';

const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// ---- Register Routes ----
app.use('/api/metadata', metadataRoutes);

// ---- Finalize ----
addErrorHandling(app, logger);
startServer(app, config.port, logger, config.serviceName);
