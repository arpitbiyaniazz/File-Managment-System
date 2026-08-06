// ============================================
// File Controller
// ============================================
// Handles HTTP request/response for files.
// ============================================

import { Request, Response, NextFunction } from 'express';
import { successResponse } from '@file-manager/shared-utils';
import * as fileService from '../services/file.service';

/**
 * Handle file upload.
 * Note: The actual streaming to MinIO is handled by our custom multer storage engine.
 * By the time this controller is called, the file is already in MinIO and DB.
 */
export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // If our custom multer storage succeeded, it attached the DB record to req.file
    if (!req.file || !(req.file as any).metadata) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const fileMetadata = (req.file as any).metadata;
    
    res.status(201).json(successResponse(fileMetadata, 'File uploaded successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Handle file download.
 * Pipes the MinIO stream directly to the Express response.
 */
export const downloadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = req.params.id as string;
    const userId = req.user!.userId as string; // from auth middleware

    const { stream, originalName, mimeType, size } = await fileService.downloadFile(fileId, userId);

    // Set headers for download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Length', size.toString());

    // Pipe the S3 stream directly to the client
    stream.pipe(res);
    
    // Handle stream errors
    stream.on('error', (err) => {
      console.error('Error streaming file to client:', err);
      if (!res.headersSent) {
        next(err);
      } else {
        res.end();
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle file deletion.
 */
export const deleteFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = req.params.id as string;
    const userId = req.user!.userId as string;

    await fileService.deleteFile(fileId, userId);

    res.status(200).json(successResponse(null, 'File deleted successfully'));
  } catch (error) {
    next(error);
  }
};
