// ============================================
// Search Service — Entry Point
// ============================================
// Provides file/folder search, auto-complete suggestions,
// and Elasticsearch indexing.
// ============================================

import 'dotenv/config';
import { createApp, addErrorHandling, startServer } from '@file-manager/shared-utils';
import { config } from './config';
import { ensureIndex } from './services/elastic.service';
import searchRoutes from './routes/search.routes';

const { app, logger } = createApp({
  serviceName: config.serviceName,
  corsOrigin: config.corsOrigin,
});

// ---- Register Routes ----
app.use('/api/search', searchRoutes);

// ---- Finalize ----
addErrorHandling(app, logger);

// Boot sequence: Ensure Elasticsearch index exists then start server
async function main() {
  try {
    await ensureIndex();
    startServer(app, config.port, logger, config.serviceName);
  } catch (error) {
    logger.error('Failed to start search service', { error });
    // Still start server so healthcheck endpoint responds even if ES is warming up
    startServer(app, config.port, logger, config.serviceName);
  }
}

main();
