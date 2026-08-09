// ============================================
// JWT Authentication Middleware
// ============================================
// This middleware protects routes by verifying JWT tokens.
// It lives in shared-utils so ALL services can use it.
//
// HOW it works:
// 1. Extract token from "Authorization: Bearer <token>" header
// 2. Verify the token's signature using the JWT secret
// 3. Optionally check if the token is blacklisted (Redis)
// 4. Attach the decoded payload to req.user
// 5. Call next() to proceed, or throw 401
//
// WHY in shared-utils?
// - Every service needs to verify tokens (not just auth-service)
// - File Service, Metadata Service, Search Service all need to
//   know who the user is before processing requests
// ============================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';
import { redis } from '../cache';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

interface AuthMiddlewareOptions {
  /** JWT secret key for signature verification */
  jwtSecret: string;
  /** Optional function to check if a token is blacklisted */
  isTokenBlacklisted?: (token: string) => Promise<boolean>;
}

/**
 * Create JWT authentication middleware.
 *
 * @example
 * ```ts
 * import { createAuthMiddleware } from '@file-manager/shared-utils';
 *
 * const authenticate = createAuthMiddleware({
 *   jwtSecret: config.jwt.secret,
 *   isTokenBlacklisted: authService.isTokenBlacklisted,
 * });
 *
 * router.get('/me', authenticate, getMe);
 * ```
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // 1. Extract token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('No authentication token provided');
      }

      const token = authHeader.substring(7); // Remove "Bearer "

      // 2. Verify JWT signature and expiration
      let payload: JwtPayload;
      try {
        payload = jwt.verify(token, options.jwtSecret) as JwtPayload;
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedError('Token has expired');
        }
        if (err instanceof jwt.JsonWebTokenError) {
          throw new UnauthorizedError('Invalid token');
        }
        throw new UnauthorizedError('Authentication failed');
      }

      // 3. Check blacklist in Redis (automatic for all microservices)
      const checkBlacklist = options.isTokenBlacklisted || (async (t: string) => {
        try {
          const isRevoked = await redis.get(`blacklist:${t}`);
          return isRevoked !== null;
        } catch {
          return false;
        }
      });

      const blacklisted = await checkBlacklist(token);
      if (blacklisted) {
        throw new UnauthorizedError('Token has been revoked');
      }

      // 4. Attach user to request
      req.user = payload;

      next();
    } catch (error) {
      next(error);
    }
  };
}
