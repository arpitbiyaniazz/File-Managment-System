// ============================================
// Redis Cache Utility
// ============================================
// Shared Redis cache client with automatic failover fallback.
// If Redis is offline or unreachable, cache reads return null
// and writes fail silently so DB operations continue seamlessly.
// ============================================

import Redis from 'ioredis';
import { createLogger } from './logger';

const logger = createLogger('redis-cache');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redis = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 1,
  connectTimeout: 1000,
  enableOfflineQueue: false,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('Connected to Redis Cache');
});

redis.on('error', (err) => {
  logger.warn('Redis Cache Error (Falling back to DB)', { error: err.message });
});

// Ensure initial connection attempt without crashing process
redis.connect().catch((err) => {
  logger.warn('Initial Redis connection failed (will retry in background)', { error: err.message });
});

/**
 * Get item from cache. Returns null on cache miss or Redis error.
 */
export async function getCache<T = any>(key: string): Promise<T | null> {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.warn(`Cache read error for key [${key}] (falling back to DB)`, { error });
    return null;
  }
}

/**
 * Set item in cache with TTL (default 300 seconds / 5 minutes).
 */
export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
  try {
    const payload = JSON.stringify(value);
    await redis.set(key, payload, 'EX', ttlSeconds);
    return true;
  } catch (error) {
    logger.warn(`Cache write error for key [${key}]`, { error });
    return false;
  }
}

/**
 * Delete a specific cache key.
 */
export async function delCache(key: string): Promise<boolean> {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.warn(`Cache delete error for key [${key}]`, { error });
    return false;
  }
}

/**
 * Delete keys matching a wildcard pattern (e.g., 'fm:folder:123*').
 */
export async function delByPattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Invalidated ${keys.length} cache keys for pattern [${pattern}]`);
    }
    return keys.length;
  } catch (error) {
    logger.warn(`Cache delete by pattern error [${pattern}]`, { error });
    return 0;
  }
}
