// ============================================
// MinIO (S3) Service
// ============================================
// Encapsulates all interactions with the object storage.
// We use the official AWS SDK v3 since MinIO is S3-compatible.
//
// WHY AWS SDK v3?
// - Modular (we only import the clients we need)
// - First-class TypeScript support
// - The industry standard for S3 interactions
// ============================================

import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../config';
import { createLogger, AppError, NotFoundError } from '@file-manager/shared-utils';
import { Readable } from 'stream';

const logger = createLogger('minio-service');

// Initialize the S3 Client pointed at our MinIO container
export const s3Client = new S3Client({
  endpoint: `http://${config.minio.endpoint}:${config.minio.port}`,
  region: 'us-east-1', // Required by SDK, but MinIO ignores it locally
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: true, // Crucial for MinIO (uses /bucket/key instead of bucket.endpoint/key)
});

const BUCKET = config.minio.bucket;

/**
 * Upload a stream to MinIO using @aws-sdk/lib-storage.
 *
 * WHY lib-storage instead of putObject?
 * putObject requires knowing the exact content length in advance.
 * lib-storage automatically handles multipart uploads for streams of unknown size,
 * which is exactly what we need when accepting streams from multer.
 */
export async function uploadStream(
  key: string,
  stream: Readable,
  mimeType: string,
): Promise<void> {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET,
        Key: key,
        Body: stream,
        ContentType: mimeType,
      },
    });

    await upload.done();
    logger.debug('File uploaded to MinIO', { key });
  } catch (error) {
    logger.error('Failed to upload file to MinIO', { key, error });
    throw new AppError('Failed to upload file to storage', 500, 'STORAGE_ERROR');
  }
}

/**
 * Get a readable stream for a file from MinIO.
 */
export async function downloadStream(key: string): Promise<Readable> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('Response body is empty');
    }

    return response.Body as Readable;
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      throw new NotFoundError('File not found in storage');
    }
    logger.error('Failed to download file from MinIO', { key, error });
    throw new AppError('Failed to read file from storage', 500, 'STORAGE_ERROR');
  }
}

/**
 * Delete a file from MinIO.
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    logger.debug('File deleted from MinIO', { key });
  } catch (error) {
    logger.error('Failed to delete file from MinIO', { key, error });
    throw new AppError('Failed to delete file from storage', 500, 'STORAGE_ERROR');
  }
}

/**
 * Get object metadata (to check if it exists or get its real size).
 */
export async function getFileMetadata(key: string) {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    return await s3Client.send(command);
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return null;
    }
    throw error;
  }
}
