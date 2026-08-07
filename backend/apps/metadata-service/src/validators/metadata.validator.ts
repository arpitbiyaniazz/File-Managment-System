// ============================================
// Zod Validators — Metadata Service
// ============================================

import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255, 'Folder name too long'),
  parentId: z.string().uuid().nullable().optional(),
});

export const renameFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(255, 'Folder name too long'),
});

export const moveFolderSchema = z.object({
  parentId: z.string().uuid().nullable(), // null = move to root
});

export const renameFileSchema = z.object({
  originalName: z.string().min(1, 'File name is required').max(255, 'File name too long'),
});

export const moveFileSchema = z.object({
  folderId: z.string().uuid().nullable(), // null = move to root
});

export const createShareSchema = z.object({
  email: z.string().email('Invalid email address'),
  permission: z.enum(['VIEWER', 'EDITOR']).default('VIEWER'),
  fileId: z.string().uuid().optional(),
  folderId: z.string().uuid().optional(),
}).refine(
  (data) => (data.fileId && !data.folderId) || (!data.fileId && data.folderId),
  { message: 'Provide either fileId or folderId, not both' }
);
