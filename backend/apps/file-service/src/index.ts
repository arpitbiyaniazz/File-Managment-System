// ============================================
// File Service — Entry Point
// ============================================
// Boots the Express server, registers routes,
// and handles file uploads/downloads via MinIO.
// ============================================

import 'dotenv/config';
import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';
import fileRoutes from './routes/file.routes';

const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// ---- Register Routes ----
app.use('/api/files', fileRoutes);

// ---- Finalize ----
addErrorHandling(app, logger);

// Start the server
startServer(app, config.port, logger, config.serviceName);
