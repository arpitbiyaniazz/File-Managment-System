// ============================================
// Auth Service — Entry Point
// ============================================
// This is the skeleton. It boots Express, registers
// the middleware stack, and listens on port 3001.
//
// Business logic (registration, login, JWT) will
// be added in Module 2.
// ============================================

import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';

// Create the Express app with standard middleware
const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// ---- Service Routes ----
// Routes will be added here in Module 2:
// app.use('/api/auth', authRoutes);

// ---- Finalize ----
// Error handling MUST be added after all routes
addErrorHandling(app, logger);

// Start the server with graceful shutdown
startServer(app, config.port, logger, config.serviceName);
