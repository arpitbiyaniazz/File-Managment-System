// ============================================
// File Metadata Service
// ============================================
// Manages file metadata operations: list, get, rename, move.
// Actual file binary data lives in MinIO (handled by file-service).
// ============================================

import { prisma } from '@file-manager/database';
import { NotFoundError, ForbiddenError, createLogger, getCache, setCache, delCache, delByPattern } from '@file-manager/shared-utils';

const logger = createLogger('file-metadata-service');

function serializeFile(file: any) {
  return { ...file, size: Number(file.size) };
}

/**
 * List files belonging to the user, optionally filtered by folder.
 */
export async function listFiles(userId: string, folderId?: string | null) {
  const files = await prisma.file.findMany({
    where: {
      ownerId: userId,
      folderId: folderId || null,
    },
    orderBy: { originalName: 'asc' },
  });

  return files.map(serializeFile);
}

/**
 * Get a single file's metadata with Cache-Aside (TTL 10m).
 */
export async function getFile(fileId: string, userId: string) {
  const cacheKey = `fm:file:${fileId}`;

  let file = await getCache<any>(cacheKey);

  if (!file) {
    logger.debug('Cache MISS for file metadata (querying DB)', { cacheKey });

    const rawFile = await prisma.file.findUnique({
      where: { id: fileId },
      include: { folder: { select: { id: true, name: true } } },
    });

    if (!rawFile) throw new NotFoundError('File not found');

    file = serializeFile(rawFile);
    await setCache(cacheKey, file, 600); // 10 minutes TTL
  } else {
    logger.debug('Cache HIT for file metadata', { cacheKey });
  }

  // CRITICAL SECURITY FIX: ALWAYS check ownership or share permission, EVEN ON CACHE HIT!
  if (file.ownerId !== userId) {
    const share = await prisma.share.findFirst({
      where: { fileId, sharedWithId: userId },
    });
    if (!share) throw new ForbiddenError('You do not have access to this file');
  }

  return file;
}

/**
 * Rename a file.
 */
export async function renameFile(fileId: string, userId: string, newName: string) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File not found');
  if (file.ownerId !== userId) throw new ForbiddenError('You do not own this file');

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { originalName: newName },
  });

  // Invalidate file cache & folder contents cache
  delCache(`fm:file:${fileId}`).catch(e => logger.warn('Cache del error', { error: e }));
  delByPattern(`fm:folder:${userId}:*`).catch(e => logger.warn('Cache pattern del error', { error: e }));

  logger.info('File renamed', { fileId, newName });
  return serializeFile(updated);
}

/**
 * Move a file to a different folder.
 */
export async function moveFile(fileId: string, userId: string, folderId: string | null) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File not found');
  if (file.ownerId !== userId) throw new ForbiddenError('You do not own this file');

  // If moving to a folder, verify it exists and belongs to user
  if (folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundError('Target folder not found');
    if (folder.ownerId !== userId) throw new ForbiddenError('You do not own the target folder');
  }

  const updated = await prisma.file.update({
    where: { id: fileId },
    data: { folderId },
  });

  // Invalidate file cache & folder contents cache
  delCache(`fm:file:${fileId}`).catch(e => logger.warn('Cache del error', { error: e }));
  delByPattern(`fm:folder:${userId}:*`).catch(e => logger.warn('Cache pattern del error', { error: e }));

  logger.info('File moved', { fileId, folderId });
  return serializeFile(updated);
}
