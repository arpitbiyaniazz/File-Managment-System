// ============================================
// File Business Logic Service
// ============================================
// Orchestrates between the Database (Prisma) and Object Storage (MinIO).
// Enforces business rules like ownership checking.
// ============================================

import { prisma } from '@file-manager/database';
import { randomUUID } from 'crypto';
import path from 'path';
import { Readable } from 'stream';
import { NotFoundError, ForbiddenError, createLogger, publishEvent, ROUTING_KEYS } from '@file-manager/shared-utils';
import * as minioService from './minio.service';

const logger = createLogger('file-business-service');

/**
 * Uploads a file stream to MinIO and records metadata in the database.
 */
export async function uploadFile(
  userId: string,
  originalName: string,
  mimeType: string,
  stream: Readable
) {
  // 1. Generate a unique storage key (avoids name collisions)
  const ext = path.extname(originalName);
  const storageKey = `${userId}/${randomUUID()}${ext}`;

  // 2. Stream the file directly to MinIO
  // We do this BEFORE the database insert because if the upload fails,
  // we don't want a dangling record in the database.
  await minioService.uploadStream(storageKey, stream, mimeType);

  // Fetch actual file size from MinIO
  const s3Meta = await minioService.getFileMetadata(storageKey);
  const actualSize = s3Meta?.ContentLength || 0;

  // 3. Record metadata in PostgreSQL
  try {
    const fileRecord = await prisma.file.create({
      data: {
        originalName,
        storageKey,
        mimeType,
        size: BigInt(actualSize),
        ownerId: userId,
      },
    });

    // Also update the user's storage usage
    await prisma.user.update({
      where: { id: userId },
      data: {
        storageUsed: {
          increment: BigInt(actualSize),
        },
      },
    });

    logger.info('File uploaded successfully', { fileId: fileRecord.id, userId });
    
    // Publish async event to RabbitMQ
    publishEvent(ROUTING_KEYS.FILE_CREATED, {
      fileId: fileRecord.id,
      originalName: fileRecord.originalName,
      storageKey: fileRecord.storageKey,
      mimeType: fileRecord.mimeType,
      size: Number(fileRecord.size),
      ownerId: userId,
      folderId: fileRecord.folderId,
    }).catch(err => logger.error('Failed to publish FILE_CREATED event', { error: err }));

    return {
      id: fileRecord.id,
      originalName: fileRecord.originalName,
      size: Number(fileRecord.size),
      mimeType: fileRecord.mimeType,
      createdAt: fileRecord.createdAt,
    };
  } catch (error) {
    // If DB insert fails, we should ideally clean up MinIO.
    // For a production system, this could be handled by an async job.
    logger.error('Failed to insert file record to DB, attempting cleanup', { storageKey });
    await minioService.deleteFile(storageKey).catch(e => 
      logger.error('Failed to cleanup orphan file in MinIO', { storageKey, error: e })
    );
    throw error;
  }
}

/**
 * Gets a file's metadata from the database and verifies ownership.
 */
export async function getFileRecord(fileId: string, userId: string) {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new NotFoundError('File not found');
  }

  // Security Check: Only the owner can access this file (for now)
  if (file.ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to access this file');
  }

  return file;
}

/**
 * Downloads a file, returning its stream and metadata.
 */
export async function downloadFile(fileId: string, userId: string) {
  const file = await getFileRecord(fileId, userId);
  const stream = await minioService.downloadStream(file.storageKey);
  
  return {
    stream,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: Number(file.size),
  };
}

/**
 * Deletes a file from both MinIO and the Database.
 */
export async function deleteFile(fileId: string, userId: string) {
  const file = await getFileRecord(fileId, userId);

  // 1. Delete from MinIO first
  await minioService.deleteFile(file.storageKey);

  // 2. Delete from Database
  // Use a transaction to ensure both operations succeed together
  await prisma.$transaction([
    prisma.file.delete({
      where: { id: fileId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        storageUsed: {
          decrement: file.size,
        },
      },
    }),
  ]);

  logger.info('File deleted successfully', { fileId, userId });

  // Publish async event to RabbitMQ
  publishEvent(ROUTING_KEYS.FILE_DELETED, {
    fileId,
    ownerId: userId,
    size: Number(file.size),
  }).catch(err => logger.error('Failed to publish FILE_DELETED event', { error: err }));
}
