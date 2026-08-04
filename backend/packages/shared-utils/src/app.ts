// ============================================
// Express App Factory
// ============================================
// WHY a factory?
// - All 4 services share the same middleware stack
// - DRY: define CORS, helmet, compression, error handling ONCE
// - Each service only adds its own routes
//
// This is the TEMPLATE pattern — every service calls
// createApp() and gets a fully-configured Express app.
// ============================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from './errors';
import { createLogger } from './logger';
import { errorResponse } from './response';
import type winston from 'winston';

export interface AppConfig {
  serviceName: string;
  corsOrigin?: string;
}

export interface AppContext {
  app: Express;
  logger: winston.Logger;
}

/**
 * Create a configured Express application with standard middleware.
 *
 * Middleware stack (order matters!):
 * 1. Request ID — attach unique ID for distributed tracing
 * 2. Helmet — security headers (XSS, HSTS, etc.)
 * 3. CORS — cross-origin resource sharing
 * 4. Compression — gzip response bodies
 * 5. JSON parser — parse request bodies
 * 6. Request logger — log every incoming request
 * 7. Health check — /health endpoint
 * 8. [Service routes go here]
 * 9. 404 handler — catch unmatched routes
 * 10. Error handler — catch all errors
 */
export function createApp(config: AppConfig): AppContext {
  const app = express();
  const logger = createLogger(config.serviceName);

  // ---- 1. Request ID Middleware ----
  // Attaches a unique ID to every request for distributed tracing
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
    next();
  });

  // ---- 2. Security Headers ----
  app.use(helmet());

  // ---- 3. CORS ----
  app.use(
    cors({
      origin: config.corsOrigin || process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    }),
  );

  // ---- 4. Compression ----
  app.use(compression());

  // ---- 5. JSON Body Parser ----
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ---- 6. Request Logger ----
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] as string;

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`, {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        requestId,
      });
    });

    next();
  });

  // ---- 7. Health Check ----
  // Every service MUST have a /health endpoint
  // Used by Docker, Kubernetes, and load balancers to check if the service is alive
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: config.serviceName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  return { app, logger };
}

/**
 * Add error handling middleware AFTER all routes are registered.
 * Must be called after all routes are added to the app.
 */
export function addErrorHandling(app: Express, logger: winston.Logger): void {
  // ---- 9. 404 Handler ----
  app.use((_req: Request, res: Response) => {
    res.status(404).json(errorResponse('NOT_FOUND', 'Route not found'));
  });

  // ---- 10. Global Error Handler ----
  // Express identifies error handlers by having 4 parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.headers['x-request-id'] as string;

    if (err instanceof AppError) {
      // Operational error — expected, send the error message to client
      logger.warn(`Operational error: ${err.message}`, {
        code: err.code,
        statusCode: err.statusCode,
        requestId,
      });

      res.status(err.statusCode).json(errorResponse(err.code, err.message, err.details, requestId));
      return;
    }

    // Unknown error — this is a bug, don't leak internals
    logger.error(`Unexpected error: ${err.message}`, {
      stack: err.stack,
      requestId,
    });

    res.status(500).json(
      errorResponse(
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
        undefined,
        requestId,
      ),
    );
  });
}

/**
 * Start the Express server with graceful shutdown support.
 *
 * WHY graceful shutdown?
 * - In production, Kubernetes/Docker sends SIGTERM before killing a pod/container
 * - We need to stop accepting new requests and finish in-flight requests
 * - This prevents 502/503 errors during deployments
 */
export function startServer(
  app: Express,
  port: number,
  logger: winston.Logger,
  serviceName: string,
): void {
  const server = app.listen(port, () => {
    logger.info(`🚀 ${serviceName} running on port ${port}`, {
      port,
      nodeEnv: process.env.NODE_ENV || 'development',
    });
  });

  // Graceful Shutdown Handlers
  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);

    server.close(() => {
      logger.info('Server closed. Process terminating.');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long (10 seconds)
    setTimeout(() => {
      logger.error('Forced shutdown — graceful shutdown timed out');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled rejections (e.g., forgotten await)
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection', { reason });
  });

  // Handle uncaught exceptions (should rarely happen)
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });
}
