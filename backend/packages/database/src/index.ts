// ============================================
// Prisma Client Singleton
// ============================================
// WHY a singleton?
// - Prisma Client manages a connection pool internally
// - Creating multiple instances wastes database connections
// - In development, hot-reload creates new instances on every change
// - The singleton pattern ensures we reuse the same connection pool
//
// This is a well-known pattern recommended by Prisma:
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
// ============================================

import { PrismaClient } from '@prisma/client';

// Extend the global object to store the Prisma instance
// This survives hot-reloads in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma client singleton.
 *
 * In development: reuses the same instance across hot-reloads
 * In production: creates a single instance per process
 *
 * @example
 * ```ts
 * import { prisma } from '@file-manager/database';
 *
 * const user = await prisma.user.findUnique({ where: { id } });
 * ```
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export Prisma types so services can import from one place
export { PrismaClient } from '@prisma/client';
export type { User, Role, File } from '@prisma/client';
