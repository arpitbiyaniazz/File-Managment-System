// ============================================
// Custom Error Classes
// ============================================
// WHY custom errors?
// - Built-in Error class doesn't carry HTTP status codes
// - Custom errors let middleware automatically set the right status code
// - Consistent error format across all services
//
// HOW it works:
// 1. Service throws `new NotFoundError('File not found')`
// 2. Error middleware catches it
// 3. Middleware reads statusCode (404) and sends proper response
// ============================================

/**
 * Base application error — all custom errors extend this.
 * Carries an HTTP status code and an error code string.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Operational errors are expected (not bugs)
    this.details = details;

    // Preserve proper stack trace (only available in V8 engines)
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly (required when extending built-in classes)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 400 Bad Request — invalid input, missing fields, validation failures
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: unknown) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

/**
 * 401 Unauthorized — missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden — authenticated but lacking permissions
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found — resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict — duplicate resource, version conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * 422 Unprocessable Entity — semantically invalid request
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

/**
 * 429 Too Many Requests — rate limit exceeded
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * 413 Payload Too Large — file size exceeds limit
 */
export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Payload too large') {
    super(message, 413, 'PAYLOAD_TOO_LARGE');
  }
}

/**
 * 507 Insufficient Storage — user's storage quota exceeded
 */
export class InsufficientStorageError extends AppError {
  constructor(message: string = 'Storage quota exceeded') {
    super(message, 507, 'INSUFFICIENT_STORAGE');
  }
}
