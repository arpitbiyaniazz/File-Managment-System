// ============================================
// Auth Controller — HTTP Request Handling
// ============================================
// Controllers are thin. They do three things:
// 1. Parse and validate the request (Zod)
// 2. Call the service layer
// 3. Format and send the response
//
// NO business logic belongs here.
// ============================================

import { Request, Response, NextFunction } from 'express';
import { successResponse } from '@file-manager/shared-utils';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import * as authService from '../services/auth.service';
import { ValidationError } from '@file-manager/shared-utils';

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate input
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
    }

    // Call service
    const data = await authService.register(result.data);

    // Respond
    res.status(201).json(
      successResponse(data, 'Registration successful', req.headers['x-request-id'] as string),
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
    }

    const data = await authService.login(result.data);

    res.json(
      successResponse(data, 'Login successful', req.headers['x-request-id'] as string),
    );
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Requires: JWT authentication
 */
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    // req.user is attached by the auth middleware
    const user = (req as any).user as authService.TokenPayload;
    const data = await authService.getCurrentUser(user.userId);

    res.json(
      successResponse(data, undefined, req.headers['x-request-id'] as string),
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = refreshTokenSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.flatten().fieldErrors);
    }

    const data = await authService.refreshToken(result.data.refreshToken);

    res.json(
      successResponse(data, 'Token refreshed', req.headers['x-request-id'] as string),
    );
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/logout
 * Requires: JWT authentication
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user as authService.TokenPayload;
    const token = req.headers.authorization?.replace('Bearer ', '') || '';

    await authService.logout(token, user.userId);

    res.json(
      successResponse(null, 'Logged out successfully', req.headers['x-request-id'] as string),
    );
  } catch (error) {
    next(error);
  }
}
