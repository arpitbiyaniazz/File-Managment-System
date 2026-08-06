// ============================================
// Share Service
// ============================================
// Manages file/folder sharing between users.
//
// DESIGN: Sharing a folder implicitly grants access
// to all files within it. This is checked at query time
// rather than creating individual share records for each file.
// ============================================

import { prisma } from '@file-manager/database';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError, createLogger } from '@file-manager/shared-utils';

const logger = createLogger('share-service');

/**
 * Share a file or folder with another user (by email).
 */
export async function createShare(
  userId: string,
  email: string,
  permission: 'VIEWER' | 'EDITOR',
  fileId?: string,
  folderId?: string,
): Promise<any> {
  // Find the target user by email
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) throw new NotFoundError('User not found with that email');
  if (targetUser.id === userId) throw new BadRequestError('Cannot share with yourself');

  // Verify the sharer owns the resource
  if (fileId) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundError('File not found');
    if (file.ownerId !== userId) throw new ForbiddenError('You do not own this file');

    // Check for existing share
    const existing = await prisma.share.findUnique({
      where: { sharedWithId_fileId: { sharedWithId: targetUser.id, fileId } },
    });
    if (existing) throw new ConflictError('Already shared with this user');
  }

  if (folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== userId) throw new ForbiddenError('You do not own this folder');

    const existing = await prisma.share.findUnique({
      where: { sharedWithId_folderId: { sharedWithId: targetUser.id, folderId } },
    });
    if (existing) throw new ConflictError('Already shared with this user');
  }

  const share = await prisma.share.create({
    data: {
      permission,
      sharedById: userId,
      sharedWithId: targetUser.id,
      fileId: fileId || null,
      folderId: folderId || null,
    },
    include: {
      sharedWith: { select: { id: true, email: true, firstName: true, lastName: true } },
      file: fileId ? { select: { id: true, originalName: true } } : false,
      folder: folderId ? { select: { id: true, name: true } } : false,
    },
  });

  logger.info('Resource shared', { shareId: share.id, userId, targetEmail: email });
  return share;
}

/**
 * List all items shared with the current user.
 */
export async function getSharedWithMe(userId: string): Promise<any[]> {
  const shares = await prisma.share.findMany({
    where: { sharedWithId: userId },
    include: {
      sharedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      file: { select: { id: true, originalName: true, mimeType: true, size: true } },
      folder: {
        include: { _count: { select: { children: true, files: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize BigInt fields in files
  return shares.map((s) => ({
    ...s,
    file: s.file ? { ...s.file, size: Number(s.file.size) } : null,
  }));
}

/**
 * Revoke a share.
 */
export async function revokeShare(shareId: string, userId: string) {
  const share = await prisma.share.findUnique({ where: { id: shareId } });
  if (!share) throw new NotFoundError('Share not found');

  // Only the person who shared it can revoke it
  if (share.sharedById !== userId) {
    throw new ForbiddenError('You did not create this share');
  }

  await prisma.share.delete({ where: { id: shareId } });
  logger.info('Share revoked', { shareId, userId });
}
