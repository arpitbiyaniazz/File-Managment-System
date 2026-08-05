// ============================================
// Auth Service — Entry Point
// ============================================
// Boots the Express server, registers auth routes,
// and starts listening for requests.
//
// This service handles:
// - User registration & login
// - JWT token generation & refresh
// - Logout with token blacklisting
// - User profile retrieval
// ============================================

import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';
import authRoutes from './routes/auth.routes';

// Create the Express app with standard middleware
const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// ---- Register Routes ----
app.use('/api/auth', authRoutes);

// ---- Finalize ----
addErrorHandling(app, logger);

// Start the server
startServer(app, config.port, logger, config.serviceName);
