// ============================================
// Input Validation Schemas — Zod
// ============================================
// WHY Zod?
// - Runtime type validation (TypeScript only checks at compile-time)
// - Automatic error messages with field-level details
// - Type inference — Zod schemas generate TypeScript types
// - Composable — build complex schemas from simple ones
//
// WHY validate at the controller level?
// - Fail fast — reject bad input before it reaches business logic
// - Security — prevent injection attacks and malformed data
// - User experience — clear error messages about what's wrong
// ============================================

import { z } from 'zod';

/**
 * Registration schema — validates new user input.
 *
 * Password requirements (NIST SP 800-63B inspired):
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email must be 255 characters or less')
    .transform((val) => val.toLowerCase().trim()),

  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or less')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens',
    )
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be 128 characters or less')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be 50 characters or less')
    .transform((val) => val.trim()),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be 50 characters or less')
    .transform((val) => val.trim()),
});

/**
 * Login schema — validates credentials.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),

  password: z.string().min(1, 'Password is required'),
});

/**
 * Refresh token schema.
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Infer TypeScript types from Zod schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
