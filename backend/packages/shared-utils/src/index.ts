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
