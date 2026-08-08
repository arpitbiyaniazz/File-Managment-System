// ============================================
// Folder Service
// ============================================
// Business logic for folder CRUD operations.
//
// KEY DESIGN: Adjacency List pattern
// Each folder has a parentId pointing to its parent.
// parentId = null means root-level.
// ============================================

import { prisma } from '@file-manager/database';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError, createLogger, publishEvent, ROUTING_KEYS, getCache, setCache, delByPattern } from '@file-manager/shared-utils';

const logger = createLogger('folder-service');

// Helper to serialize BigInt fields for JSON
function serializeFile(file: any) {
  return { ...file, size: Number(file.size) };
}

/**
 * Create a new folder.
 */
export async function createFolder(userId: string, name: string, parentId?: string | null) {
  // If parentId is provided, verify it exists and belongs to the user
  if (parentId) {
    const parent = await prisma.folder.findUnique({ where: { id: parentId } });
    if (!parent) throw new NotFoundError('Parent folder not found');
    if (parent.ownerId !== userId) throw new ForbiddenError('You do not own the parent folder');
  }

  // Check for duplicate folder name in the same location
  const existing = await prisma.folder.findFirst({
    where: { name, parentId: parentId || null, ownerId: userId },
  });
  if (existing) throw new ConflictError('A folder with this name already exists here');

  const folder = await prisma.folder.create({
    data: {
      name,
      parentId: parentId || null,
      ownerId: userId,
    },
  });

  logger.info('Folder created', { folderId: folder.id, name, userId });

  // Invalidate user folder contents cache
  delByPattern(`fm:folder:${userId}:*`).catch(err => logger.warn('Failed to invalidate folder cache', { error: err }));

  // Publish async event to RabbitMQ
  publishEvent(ROUTING_KEYS.FOLDER_CREATED, {
    folderId: folder.id,
    name: folder.name,
    ownerId: userId,
    parentId: folder.parentId,
  }).catch(err => logger.error('Failed to publish FOLDER_CREATED event', { error: err }));

  return folder;
}

/**
 * Get a single folder's details (with children count and files count).
 */
export async function getFolder(folderId: string, userId: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      _count: { select: { children: true, files: true } },
    },
  });

  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== userId) {
    // Check if folder is shared with this user
    const share = await prisma.share.findFirst({
      where: { folderId, sharedWithId: userId },
    });
    if (!share) throw new ForbiddenError('You do not have access to this folder');
  }

  return folder;
}

/**
 * List the contents of a folder (subfolders + files).
 * Uses Cache-Aside pattern with 5-minute TTL.
 */
export async function getFolderContents(userId: string, folderId?: string | null) {
  const cacheKey = `fm:folder:${userId}:${folderId || 'root'}:contents`;

  // 1. Check Redis Cache First
  const cached = await getCache<any>(cacheKey);
  if (cached) {
    logger.debug('Cache HIT for folder contents', { cacheKey });
    return cached;
  }

  logger.debug('Cache MISS for folder contents (querying DB)', { cacheKey });

  // If accessing a specific folder, verify access
  if (folderId) {
    await getFolder(folderId, userId); // throws if no access
  }

  // 2. Query PostgreSQL
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { ownerId: userId, parentId: folderId || null },
      include: { _count: { select: { children: true, files: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.file.findMany({
      where: { ownerId: userId, folderId: folderId || null },
      orderBy: { originalName: 'asc' },
    }),
  ]);

  const result = {
    folders,
    files: files.map(serializeFile),
  };

  // 3. Populate Redis Cache (TTL 300s = 5m)
  await setCache(cacheKey, result, 300);

  return result;
}

/**
 * Rename a folder.
 */
export async function renameFolder(folderId: string, userId: string, newName: string) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== userId) throw new ForbiddenError('You do not own this folder');

  // Check for name collision in same parent
  const existing = await prisma.folder.findFirst({
    where: { name: newName, parentId: folder.parentId, ownerId: userId, id: { not: folderId } },
  });
  if (existing) throw new ConflictError('A folder with this name already exists here');

  const updated = await prisma.folder.update({
    where: { id: folderId },
    data: { name: newName },
  });

  logger.info('Folder renamed', { folderId, newName });
  return updated;
}

