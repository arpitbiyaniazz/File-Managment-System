// ============================================
// Custom Multer Storage Engine for MinIO
// ============================================
// Streaming is critical for system stability.
// This engine takes the multipart stream from multer 
// and pipes it directly into our business logic (which uploads to MinIO
// and records it in Postgres).
// ============================================

import multer from 'multer';
import { Request } from 'express';
import * as fileService from '../services/file.service';
import { AppError } from '@file-manager/shared-utils';

class MinioStorageEngine implements multer.StorageEngine {
  
  _handleFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void
  ): void {
    const userId = req.user?.userId;
    if (!userId) {
      return cb(new AppError('Unauthorized', 401));
    }

    // `file.stream` is the readable stream for the file part.
    // We pass it to our fileService to upload to MinIO and save to DB.
    // However, multer streams don't know their total size in advance,
    // but the `req.headers['content-length']` gives us a good estimate for the whole request.
    // For exact file size, multer streams emit 'data' events, but we are piping it to AWS SDK
    // which handles the stream. We'll need to figure out the size.
    // Actually, `multer` does not provide size in `file` until it's fully processed.
    // Let's use a passthrough stream to count bytes if needed, but the DB size can be estimated or updated later.
    // For this learning project, we will use an estimated size or update it after upload.
    
    // To get the exact size, we can let AWS SDK upload the stream, and then fetch the size from MinIO!
    const folderId = req.body?.folderId || (req.query?.folderId as string) || null;
    fileService.uploadFile(
      userId,
      file.originalname,
      file.mimetype,
      file.stream,
      folderId
    )
    .then((metadata) => {
      cb(null, {
        ...file,
        size: metadata.size,
        metadata, // custom field
      } as any);
    })
    .catch((err) => {
      cb(err);
    });
  }

  _removeFile(
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null) => void
  ): void {
    // This is called if multer encounters an error and needs to rollback.
    // Since our uploadFile function already tries to clean up MinIO on DB failure,
    // we just need to maybe delete the DB record if it got created.
    // For now, it's a no-op as `uploadFile` handles its own cleanup on failure.
    cb(null);
  }
}

export const upload = multer({
  storage: new MinioStorageEngine(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB max limit
  },
});
