// ============================================
// Shared Utils — Public API
// ============================================
// Single entry point for all shared utilities.
// Services import from '@file-manager/shared-utils'
// ============================================

export { createLogger } from './logger';

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  PayloadTooLargeError,
  InsufficientStorageError,
} from './errors';

export { successResponse, errorResponse, paginatedResponse } from './response';

export { createApp, addErrorHandling, startServer } from './app';
export type { AppConfig, AppContext } from './app';

export { createAuthMiddleware } from './middleware/auth.middleware';
export type { JwtPayload } from './middleware/auth.middleware';
export { authorize } from './middleware/rbac.middleware';

export { publishEvent, EXCHANGE_NAME, DLX_EXCHANGE_NAME, ROUTING_KEYS } from './rabbitmq';

export { getCache, setCache, delCache, delByPattern, redis } from './cache';
