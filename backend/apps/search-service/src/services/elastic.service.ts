// ============================================
// Elasticsearch Service
// ============================================
// Low-level wrapper around the official @elastic/elasticsearch Client.
// Handles index creation, document mapping, searching, and auto-suggest.
// ============================================

import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { createLogger, AppError } from '@file-manager/shared-utils';

const logger = createLogger('elastic-service');

export const esClient = new Client({
  node: config.elasticsearch.node,
});

export const INDEX_NAME = config.elasticsearch.index;

export interface SearchItemDocument {
  id: string;
  itemType: 'FILE' | 'FOLDER';
  name: string;
  ownerId: string;
  mimeType?: string | null;
  size?: number | null;
  folderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Initialize Elasticsearch index with proper mappings.
 */
export async function ensureIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      logger.info(`Creating Elasticsearch index: ${INDEX_NAME}`);
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            itemType: { type: 'keyword' },
            name: {
              type: 'text',
              fields: {
                keyword: { type: 'keyword' },
                completion: { type: 'completion' },
              },
            },
            ownerId: { type: 'keyword' },
            mimeType: { type: 'keyword' },
            size: { type: 'long' },
            folderId: { type: 'keyword' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' },
          },
        },
      });
      logger.info(`Index ${INDEX_NAME} created successfully`);
    } else {
      logger.debug(`Index ${INDEX_NAME} already exists`);
    }
  } catch (error) {
    logger.error('Failed to ensure Elasticsearch index', { error });
    throw new AppError('STORAGE_ERROR', 500, 'Failed to connect or create Elasticsearch index');
  }
}

/**
 * Index (upsert) a single file or folder document into Elasticsearch.
 */
export async function indexDocument(doc: SearchItemDocument): Promise<void> {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: doc.id,
      document: {
        id: doc.id,
        itemType: doc.itemType,
        name: doc.name,
        ownerId: doc.ownerId,
        mimeType: doc.mimeType || null,
        size: doc.size || null,
        folderId: doc.folderId || null,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      refresh: 'wait_for',
    });
    logger.debug('Indexed document in Elasticsearch', { id: doc.id, name: doc.name });
  } catch (error) {
    logger.error('Failed to index document in Elasticsearch', { id: doc.id, error });
    throw new AppError('STORAGE_ERROR', 500, 'Failed to index document');
  }
}

/**
 * Delete a document from Elasticsearch.
 */
export async function deleteDocument(id: string): Promise<void> {
  try {
    await esClient.delete({
      index: INDEX_NAME,
      id,
      refresh: 'wait_for',
    });
    logger.debug('Deleted document from Elasticsearch', { id });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      logger.debug('Document not found for deletion in Elasticsearch', { id });
      return;
    }
    logger.error('Failed to delete document from Elasticsearch', { id, error });
  }
}

/**
 * Bulk index multiple documents (used for reindexing).
 */
export async function bulkIndexDocuments(docs: SearchItemDocument[]): Promise<number> {
  if (docs.length === 0) return 0;

  const operations = docs.flatMap((doc) => [
    { index: { _index: INDEX_NAME, _id: doc.id } },
    {
      id: doc.id,
      itemType: doc.itemType,
      name: doc.name,
      ownerId: doc.ownerId,
      mimeType: doc.mimeType || null,
      size: doc.size || null,
      folderId: doc.folderId || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
  ]);

  try {
    const response = await esClient.bulk({ refresh: true, operations });
    if (response.errors) {
      logger.warn('Bulk indexing encountered errors in some documents');
    }
    logger.info('Bulk indexed documents into Elasticsearch', { count: docs.length });
    return docs.length;
  } catch (error) {
    logger.error('Failed to bulk index documents', { error });
    throw new AppError('STORAGE_ERROR', 500, 'Bulk indexing failed');
  }
}

/**
 * Full-Text Search with multi-tenant security isolation (ownerId requirement).
 */
export async function searchDocuments(
  userId: string,
  params: {
    q?: string;
    itemType?: 'FILE' | 'FOLDER';
    mimeType?: string;
    limit?: number;
    offset?: number;
  }
) {
  const { q, itemType, mimeType, limit = 20, offset = 0 } = params;

  // Build Elasticsearch Query
  // Must clause: ownerId === userId (STRICT SECURITY BOUNDARY)
  const mustClause: any[] = [{ term: { ownerId: userId } }];
  const filterClause: any[] = [];

  if (itemType) {
    filterClause.push({ term: { itemType } });
  }

  if (mimeType) {
    filterClause.push({ term: { mimeType } });
  }

  let queryClause: any;

  if (q && q.trim().length > 0) {
    queryClause = {
      bool: {
        must: mustClause,
        filter: filterClause,
        should: [
          // Match query on text field
          {
            match: {
              name: {
                query: q,
                fuzziness: 'AUTO',
                boost: 2,
              },
            },
          },
          // Prefix match on keyword subfield (case-insensitive)
          {
            prefix: {
              'name.keyword': {
                value: q,
                case_insensitive: true,
                boost: 3,
              },
            },
          },
          // Wildcard match for partial string matching (case-insensitive)
          {
            wildcard: {
              'name.keyword': {
                value: `*${q}*`,
                case_insensitive: true,
                boost: 1,
              },
            },
          },
        ],
        minimum_should_match: 1,
      },
    };
  } else {
    // If query string is empty, return latest items for user
    queryClause = {
      bool: {
        must: mustClause,
        filter: filterClause,
      },
    };
  }

  try {
    const result = await esClient.search({
      index: INDEX_NAME,
      query: queryClause,
      from: offset,
      size: limit,
      sort: q ? undefined : [{ updatedAt: { order: 'desc' } }],
    });

    const hits = result.hits.hits.map((hit: any) => ({
      ...hit._source,
      score: hit._score,
    }));

    return {
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0,
      hits,
    };
  } catch (error) {
    logger.error('Elasticsearch query failed', { error });
    throw new AppError('STORAGE_ERROR', 500, 'Search query failed');
  }
}

/**
 * Auto-suggest / completion query.
 * Filtered by ownerId so users only see suggestions for their own files.
 */
export async function suggestDocuments(userId: string, prefix: string) {
  if (!prefix || prefix.trim().length === 0) return [];

  try {
    const result = await esClient.search({
      index: INDEX_NAME,
      size: 5,
      query: {
        bool: {
          must: [
            { term: { ownerId: userId } },
            {
              match_phrase_prefix: {
                name: {
                  query: prefix,
                },
              },
            },
          ],
        },
      },
    });

    const suggestions = result.hits.hits.map((hit: any) => hit._source.name).filter(Boolean);
    return Array.from(new Set(suggestions)); // Deduplicate
  } catch (error) {
    logger.error('Auto-suggest failed', { error });
    return [];
  }
}
