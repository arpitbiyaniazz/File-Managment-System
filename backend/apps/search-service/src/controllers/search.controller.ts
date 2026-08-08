// ============================================
// Search Controller
// ============================================

import { Request, Response, NextFunction } from 'express';
import { successResponse, ValidationError } from '@file-manager/shared-utils';
import * as elasticService from '../services/elastic.service';
import * as searchService from '../services/search.service';
import {
  indexItemSchema,
  searchQuerySchema,
  suggestQuerySchema,
} from '../validators/search.validator';

/**
 * Full-Text Search endpoint.
 */
export const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
    }

    const userId = req.user!.userId as string;
    const { q, itemType, mimeType, limit, offset } = parsed.data;

    const result = await elasticService.searchDocuments(userId, {
      q,
      itemType,
      mimeType,
      limit,
      offset,
    });

    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
};

/**
 * Auto-suggest / completion endpoint.
 */
export const suggest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = suggestQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid query parameters', parsed.error.flatten().fieldErrors);
    }

    const userId = req.user!.userId as string;
    const suggestions = await elasticService.suggestDocuments(userId, parsed.data.q);

    res.json(successResponse(suggestions));
  } catch (error) {
    next(error);
  }
};

/**
 * Index a single item (Internal / Synced endpoint).
 */
export const indexItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = indexItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid index document payload', parsed.error.flatten().fieldErrors);
    }

    const now = new Date().toISOString();
    const doc: elasticService.SearchItemDocument = {
      ...parsed.data,
      createdAt: parsed.data.createdAt || now,
      updatedAt: parsed.data.updatedAt || now,
    };

    await elasticService.indexDocument(doc);
    res.status(200).json(successResponse(null, 'Item indexed successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single item from search index.
 */
export const deleteIndexItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await elasticService.deleteDocument(id);
    res.status(200).json(successResponse(null, 'Item removed from index'));
  } catch (error) {
    next(error);
  }
};

/**
 * Full database re-index into Elasticsearch.
 */
export const reindex = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await searchService.reindexAll();
    res.status(200).json(successResponse(result, 'Reindex completed'));
  } catch (error) {
    next(error);
  }
};
