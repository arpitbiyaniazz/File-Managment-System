// ============================================
// Structured Logger — Winston
// ============================================
// WHY structured logging?
// - JSON logs can be parsed by log aggregators (ELK, Datadog, CloudWatch)
// - Request IDs enable distributed tracing across services
// - Log levels let you filter noise in production
//
// WHY Winston?
// - Most popular Node.js logger (40M+ weekly downloads)
// - Supports multiple transports (console, file, HTTP)
// - Structured JSON output by default
// ============================================

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom format for development — human-readable colored output
 */
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, service, requestId, ...meta }) => {
    const svc = service ? `[${service}]` : '';
    const reqId = requestId ? `[${requestId}]` : '';
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level} ${svc}${reqId} ${message}${metaStr}`;
  }),
);

/**
 * Production format — structured JSON for log aggregators
 */
const prodFormat = combine(timestamp(), errors({ stack: true }), winston.format.json());

/**
 * Create a logger instance for a specific service.
 *
 * @param serviceName - The name of the service (e.g., 'auth-service')
 * @returns Winston logger instance
 *
 * @example
 * ```ts
 * const logger = createLogger('auth-service');
 * logger.info('Server started', { port: 3001 });
 * logger.error('Failed to connect', { error: err.message });
 * ```
 */
export function createLogger(serviceName: string): winston.Logger {
  const isProduction = process.env.NODE_ENV === 'production';

  return winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    defaultMeta: { service: serviceName },
    format: isProduction ? prodFormat : devFormat,
    transports: [
      new winston.transports.Console(),
      // In production, you might add:
      // new winston.transports.File({ filename: 'error.log', level: 'error' }),
      // new winston.transports.File({ filename: 'combined.log' }),
    ],
  });
}
