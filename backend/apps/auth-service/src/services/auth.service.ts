// ============================================
// Auth Service — Business Logic Layer
// ============================================
// This is where ALL authentication logic lives:
// - Password hashing and verification
// - JWT token generation and validation
// - User creation and lookup
// - Refresh token management
//
// WHY separate from controller?
// - Controllers handle HTTP (req/res) — Services handle logic
// - Services can be unit-tested without Express
// - Services can be reused by other parts of the system
//
// This follows the Service Layer pattern:
// Controller (HTTP) → Service (Logic) → Repository (Database)
// ============================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { prisma } from '@file-manager/database';
import type { User } from '@file-manager/database';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  createLogger,
} from '@file-manager/shared-utils';
import { config } from '../config';
import type { RegisterInput, LoginInput } from '../validators/auth.validator';

const logger = createLogger('auth-service');

// ============================================
// Redis Client for Token Management
// ============================================
// WHY Redis for tokens?
// - Sub-millisecond lookups (vs PostgreSQL's milliseconds)
// - Built-in TTL (time-to-live) — tokens auto-expire
// - Perfect for blacklisting: SET token "blacklisted" EX 900
// ============================================

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      enableOfflineQueue: false,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      logger.warn('Redis connection error (token features disabled)', { error: err.message });
    });

    redis.on('connect', () => {
      logger.info('Connected to Redis');
    });
  }
  return redis;
}

// ============================================
// Token Payload Interface
// ============================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// ============================================
// User Response (without sensitive fields)
// ============================================

function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role.toLowerCase(),
    storageUsed: Number(user.storageUsed),
    storageLimit: Number(user.storageLimit),
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ============================================
// Registration
// ============================================

/**
 * Register a new user.
 *
 * 1. Check for duplicate email/username
 * 2. Hash the password with bcrypt (12 rounds)
 * 3. Create user in database
 * 4. Generate JWT tokens
 * 5. Store refresh token in Redis
 *
 * WHY 12 bcrypt rounds?
 * - Each round doubles the computation time
 * - 12 rounds ≈ 250ms per hash (good balance of security and UX)
 * - OWASP recommends at least 10 rounds
 */
export async function register(input: RegisterInput) {
  // Check for existing email
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingEmail) {
    throw new ConflictError('Email already registered');
  }

  // Check for existing username
  const existingUsername = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (existingUsername) {
    throw new ConflictError('Username already taken');
  }

  // Hash password
  const SALT_ROUNDS = 12;
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    },
  });

  logger.info('User registered', { userId: user.id, email: user.email });

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token in Redis
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

// ============================================
// Login
// ============================================

/**
 * Authenticate a user with email and password.
 *
 * 1. Find user by email
 * 2. Verify password with bcrypt.compare
 * 3. Generate new JWT tokens
 * 4. Update lastLoginAt
 *
 * WHY bcrypt.compare?
 * - Constant-time comparison prevents timing attacks
 * - Attacker can't determine if email exists by response time
 */
export async function login(input: LoginInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    // Generic message prevents email enumeration
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  logger.info('User logged in', { userId: user.id, email: user.email });

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Store refresh token in Redis
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

// ============================================
// Get Current User (Profile)
// ============================================

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return sanitizeUser(user);
}

// ============================================
// Token Refresh
// ============================================

/**
 * Refresh an expired access token.
 *
 * Token rotation flow:
 * 1. Verify the refresh token's signature
 * 2. Check if it exists in Redis (hasn't been used/revoked)
 * 3. Delete the old refresh token (single-use)
 * 4. Generate new access + refresh token pair
 * 5. Store new refresh token in Redis
 *
 * WHY token rotation?
 * - If a refresh token is stolen, the attacker can only use it ONCE
 * - When the real user tries to refresh, it fails (old token deleted)
 * - This triggers the user to re-login, invalidating the attacker's session
 */
export async function refreshToken(token: string) {
  // Verify refresh token signature
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Check if refresh token exists in Redis (not already used)
  try {
    const r = getRedis();
    const storedToken = await r.get(`refresh:${payload.userId}`);
    if (storedToken !== token) {
      // Token has been used or revoked — possible token theft!
      logger.warn('Refresh token reuse detected', { userId: payload.userId });
      // Revoke all tokens for this user (security measure)
      await r.del(`refresh:${payload.userId}`);
      throw new UnauthorizedError('Refresh token has been revoked');
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    // Redis might be down — allow refresh without rotation check
    logger.warn('Redis unavailable for refresh token check');
  }

  // Generate new tokens
  const newTokens = generateTokens({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  // Store new refresh token (replaces old one)
  await storeRefreshToken(payload.userId, newTokens.refreshToken);

  logger.info('Token refreshed', { userId: payload.userId });

  return newTokens;
}

// ============================================
// Logout
// ============================================

/**
 * Logout by blacklisting the access token.
 *
 * WHY blacklist?
 * - JWTs are stateless — the server can't "invalidate" them
 * - We store the token in Redis with TTL matching its expiry
 * - On every request, middleware checks if the token is blacklisted
 * - When the JWT expires, Redis auto-deletes the blacklist entry
 */
export async function logout(accessToken: string, userId: string) {
  try {
    const r = getRedis();
    // Blacklist the access token until it expires
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
    const ttl = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;

    if (ttl > 0) {
      await r.set(`blacklist:${accessToken}`, '1', 'EX', ttl);
    }

    // Remove refresh token
    await r.del(`refresh:${userId}`);

    logger.info('User logged out', { userId });
  } catch (err) {
    // Redis might be down — log but don't fail the logout
    logger.warn('Redis unavailable during logout', { error: (err as Error).message });
  }
}

/**
 * Check if an access token is blacklisted (for middleware).
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const r = getRedis();
    const result = await r.get(`blacklist:${token}`);
    return result !== null;
  } catch {
    // Redis down — allow the request (fail open for availability)
    return false;
  }
}

// ============================================
// JWT Token Generation (Private Helpers)
// ============================================

/**
 * Generate access and refresh token pair.
 *
 * Access Token:
 * - Short-lived (15 minutes by default)
 * - Sent in Authorization header on every request
 * - Contains: userId, email, role
 *
 * Refresh Token:
 * - Long-lived (30 days by default)
 * - Used only to get new access tokens
 * - Stored in Redis, single-use (rotation)
 */
function generateTokens(payload: TokenPayload) {
  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });

  return { accessToken, refreshToken };
}

/**
 * Store refresh token in Redis with TTL.
 */
async function storeRefreshToken(userId: string, token: string) {
  try {
    const r = getRedis();
    // Store for 30 days (in seconds)
    await r.set(`refresh:${userId}`, token, 'EX', 30 * 24 * 60 * 60);
  } catch (err) {
    // Redis might be down — log but don't fail registration/login
    logger.warn('Failed to store refresh token in Redis', { error: (err as Error).message });
  }
}
