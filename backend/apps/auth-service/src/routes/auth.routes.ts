// ============================================
// Auth Routes
// ============================================
// Defines the URL → Controller mapping for auth endpoints.
//
// Route structure:
// POST /api/auth/register  — Create new account
// POST /api/auth/login     — Authenticate
// POST /api/auth/refresh   — Get new access token
// POST /api/auth/logout    — Invalidate tokens (protected)
// GET  /api/auth/me        — Get current user (protected)
// ============================================

import { Router } from 'express';
import { createAuthMiddleware } from '@file-manager/shared-utils';
import * as authController from '../controllers/auth.controller';
import { isTokenBlacklisted } from '../services/auth.service';
import { config } from '../config';

const router: Router = Router();

// Create auth middleware instance for this service
const authenticate = createAuthMiddleware({
  jwtSecret: config.jwt.secret,
  isTokenBlacklisted,
});

// ---- Public Routes (no auth required) ----
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// ---- Protected Routes (JWT required) ----
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

export default router;
