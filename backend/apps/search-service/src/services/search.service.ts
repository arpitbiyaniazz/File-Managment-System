// ============================================
// Search Business Logic Service
// ============================================
// Bridges database data (Prisma) with Elasticsearch.
// ============================================

import { prisma } from '@file-manager/database';
import * as elasticService from './elastic.service';
import { createLogger } from '@file-manager/shared-utils';

const logger = createLogger('search-business-service');

/**
 * Reindex all files and folders from PostgreSQL into Elasticsearch.
 */
export async function reindexAll(): Promise<{ filesIndexed: number; foldersIndexed: number }> {
  logger.info('Starting full database reindex into Elasticsearch...');

  const [files, folders] = await Promise.all([
    prisma.file.findMany(),
    prisma.folder.findMany(),
  ]);

  const fileDocs: elasticService.SearchItemDocument[] = files.map((file) => ({
    id: file.id,
    itemType: 'FILE',
    name: file.originalName,
    ownerId: file.ownerId,
    mimeType: file.mimeType,
    size: Number(file.size),
    folderId: file.folderId,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  }));

  const folderDocs: elasticService.SearchItemDocument[] = folders.map((folder) => ({
    id: folder.id,
    itemType: 'FOLDER',
    name: folder.name,
    ownerId: folder.ownerId,
    folderId: folder.parentId,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  }));

  const allDocs = [...fileDocs, ...folderDocs];
  await elasticService.bulkIndexDocuments(allDocs);

  logger.info('Reindex complete', { files: fileDocs.length, folders: folderDocs.length });

  return {
    filesIndexed: fileDocs.length,
    foldersIndexed: folderDocs.length,
  };
}
