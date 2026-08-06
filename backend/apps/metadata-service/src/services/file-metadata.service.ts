// ============================================
// File Metadata Service
// ============================================
// Manages file metadata operations: list, get, rename, move.
// Actual file binary data lives in MinIO (handled by file-service).
// ============================================

import { prisma } from '@file-manager/database';
import { NotFoundError, ForbiddenError, createLogger } from '@file-manager/shared-utils';

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
 * Get a single file's metadata.
 */
export async function getFile(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { folder: { select: { id: true, name: true } } },
  });

  if (!file) throw new NotFoundError('File not found');

  // Check ownership or share access
  if (file.ownerId !== userId) {
    const share = await prisma.share.findFirst({
      where: { fileId, sharedWithId: userId },
    });
    if (!share) throw new ForbiddenError('You do not have access to this file');
  }

  return serializeFile(file);
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

  logger.info('File moved', { fileId, folderId });
  return serializeFile(updated);
}