/**
 * Move a folder to a new parent.
 * Prevents circular references (moving a folder into its own descendant).
 */
export async function moveFolder(folderId: string, userId: string, newParentId: string | null) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== userId) throw new ForbiddenError('You do not own this folder');

  // Can't move to the same location
  if (folder.parentId === newParentId) {
    throw new BadRequestError('Folder is already in this location');
  }

  // If moving to a new parent, verify it exists and check for circularity
  if (newParentId) {
    const newParent = await prisma.folder.findUnique({ where: { id: newParentId } });
    if (!newParent) throw new NotFoundError('Target folder not found');
    if (newParent.ownerId !== userId) throw new ForbiddenError('You do not own the target folder');

    // CIRCULAR REFERENCE CHECK:
    // Walk up from newParentId to root. If we encounter folderId, it's circular.
    let current: string | null = newParentId;
    while (current) {
      if (current === folderId) {
        throw new BadRequestError('Cannot move a folder into its own descendant');
      }
      const parent: { parentId: string | null } | null = await prisma.folder.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      current = parent?.parentId ?? null;
    }

    // Name collision check
    const existing = await prisma.folder.findFirst({
      where: { name: folder.name, parentId: newParentId, ownerId: userId, id: { not: folderId } },
    });
    if (existing) throw new ConflictError('A folder with this name already exists in the target');
  }

  const updated = await prisma.folder.update({
    where: { id: folderId },
    data: { parentId: newParentId },
  });

  logger.info('Folder moved', { folderId, newParentId });
  return updated;
}

/**
 * Delete a folder and all its contents recursively.
 *
 * Because we set onDelete: Cascade on the Folder self-relation,
 * Prisma/Postgres will cascade-delete child folders automatically.
 * But we need to handle files ourselves (they use SetNull).
 *
 * Strategy: collect all descendant folder IDs, delete their files, then delete the folder.
 */
export async function deleteFolder(folderId: string, userId: string) {
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== userId) throw new ForbiddenError('You do not own this folder');

  // Collect all descendant folder IDs (BFS)
  const allFolderIds: string[] = [folderId];
  let queue = [folderId];

  while (queue.length > 0) {
    const children = await prisma.folder.findMany({
      where: { parentId: { in: queue } },
      select: { id: true },
    });
    const childIds = children.map((c) => c.id);
    allFolderIds.push(...childIds);
    queue = childIds;
  }

  // Calculate total size of files being deleted (for storage accounting)
  const fileSizeResult = await prisma.file.aggregate({
    where: { folderId: { in: allFolderIds } },
    _sum: { size: true },
  });
  const totalSize = fileSizeResult._sum.size || BigInt(0);

  // Transaction: delete shares, files, folders, update storage
  await prisma.$transaction([
    // Delete shares for these folders and their files
    prisma.share.deleteMany({ where: { folderId: { in: allFolderIds } } }),
    prisma.share.deleteMany({
      where: { file: { folderId: { in: allFolderIds } } },
    }),
    // Delete files in these folders
    prisma.file.deleteMany({ where: { folderId: { in: allFolderIds } } }),
    // Delete the folder (cascade deletes children)
    prisma.folder.delete({ where: { id: folderId } }),
    // Update user storage
    prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { decrement: totalSize } },
    }),
  ]);

  logger.info('Folder deleted recursively', { folderId, foldersDeleted: allFolderIds.length });

  // Invalidate folder cache
  delByPattern(`fm:folder:${userId}:*`).catch(err => logger.warn('Failed to invalidate folder cache', { error: err }));

  // Publish async event for each deleted folder
  allFolderIds.forEach((id) => {
    publishEvent(ROUTING_KEYS.FOLDER_DELETED, {
      folderId: id,
      ownerId: userId,
    }).catch((err) => logger.error('Failed to publish FOLDER_DELETED event', { error: err }));
  });
}
