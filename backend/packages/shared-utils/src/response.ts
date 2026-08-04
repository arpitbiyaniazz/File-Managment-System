// ============================================
// Standard API Response Formatter
// ============================================
// WHY standardized responses?
// - Frontend always knows the shape of the response
// - Consistent error handling on the client side
// - Pagination follows a predictable pattern
//
// Every response from every service follows:
// { success: boolean, data?, message?, timestamp, requestId }
// ============================================

import { v4 as uuidv4 } from 'uuid';

// Inline response types to avoid circular dependency with shared-types
// These match the interfaces defined in @file-manager/shared-types

interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

interface IApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  requestId: string;
}

interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Format a successful API response.
 *
 * @example
 * ```ts
 * res.json(successResponse(user, 'User created successfully'));
 * ```
 */
export function successResponse<T>(
  data: T,
  message?: string,
  requestId?: string,
): IApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  };
}

/**
 * Format an error API response.
 *
 * @example
 * ```ts
 * res.status(404).json(errorResponse('NOT_FOUND', 'File not found'));
 * ```
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
  requestId?: string,
): IApiError {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  };
}

/**
 * Format a paginated API response.
 *
 * @param data - Array of items for the current page
 * @param total - Total number of items across all pages
 * @param page - Current page number (1-indexed)
 * @param limit - Items per page
 *
 * @example
 * ```ts
 * const files = await getFiles({ page: 2, limit: 20 });
 * res.json(paginatedResponse(files.data, files.total, 2, 20));
 * ```
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  requestId?: string,
): IPaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  };
}
