// ============================================
// Search Validators
// ============================================

import { z } from 'zod';

export const indexItemSchema = z.object({
  id: z.string().uuid(),
  itemType: z.enum(['FILE', 'FOLDER']),
  name: z.string().min(1),
  ownerId: z.string().uuid(),
  mimeType: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  folderId: z.string().uuid().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  itemType: z.enum(['FILE', 'FOLDER']).optional(),
  mimeType: z.string().optional(),
  limit: z.string().transform((val) => parseInt(val, 10)).optional(),
  offset: z.string().transform((val) => parseInt(val, 10)).optional(),
});

export const suggestQuerySchema = z.object({
  q: z.string().min(1, 'Query parameter q is required'),
});
