// ============================================
// Role-Based Access Control (RBAC) Middleware
// ============================================
// Checks if the authenticated user has the required role.
// Must be used AFTER the auth middleware (req.user must exist).
//
// Three-tier model:
// - ADMIN: full access, manage users
// - USER: standard access, own files
// - VIEWER: read-only, view shared files
//
// @example
// ```ts
// router.delete('/users/:id', authenticate, authorize('admin'), deleteUser);
// router.get('/files', authenticate, authorize('user', 'admin'), getFiles);
// ```
// ============================================

import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors';

/**
 * Create RBAC middleware that restricts access to specific roles.
 *
 * @param allowedRoles - Roles that are permitted to access the route
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRole = req.user.role.toLowerCase();
      const allowed = allowedRoles.map((r) => r.toLowerCase());

      if (!allowed.includes(userRole)) {
        throw new ForbiddenError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
