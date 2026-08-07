// ============================================
// Metadata Controller
// ============================================
// HTTP handlers for folders, file metadata, and sharing.
// ============================================

import { Request, Response, NextFunction } from 'express';
import { successResponse, ValidationError } from '@file-manager/shared-utils';
import * as folderService from '../services/folder.service';
import * as fileMetaService from '../services/file-metadata.service';
import * as shareService from '../services/share.service';
import {
  createFolderSchema,
  renameFolderSchema,
  moveFolderSchema,
  renameFileSchema,
  moveFileSchema,
  createShareSchema,
} from '../validators/metadata.validator';

// ---- FOLDER ENDPOINTS ----

export const createFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createFolderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors);
    }
    const { name, parentId } = parsed.data;
    const userId = req.user!.userId as string;

    const folder = await folderService.createFolder(userId, name, parentId);
    res.status(201).json(successResponse(folder, 'Folder created'));
  } catch (error) {
    next(error);
  }
};

export const getFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId as string;
    const folder = await folderService.getFolder(req.params.id as string, userId);
    res.json(successResponse(folder));
  } catch (error) {
    next(error);
  }
};

export const getFolderContents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId as string;
    const folderId = req.params.id as string === 'root' ? null : req.params.id as string;
    const contents = await folderService.getFolderContents(userId, folderId);
    res.json(successResponse(contents));
  } catch (error) {
    next(error);
  }
};

export const renameFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = renameFolderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors);
    }
    const userId = req.user!.userId as string;
    const folder = await folderService.renameFolder(req.params.id as string, userId, parsed.data.name);
    res.json(successResponse(folder, 'Folder renamed'));
  } catch (error) {
    next(error);
  }
};

export const moveFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = moveFolderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors);
    }
    const userId = req.user!.userId as string;
    const folder = await folderService.moveFolder(req.params.id as string, userId, parsed.data.parentId);
    res.json(successResponse(folder, 'Folder moved'));
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId as string;
    await folderService.deleteFolder(req.params.id as string, userId);
    res.json(successResponse(null, 'Folder deleted'));
  } catch (error) {
    next(error);
  }
};

// ---- FILE METADATA ENDPOINTS ----

export const listFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId as string;
    const folderId = req.query.folderId as string | undefined;
    const files = await fileMetaService.listFiles(userId, folderId || null);
    res.json(successResponse(files));
  } catch (error) {
    next(error);
  }
};

export const getFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId as string;
    const file = await fileMetaService.getFile(req.params.id as string, userId);
    res.json(successResponse(file));
  } catch (error) {
    next(error);
  }
};

export const renameFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = renameFileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors);
    }
    const userId = req.user!.userId as string;
    const file = await fileMetaService.renameFile(req.params.id as string, userId, parsed.data.originalName);
    res.json(successResponse(file, 'File renamed'));
  } catch (error) {
    next(error);
  }
};

export const moveFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = moveFileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors);
    }
    const userId = req.user!.userId as string;
    const file = await fileMetaService.moveFile(req.params.id as string, userId, parsed.data.folderId);
    res.json(successResponse(file, 'File moved'));
  } catch (error) {
    next(error);
  }
};

// ---- SHARE ENDPOINTS ----

export const createShareEndpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createShareSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors);
    }
    const userId = req.user!.userId as string;
    const { email, permission, fileId, folderId } = parsed.data;
    const share = await shareService.createShare(userId, email, permission, fileId, folderId);
    res.status(201).json(successResponse(share, 'Shared successfully'));
  } catch (error) {
    next(error);
  }
};

export const getSharedWithMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId as string;
    const shares = await shareService.getSharedWithMe(userId);
    res.json(successResponse(shares));
  } catch (error) {
    next(error);
  }
};

export const revokeShare = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId as string;
    await shareService.revokeShare(req.params.id as string, userId);
    res.json(successResponse(null, 'Share revoked'));
  } catch (error) {
    next(error);
  }
};
